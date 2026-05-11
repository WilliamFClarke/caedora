'use client'

import { useMemo } from 'react'
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ThreadHistoryAdapter,
} from '@assistant-ui/react'
import { toToolsJSONSchema } from 'assistant-stream'
import type { Tool } from 'assistant-stream'
import type { ReactNode } from 'react'
import {
  cancelAiChat,
  appendAiThread,
  loadAiThread,
  onAiChatEvent,
  startAiChat,
} from '@/lib/desktop-ai'
import type {
  AiChatEvent,
  AiChatMessage,
  AiChatToolDefinition,
} from '@/lib/ai/types'

export function DesktopAssistantRuntimeProvider({
  rootPath,
  currentFilePath,
  children,
}: {
  rootPath: string | null
  currentFilePath: string | null
  children: ReactNode
}) {
  const adapter = useMemo<ChatModelAdapter>(
    () => createIpcChatAdapter(rootPath, currentFilePath),
    [currentFilePath, rootPath]
  )
  const history = useMemo<ThreadHistoryAdapter | undefined>(
    () => createThreadHistoryAdapter(rootPath),
    [rootPath]
  )
  const runtime = useLocalRuntime(adapter, {
    maxSteps: 4,
    adapters: history ? { history } : undefined,
  })

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
}

function createThreadHistoryAdapter(rootPath: string | null): ThreadHistoryAdapter | undefined {
  if (!rootPath) return undefined
  return {
    async load() {
      return sanitizeThreadRepository(await loadAiThread(rootPath)) as never
    },
    async append(item) {
      await appendAiThread({
        rootPath,
        item: item as never,
      })
    },
  }
}

function sanitizeThreadRepository(repository: {
  headId?: string | null
  messages: Array<{
    message: unknown
    parentId: string | null
    runConfig?: unknown
  }>
}) {
  const byId = new Map<string, (typeof repository.messages)[number]>()
  for (const item of repository.messages) {
    const id = readMessageId(item.message)
    if (id) byId.set(id, item)
  }

  if (repository.headId && byId.has(repository.headId)) {
    const chain: typeof repository.messages = []
    const seen = new Set<string>()
    let currentId: string | null | undefined = repository.headId

    while (currentId) {
      if (seen.has(currentId)) return { headId: null, messages: [] }
      seen.add(currentId)
      const item = byId.get(currentId)
      if (!item) return { headId: null, messages: [] }
      chain.push(item)
      currentId = item.parentId
    }

    return { headId: repository.headId, messages: chain.reverse() }
  }

  const messages: typeof repository.messages = []
  const validIds = new Set<string>()
  for (const item of repository.messages) {
    const id = readMessageId(item.message)
    if (!id) continue
    if (item.parentId && !validIds.has(item.parentId)) continue
    validIds.add(id)
    messages.push(item)
  }

  const head = messages[messages.length - 1]
  return {
    headId: head ? readMessageId(head.message) : null,
    messages,
  }
}

function readMessageId(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null
  const id = (message as { id?: unknown }).id
  return typeof id === 'string' ? id : null
}

function createIpcChatAdapter(
  rootPath: string | null,
  currentFilePath: string | null
): ChatModelAdapter {
  return {
    async *run(options) {
      const requestId = crypto.randomUUID()
      const events = createChatEventQueue(requestId, options.abortSignal)
      let text = ''
      const toolCalls = new Map<string, ToolCallRecord>()
      const messages = runMessages(options)
      const completedToolCalls = completedToolCallSignatures(messages)
      const activeToolCalls = new Map<string, string>()

      try {
        await startAiChat({
          requestId,
          rootPath,
          currentFilePath,
          messages: toAiChatMessages(messages),
          tools: toAiToolDefinitions(options.context.tools),
        })

        for await (const event of events) {
          if (event.type === 'text') {
            text += event.text
            yield { content: buildAssistantContent(text, toolCalls) }
          } else if (event.type === 'tool-call') {
            const signature = toolCallSignature(event.toolName, event.argsText)
            const previous = signature ? completedToolCalls.get(signature) : undefined
            const duplicateInCurrentResponse = signature
              ? activeToolCalls.get(signature)
              : undefined
            if (signature && !previous && !duplicateInCurrentResponse) {
              activeToolCalls.set(signature, event.toolCallId)
            }
            toolCalls.set(event.toolCallId, {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              argsText: event.argsText,
              result: previous
                ? duplicateToolCallResult(previous.toolCallId)
                : duplicateInCurrentResponse &&
                    duplicateInCurrentResponse !== event.toolCallId
                  ? duplicateToolCallResult(duplicateInCurrentResponse)
                  : undefined,
            })
            yield {
              content: buildAssistantContent(text, toolCalls),
              status: { type: 'requires-action', reason: 'tool-calls' },
            }
          } else if (event.type === 'error') {
            throw new Error(event.message)
          } else if (event.type === 'done') {
            if (event.finishReason === 'cancelled') {
              yield {
                content: buildAssistantContent(text, toolCalls),
                status: { type: 'incomplete', reason: 'cancelled' },
                metadata: stepMetadata(),
              }
              return
            }
            if (event.finishReason === 'tool-calls') {
              yield {
                content: buildAssistantContent(text, toolCalls),
                status: { type: 'requires-action', reason: 'tool-calls' },
                metadata: stepMetadata(),
              }
              return
            }
            if (event.finishReason === 'error') {
              yield {
                content: buildAssistantContent(text, toolCalls),
                status: { type: 'incomplete', reason: 'error' },
                metadata: stepMetadata(),
              }
              return
            }
            yield {
              content: buildAssistantContent(text, toolCalls),
              status: { type: 'complete', reason: 'stop' },
              metadata: stepMetadata(),
            }
            return
          }
        }
      } finally {
        events.close()
      }
    },
  }
}

function createChatEventQueue(requestId: string, abortSignal: AbortSignal) {
  const queue: AiChatEvent[] = []
  const waiters: Array<(value: IteratorResult<AiChatEvent>) => void> = []
  let closed = false

  const push = (event: AiChatEvent) => {
    if (closed || event.requestId !== requestId) return
    const waiter = waiters.shift()
    if (waiter) waiter({ value: event, done: false })
    else queue.push(event)
  }

  const unsubscribe = onAiChatEvent(push)

  const abort = () => {
    void cancelAiChat(requestId)
    push({ type: 'done', requestId, finishReason: 'cancelled' })
  }

  abortSignal.addEventListener('abort', abort, { once: true })

  return {
    close() {
      closed = true
      unsubscribe()
      abortSignal.removeEventListener('abort', abort)
      while (waiters.length) {
        waiters.shift()?.({ value: undefined, done: true })
      }
    },
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<AiChatEvent>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false })
          }
          if (closed) {
            return Promise.resolve({ value: undefined, done: true })
          }
          return new Promise((resolve) => waiters.push(resolve))
        },
      }
    },
  }
}

function buildAssistantContent(
  text: string,
  toolCalls: Map<string, ToolCallRecord>
) {
  const content: Array<Record<string, unknown>> = []
  if (text) content.push({ type: 'text', text })
  for (const call of toolCalls.values()) {
    content.push({
      type: 'tool-call',
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      argsText: call.argsText,
      args: parseJson(call.argsText) ?? {},
      ...(call.result !== undefined ? { result: call.result } : {}),
    })
  }
  return content as never
}

type ToolCallRecord = {
  toolCallId: string
  toolName: string
  argsText: string
  result?: unknown
}

type CompletedToolCallRecord = {
  toolCallId: string
  result: unknown
}

type RunMessage = ChatModelRunOptions['messages'][number]

function runMessages(options: ChatModelRunOptions): RunMessage[] {
  const messages = [...options.messages]
  const current = options.unstable_getMessage()
  const currentId = readMessageId(current)
  const hasCurrent = currentId
    ? messages.some((message) => readMessageId(message) === currentId)
    : false

  if (
    current.role === 'assistant' &&
    current.content.length > 0 &&
    !hasCurrent
  ) {
    // LocalRuntime keeps tool results on the in-progress assistant message.
    // Continuation requests must pass that message back to the model.
    messages.push(current)
  }

  return messages
}

function stepMetadata() {
  return {
    steps: [{}],
  }
}

function completedToolCallSignatures(
  messages: readonly RunMessage[]
): Map<string, CompletedToolCallRecord> {
  const completed = new Map<string, CompletedToolCallRecord>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.content) {
      if (part.type !== 'tool-call') continue
      if (!('result' in part) || part.result === undefined) continue
      const argsText =
        typeof part.argsText === 'string'
          ? part.argsText
          : JSON.stringify('args' in part ? part.args : {})
      const signature = toolCallSignature(part.toolName, argsText)
      if (!signature) continue
      completed.set(signature, {
        toolCallId: part.toolCallId,
        result: part.result,
      })
    }
  }

  return completed
}

function duplicateToolCallResult(previousToolCallId: string) {
  return {
    ok: true,
    duplicate: true,
    duplicateOf: previousToolCallId,
    message:
      'Skipped duplicate tool call. This exact tool call already has a result in the conversation; use that result and answer the user instead of repeating it.',
  }
}

function toolCallSignature(toolName: string, argsText: string): string | null {
  const args = parseJson(argsText)
  if (args === null) return null
  return `${toolName}:${stableStringify(normalizeToolSignatureArgs(toolName, args))}`
}

function normalizeToolSignatureArgs(toolName: string, args: unknown): unknown {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return args
  const normalized = { ...(args as Record<string, unknown>) }
  if ('path' in normalized) {
    normalized.path = normalizeToolSignaturePath(normalized.path)
  } else if (toolName === 'list_files' || toolName === 'search_files') {
    normalized.path = ''
  }
  return normalized
}

function normalizeToolSignaturePath(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const normalized = value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
  return normalized === '.' ? '' : normalized
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

function toAiToolDefinitions(
  tools: Record<string, Tool> | undefined
): AiChatToolDefinition[] {
  const schemas = toToolsJSONSchema(tools)
  return Object.entries(schemas).map(([name, schema]) => ({
    type: 'function',
    function: {
      name,
      description: schema.description,
      parameters: schema.parameters,
    },
  }))
}

function toAiChatMessages(runMessages: readonly RunMessage[]): AiChatMessage[] {
  const messages: AiChatMessage[] = []

  for (const message of runMessages) {
    const text = message.content
      .filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join('\n')

    if (message.role === 'user') {
      messages.push({ role: 'user', content: text })
      continue
    }

    if (message.role !== 'assistant') continue

    const toolCalls = message.content.filter((part) => part.type === 'tool-call')
    if (text || toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: text,
        tool_calls: toolCalls.map((part) => ({
          id: part.toolCallId,
          type: 'function',
          function: {
            name: part.toolName,
            arguments: part.argsText,
          },
        })),
      })
    }

    for (const part of toolCalls) {
      if (!('result' in part) || part.result === undefined) continue
      messages.push({
        role: 'tool',
        tool_call_id: part.toolCallId,
        name: part.toolName,
        content: formatToolResultForModel(part),
      })
    }
  }

  return messages
}

function formatToolResultForModel(part: {
  toolName: string
  argsText: string
  result?: unknown
}): string {
  const result = part.result
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return JSON.stringify(result)

  const payload = result as {
    ok?: unknown
    duplicate?: unknown
    message?: unknown
    preview?: { path?: unknown; operation?: unknown; summary?: unknown }
    data?: unknown
  }
  const args = parseJson(part.argsText) as { path?: unknown } | null
  const path =
    typeof payload.preview?.path === 'string'
      ? payload.preview.path
      : typeof args?.path === 'string'
        ? args.path
        : undefined
  const ok = payload.ok === true
  const message = typeof payload.message === 'string' ? payload.message : undefined

  return JSON.stringify({
    ok,
    tool: part.toolName,
    path,
    operation:
      typeof payload.preview?.operation === 'string'
        ? payload.preview.operation
        : part.toolName,
    message,
    instruction: payload.duplicate
      ? 'This exact tool call was already completed earlier in the conversation. Do not call it again. Use the earlier result and answer the user now.'
      : ok
        ? 'This tool call completed successfully. Do not repeat the same tool call. Continue by telling the user what was done or use the returned data to answer.'
        : 'This tool call failed or was rejected. Do not retry the same call with the same path unless the user explicitly asks. Explain the failure or choose a different appropriate next step.',
    data: summarizeToolData(payload.data),
  })
}

function summarizeToolData(data: unknown): unknown {
  if (typeof data === 'string') {
    return data.length > 2000 ? `${data.slice(0, 2000)}\n...[truncated]` : data
  }
  if (Array.isArray(data)) {
    return {
      count: data.length,
      items: data.slice(0, 20),
      truncated: data.length > 20,
    }
  }
  return data
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

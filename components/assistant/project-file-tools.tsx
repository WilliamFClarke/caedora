'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Check, FileCode, Loader2, Search, ShieldAlert, X } from 'lucide-react'
import { useAssistantTool, type ToolCallMessagePartComponent } from '@assistant-ui/react'
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema'
import { Button } from '@/components/ui/button'
import {
  executeAiFileTool,
  previewAiFileMutation,
} from '@/lib/desktop-ai'
import type {
  AiFileMutationPreview,
  AiFileToolName,
  AiFileToolRequest,
  AiSettings,
} from '@/lib/ai/types'
import { cn } from '@/lib/utils'

const fileToolSchemas = {
  list_files: objectSchema({
    path: { type: 'string', description: 'Project-relative directory path. Use empty string for the root.' },
  }),
  read_file: objectSchema({
    path: { type: 'string', description: 'Project-relative file path to read.' },
  }, ['path']),
  write_file: objectSchema({
    path: { type: 'string', description: 'Project-relative markdown file path to overwrite. Must end in .md.' },
    content: { type: 'string', description: 'Full replacement file content.' },
  }, ['path', 'content']),
  edit_file: objectSchema({
    path: { type: 'string', description: 'Project-relative markdown file path to edit. Must end in .md.' },
    old_string: { type: 'string', description: 'Exact string to replace. Must appear exactly once.' },
    new_string: { type: 'string', description: 'Replacement string.' },
  }, ['path', 'old_string', 'new_string']),
  create_file: objectSchema({
    path: { type: 'string', description: 'Project-relative markdown file path to create. Must end in .md.' },
    content: { type: 'string', description: 'Initial file content.' },
  }, ['path', 'content']),
  create_folder: objectSchema({
    path: { type: 'string', description: 'Project-relative folder path to create.' },
  }, ['path']),
  delete_file: objectSchema({
    path: { type: 'string', description: 'Project-relative markdown file path to delete. Must end in .md.' },
  }, ['path']),
  search_files: objectSchema({
    pattern: { type: 'string', description: 'Regex or literal text pattern to search for.' },
    path: { type: 'string', description: 'Project-relative directory path. Use empty string for the root.' },
  }, ['pattern']),
} satisfies Record<AiFileToolName, JSONSchema7>

const toolDescriptions: Record<AiFileToolName, string> = {
  list_files: 'List project files under a path, respecting ignored files.',
  read_file: 'Read a text file from the current project.',
  write_file: 'Overwrite a markdown file in the current project. Paths must end in .md.',
  edit_file: 'Replace an exact string in a markdown file. Paths must end in .md.',
  create_file: 'Create a markdown file in the current project. Paths must end in .md.',
  create_folder: 'Create a folder in the current project.',
  delete_file: 'Delete a markdown file from the current project. Paths must end in .md.',
  search_files: 'Search project file contents with a ripgrep-style pattern.',
}

const mutatingTools = new Set<AiFileToolName>([
  'write_file',
  'edit_file',
  'create_file',
  'create_folder',
  'delete_file',
])

const autoExecutedToolRequests = new Set<string>()
const inFlightToolExecutions = new Map<string, Promise<unknown>>()
const completedToolExecutions = new Map<string, unknown>()

const ToolPermissionContext = createContext<{
  rootPath: string | null
  toolPermissionLevel: AiSettings['toolPermissionLevel']
}>({
  rootPath: null,
  toolPermissionLevel: 'require-approval',
})

export function ProjectFileTools({
  rootPath,
  toolPermissionLevel,
  children,
}: {
  rootPath: string | null
  toolPermissionLevel: AiSettings['toolPermissionLevel']
  children: ReactNode
}) {
  const disabled = !rootPath

  useProjectFileTool('list_files', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('read_file', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('write_file', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('edit_file', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('create_file', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('create_folder', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('delete_file', rootPath, toolPermissionLevel, disabled)
  useProjectFileTool('search_files', rootPath, toolPermissionLevel, disabled)

  return (
    <ToolPermissionContext.Provider value={{ rootPath, toolPermissionLevel }}>
      {children}
    </ToolPermissionContext.Provider>
  )
}

function useProjectFileTool(
  toolName: AiFileToolName,
  rootPath: string | null,
  toolPermissionLevel: AiSettings['toolPermissionLevel'],
  disabled: boolean
) {
  const tool = useMemo(
    () => {
      const requiresApproval =
        mutatingTools.has(toolName) &&
        !shouldAutoApproveTool(toolName, toolPermissionLevel)
      const baseTool = {
        toolName,
        description: toolDescriptions[toolName],
        parameters: fileToolSchemas[toolName],
        disabled,
        render: FileToolCall as ToolCallMessagePartComponent,
      }

      if (requiresApproval) return baseTool

      return {
        ...baseTool,
        async execute(
          args: Record<string, unknown>,
          context?: { toolCallId?: string }
        ) {
          if (!rootPath) {
            throw new Error('Open a desktop vault before using file tools.')
          }
          const request: AiFileToolRequest = { rootPath, toolName, args }
          return executeToolRequestOnce(executionKey(request, context?.toolCallId), request)
        },
      }
    },
    [disabled, rootPath, toolName, toolPermissionLevel]
  )

  useAssistantTool(tool)
}

function FileToolCall({
  toolCallId,
  toolName,
  argsText,
  result,
  status,
  interrupt,
  addResult,
}: ComponentProps<ToolCallMessagePartComponent>) {
  const { rootPath, toolPermissionLevel } = useContext(ToolPermissionContext)
  const preview = readPreview(interrupt?.payload)
  const resultPreview = readPreview(result)
  const approval = readApproval(result)
  const running = status.type === 'running'
  const toolResult = readToolResult(result)
  const parsedArgs = useMemo(() => parseJsonRecord(argsText), [argsText])
  const typedToolName = isAiFileToolName(toolName) ? toolName : null
  const directRequest = useMemo<AiFileToolRequest | null>(() => {
    if (!rootPath || !typedToolName || !parsedArgs) {
      return null
    }
    return { rootPath, toolName: typedToolName, args: parsedArgs }
  }, [parsedArgs, rootPath, typedToolName])
  const directPending = Boolean(
    directRequest && !approval && !toolResult && !running && status.type !== 'incomplete'
  )
  const directMutating = Boolean(typedToolName && mutatingTools.has(typedToolName))
  const directApprovalPending = Boolean(
    directPending &&
      directMutating &&
      typedToolName &&
      !shouldAutoApproveTool(typedToolName, toolPermissionLevel)
  )
  const canRunWithoutApproval = Boolean(
    directPending &&
      (!directMutating ||
        (typedToolName && shouldAutoApproveTool(typedToolName, toolPermissionLevel)))
  )
  const autoExecuteKey = directRequest
    ? executionKey(directRequest, toolCallId)
    : null
  const waiting = Boolean(approval) || directApprovalPending
  const [localPreview, setLocalPreview] = useState<AiFileMutationPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const shownPreview = preview ?? resultPreview ?? approval?.preview ?? localPreview ?? null
  const failed = status.type === 'incomplete' || toolResult?.ok === false
  const complete = toolResult?.ok === true
  const Icon = toolName === 'search_files' ? Search : waiting ? ShieldAlert : FileCode
  const [approving, setApproving] = useState(false)
  const isMutatingTool = Boolean(typedToolName && mutatingTools.has(typedToolName))
  const showRawResult = result !== undefined && !approval && !isMutatingTool
  const showArgs = Boolean(!shownPreview && argsText && !directMutating)
  const statusKind = waiting
    ? 'approval'
    : failed
      ? 'failed'
      : running || approving
        ? 'running'
        : complete
          ? 'complete'
          : canRunWithoutApproval
            ? 'ready'
            : 'requested'
  const statusLabel = waiting
    ? 'Approval required'
    : failed
      ? 'Tool failed'
      : running || approving
        ? 'Running'
        : canRunWithoutApproval
          ? 'Ready to run'
        : complete
          ? 'Complete'
          : 'Requested'

  useEffect(() => {
    setLocalPreview(null)
    setPreviewError(null)
    if (!directRequest || !directApprovalPending) return

    let alive = true
    void previewAiFileMutation(directRequest)
      .then((nextPreview) => {
        if (alive) setLocalPreview(nextPreview)
      })
      .catch((error) => {
        if (!alive) return
        setPreviewError(
          error instanceof Error ? error.message : 'Could not preview file operation.'
        )
      })
    return () => {
      alive = false
    }
  }, [directApprovalPending, directRequest])

  useEffect(() => {
    if (!canRunWithoutApproval || !directRequest || !autoExecuteKey) return
    if (autoExecutedToolRequests.has(autoExecuteKey)) return

    autoExecutedToolRequests.add(autoExecuteKey)
    setApproving(true)
    void executeToolRequestOnce(autoExecuteKey, directRequest)
      .then((nextResult) => addResult(nextResult))
      .catch((error) => {
        addResult({
          ok: false,
          message: error instanceof Error ? error.message : 'File operation failed.',
        })
      })
      .finally(() => setApproving(false))
  }, [addResult, autoExecuteKey, canRunWithoutApproval, directRequest])

  async function accept() {
    const request = approval?.request ?? directRequest
    if (!request) return

    setApproving(true)
    try {
      addResult(await executeToolRequestOnce(executionKey(request, toolCallId), request))
    } catch (error) {
      addResult({
        ok: false,
        message: error instanceof Error ? error.message : 'File operation failed.',
        preview: approval?.preview ?? localPreview ?? undefined,
      })
    } finally {
      setApproving(false)
    }
  }

  function reject() {
    if (!approval && !directRequest) return
    addResult({
      ok: false,
      message: 'User rejected the file change.',
      preview: approval?.preview ?? localPreview ?? undefined,
    })
  }

  return (
    <div
      data-status={statusKind}
      className="overflow-hidden rounded-md border bg-background text-sm transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-1"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon
          className={cn(
            'size-4 transition-colors duration-300',
            (running || approving) && 'animate-pulse',
            waiting && 'text-amber-500',
            failed && 'text-destructive',
            complete && 'text-good'
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{formatToolName(toolName)}</p>
          <p className="text-muted-foreground truncate text-xs transition-colors duration-300">
            {statusLabel}
          </p>
        </div>
        {(running || approving) && (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        )}
      </div>

      {toolResult?.message && (
        <div
          className={cn(
            'border-t px-3 py-2 text-xs',
            toolResult.ok ? 'text-muted-foreground' : 'text-destructive'
          )}
        >
          {toolResult.message}
        </div>
      )}

      {previewError && (
        <div className="border-t px-3 py-2 text-destructive text-xs">
          {previewError}
        </div>
      )}

      {shownPreview && (
        <div className="border-t px-3 py-2 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-top-1">
          <p className="mb-2 text-xs font-medium">{shownPreview.summary}</p>
          <pre className="max-h-52 overflow-auto rounded-sm bg-muted p-2 font-mono text-[11px] leading-relaxed">
            {shownPreview.diff || '(no textual diff)'}
          </pre>
        </div>
      )}

      {!shownPreview && directMutating && (
        <div className="flex items-center gap-2 border-t px-3 py-2 text-muted-foreground text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          Preparing file change preview...
        </div>
      )}

      {showArgs && (
        <pre className="max-h-36 overflow-auto border-t px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {argsText}
        </pre>
      )}

      {waiting && (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-1">
          <p className="text-muted-foreground text-xs">
            Review this file operation before it runs.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={reject}
              disabled={approving}
            >
              <X className="size-3.5" />
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void accept()}
              disabled={approving || Boolean(previewError)}
            >
              {approving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Accept
            </Button>
          </div>
        </div>
      )}

      {canRunWithoutApproval && !approving && (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-1">
          <p className="text-muted-foreground text-xs">
            This tool is allowed by your current permission setting and should run automatically.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void accept()}
            disabled={approving || Boolean(previewError)}
          >
            {approving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Run now
          </Button>
        </div>
      )}

      {showRawResult && (
        <pre className="max-h-44 overflow-auto border-t px-3 py-2 font-mono text-[11px]">
          {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

async function executeToolRequestOnce(
  key: string,
  request: AiFileToolRequest
): Promise<unknown> {
  if (completedToolExecutions.has(key)) return completedToolExecutions.get(key)
  const existing = inFlightToolExecutions.get(key)
  if (existing) return existing

  const execution = executeAiFileTool(request)
    .then((result) => {
      completedToolExecutions.set(key, result)
      return result
    })
    .finally(() => {
      inFlightToolExecutions.delete(key)
    })
  inFlightToolExecutions.set(key, execution)
  return execution
}

function executionKey(request: AiFileToolRequest, toolCallId?: string): string {
  return [
    request.rootPath,
    toolCallId || request.toolName,
    request.toolName,
    stableStringify(request.args),
  ].join(':')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function shouldAutoApproveTool(
  toolName: AiFileToolName,
  permissionLevel: AiSettings['toolPermissionLevel']
): boolean {
  if (permissionLevel === 'allow-all') return true
  if (permissionLevel === 'allow-all-except-delete') return toolName !== 'delete_file'
  return false
}

function isAiFileToolName(name: string): name is AiFileToolName {
  return name in fileToolSchemas
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function readToolResult(payload: unknown): { ok: boolean; message?: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const maybe = payload as { approvalRequired?: unknown; ok?: unknown; message?: unknown }
  if (maybe.approvalRequired) return null
  if (typeof maybe.ok !== 'boolean') return null
  return {
    ok: maybe.ok,
    message: typeof maybe.message === 'string' ? maybe.message : undefined,
  }
}

function readPreview(payload: unknown): AiFileMutationPreview | null {
  if (!payload || typeof payload !== 'object') return null
  const maybe = payload as { preview?: AiFileMutationPreview; artifact?: { preview?: AiFileMutationPreview } }
  if (maybe.artifact?.preview) return maybe.artifact.preview
  return maybe.preview ?? null
}

function readApproval(payload: unknown): {
  preview: AiFileMutationPreview
  request?: AiFileToolRequest
} | null {
  if (!payload || typeof payload !== 'object') return null
  const maybe = payload as {
    approvalRequired?: boolean
    preview?: AiFileMutationPreview
    request?: AiFileToolRequest
  }
  if (!maybe.approvalRequired || !maybe.preview) return null
  return {
    preview: maybe.preview,
    request: maybe.request,
  }
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ')
}

function objectSchema(
  properties: Record<string, JSONSchema7Definition>,
  required: string[] = []
): JSONSchema7 {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  }
}

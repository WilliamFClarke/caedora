'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageSquarePlus, Settings, Sparkles } from 'lucide-react'
import { Thread } from '@/components/assistant-ui/thread'
import { Button } from '@/components/ui/button'
import { DesktopAssistantRuntimeProvider } from './desktop-assistant-runtime'
import { ProjectFileTools } from './project-file-tools'
import {
  cancelModelDownload,
  clearAiThread,
  getAiState,
  isDesktopAiAvailable,
  onModelDownloadEvent,
} from '@/lib/desktop-ai'
import { useSettings } from '@/lib/settings-context'
import type { AiProviderState } from '@/lib/ai/types'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

const MIN_WIDTH = 320
const MAX_WIDTH = 680

export function AssistantSidebar({
  provider,
  currentFilePath,
  onOpenSettings,
}: {
  provider: VaultProvider
  currentFilePath: string | null
  onOpenSettings: () => void
}) {
  const { settings, updateSettings } = useSettings()
  const [providerState, setProviderState] = useState<AiProviderState | null>(null)
  const [desktopReady, setDesktopReady] = useState(false)
  const [threadNonce, setThreadNonce] = useState(0)
  const open = settings.ai.sidebar.open
  const width = clampWidth(settings.ai.sidebar.width)
  const rootPath = useMemo(() => desktopRootPath(provider), [provider])

  useEffect(() => {
    setDesktopReady(isDesktopAiAvailable())
  }, [])

  useEffect(() => {
    if (!desktopReady) return
    let alive = true
    const load = async () => {
      try {
        const next = await getAiState()
        if (alive) setProviderState(next)
      } catch {
        if (alive) setProviderState(null)
      }
    }
    const unsubscribe = onModelDownloadEvent((event) => {
      if (!alive) return
      setProviderState((current) =>
        current
          ? {
              ...current,
              download: event.progress,
              state: event.type === 'progress' ? 'downloading' : current.state,
              message: event.progress.message ?? current.message,
            }
          : current
      )
      if (event.type !== 'progress') void load()
    })
    void load()
    const timer = window.setInterval(load, 10_000)
    return () => {
      alive = false
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [desktopReady])

  if (!desktopReady) return null

  const updateSidebar = (updates: Partial<typeof settings.ai.sidebar>) => {
    void updateSettings({
      ai: {
        ...settings.ai,
        sidebar: {
          ...settings.ai.sidebar,
          ...updates,
        },
      },
    })
  }

  return (
    <aside
      className={cn(
        'caedora-ai-sidebar relative h-full shrink-0 overflow-hidden border-l bg-background text-foreground transition-[width,opacity] duration-200 ease-out',
        open ? 'opacity-100' : 'w-0! opacity-0'
      )}
      style={{ width: open ? width : 0 }}
      aria-hidden={!open}
    >
      <ResizeHandle
        onResize={(nextWidth) => updateSidebar({ width: nextWidth })}
        width={width}
      />
      <div className="flex h-full min-w-0 flex-col bg-background pb-3">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/caedora-logo.png"
            alt="Argus"
            width={28}
            height={28}
            className="size-7 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Argus (AI Assistant)</p>
            <p className="text-muted-foreground truncate text-[11px]">
              {providerState?.state === 'ready'
                ? `${providerState.providerLabel}${providerState.modelLabel ? ` - ${providerState.modelLabel}` : ''}`
                : providerState?.message ?? 'Checking providers...'}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={async () => {
              if (!rootPath) return
              await clearAiThread(rootPath)
              setThreadNonce((value) => value + 1)
            }}
            disabled={!rootPath}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={onOpenSettings}
            aria-label="Argus (AI Assistant) settings"
            title="Argus (AI Assistant) settings"
          >
            <Settings className="size-4" />
          </Button>
        </header>

        <div className="caedora-ai-thread-host min-h-0 flex-1 overflow-hidden bg-background p-3 pt-0">
          {providerState?.state === 'ready' && rootPath ? (
            <DesktopAssistantRuntimeProvider
              key={`${rootPath}:${threadNonce}`}
              rootPath={rootPath}
              currentFilePath={currentFilePath}
            >
              <ProjectFileTools
                rootPath={rootPath}
                toolPermissionLevel={
                  settings.ai.toolPermissionLevel ??
                  (settings.ai.autoApproveSafeOperations ? 'allow-all' : 'require-approval')
                }
              >
                <Thread />
              </ProjectFileTools>
            </DesktopAssistantRuntimeProvider>
          ) : (
            <AssistantLockedState
              download={providerState?.download ?? null}
              message={
                !rootPath
                  ? 'Open a desktop local vault to let Argus (AI Assistant) read and edit project files.'
                  : providerState?.message ?? 'Choose an Argus (AI Assistant) provider to enable chat.'
              }
              onOpenSettings={onOpenSettings}
            />
          )}
        </div>
      </div>
    </aside>
  )
}

function ResizeHandle({
  width,
  onResize,
}: {
  width: number
  onResize: (width: number) => void
}) {
  return (
    <div
      className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize"
      onPointerDown={(event) => {
        event.preventDefault()
        const startX = event.clientX
        const startWidth = width

        const onMove = (moveEvent: PointerEvent) => {
          onResize(clampWidth(startWidth + startX - moveEvent.clientX))
        }
        const onUp = () => {
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp, { once: true })
      }}
    />
  )
}

function AssistantLockedState({
  message,
  download,
  onOpenSettings,
}: {
  message: string
  download: AiProviderState['download']
  onOpenSettings: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
        <Sparkles className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">Argus (AI Assistant) is not ready</p>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      </div>
      {download && (
        <div className="w-full max-w-72">
          <div className="bg-muted h-2 overflow-hidden rounded-sm">
            <div
              className="bg-primary h-full transition-[width]"
              style={{ width: `${download.percent}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {download.percent.toFixed(1)}% downloaded
          </p>
        </div>
      )}
      <div className="flex gap-2">
        {download && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void cancelModelDownload(download.modelId)}
          >
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={onOpenSettings}>
          Configure Argus (AI Assistant)
        </Button>
      </div>
    </div>
  )
}

function desktopRootPath(provider: VaultProvider): string | null {
  if ('directoryPath' in provider && typeof provider.directoryPath === 'string') {
    return provider.directoryPath
  }
  return null
}

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width || 400)))
}

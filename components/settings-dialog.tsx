'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Cloud,
  CircleCheck,
  Cpu,
  Download,
  FolderOpen,
  FolderPlus,
  Keyboard,
  KeyRound,
  Loader2,
  Palette,
  Server,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import { ConnectDialog } from '@/components/connect-dialog'
import { Input } from '@/components/ui/input'
import {
  APPEARANCE_PALETTES,
  SYNC_INTERVAL_OPTIONS,
} from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { useVault } from '@/lib/vault-context'
import { getDesktopApi } from '@/lib/desktop'
import { ARGUS_ASSISTANT_PROMPT } from '@/lib/ai/argus-context'
import {
  cancelModelDownload,
  clearCloudApiKey,
  deleteBundledModel,
  getAiState,
  onModelDownloadEvent,
  saveCloudApiKey,
  startModelDownload,
  updateAiSettings,
} from '@/lib/desktop-ai'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import type { PersistedVaultState } from '@/lib/types'
import type { AiProviderKind, AiProviderState, AiSettings as DesktopAiSettings } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

export type SettingsSection = 'general' | 'ai' | 'editor' | 'appearance' | 'hotkeys' | 'vaults'

type StoredVault = { id: string; state: PersistedVaultState }

const sections: Array<{
  group: string
  items: Array<{ id: SettingsSection; label: string; Icon: typeof SlidersHorizontal }>
}> = [
  {
    group: 'Options',
    items: [
      { id: 'general', label: 'General', Icon: SlidersHorizontal },
      { id: 'ai', label: 'Argus', Icon: Bot },
      { id: 'editor', label: 'Editor', Icon: Type },
      { id: 'appearance', label: 'Appearance', Icon: Palette },
      { id: 'hotkeys', label: 'Hotkeys', Icon: Keyboard },
      { id: 'vaults', label: 'Vaults', Icon: FolderOpen },
    ],
  },
]

export function SettingsDialog({
  open,
  onOpenChange,
  initialSection = 'general',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: SettingsSection
}) {
  const [section, setSection] = useState<SettingsSection>(initialSection)
  const isDesktop = Boolean(getDesktopApi())
  const visibleSections = useMemo(
    () =>
      sections.map((group) => ({
        ...group,
        items: group.items.filter((item) => isDesktop || item.id !== 'ai'),
      })),
    [isDesktop]
  )
  const title = useMemo(
    () => visibleSections.flatMap((group) => group.items).find((item) => item.id === section)?.label,
    [section, visibleSections]
  )

  useEffect(() => {
    if (open) setSection(!isDesktop && initialSection === 'ai' ? 'general' : initialSection)
  }, [open, initialSection, isDesktop])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-none w-[96vw] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[180px_1fr]">
          <aside className="border-b p-2 md:border-r md:border-b-0">
            {visibleSections.map((group) => (
              <div key={group.group} className="flex flex-col gap-1">
                <div className="text-muted-foreground px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
                  {group.group}
                </div>
                {group.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
                      section === id
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </aside>

          <main className="min-h-0 overflow-y-auto p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            {section === 'general' && <GeneralSettings />}
            {section === 'ai' && <AiSettings />}
            {section === 'editor' && <EditorSettings />}
            {section === 'appearance' && <AppearanceSettings />}
            {section === 'hotkeys' && <HotkeySettings />}
            {section === 'vaults' && <VaultSettings />}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function VaultSettings() {
  const { connectToVault } = useVault()
  const [vaults, setVaults] = useState<StoredVault[]>([])
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [switchingVaultId, setSwitchingVaultId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState<'create' | 'open' | null>(null)

  async function refreshVaults() {
    const [stored, active] = await Promise.all([listVaults(), getActiveVaultId()])
    setVaults(stored)
    setActiveVaultIdState(active)
  }

  useEffect(() => {
    void refreshVaults()
  }, [])

  async function switchVault(id: string) {
    if (id === activeVaultId || switchingVaultId) return
    setSwitchingVaultId(id)
    try {
      await connectToVault(id)
      await refreshVaults()
    } finally {
      setSwitchingVaultId(null)
    }
  }

  return (
    <>
      <ItemGroup>
        {vaults.length > 0 ? (
          vaults.map((vault, index) => (
            <div key={vault.id}>
              {index > 0 && <Separator />}
              <Item>
                <ItemContent>
                  <ItemTitle>{vaultLabel(vault.state)}</ItemTitle>
                  <ItemDescription>
                    {vault.id === activeVaultId ? 'Current vault' : vaultKind(vault.state)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  {switchingVaultId === vault.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void switchVault(vault.id)}
                        disabled={vault.id === activeVaultId || !!switchingVaultId}
                      >
                        Open
                      </Button>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeVault(vault.id)
                          await refreshVaults()
                        }}
                        className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-md"
                        aria-label={`Remove ${vaultLabel(vault.state)}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </ItemActions>
              </Item>
            </div>
          ))
        ) : (
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>No saved vaults</ItemTitle>
              <ItemDescription>Create or open a vault to add it here.</ItemDescription>
            </ItemContent>
          </Item>
        )}
        <Separator />
        <Item>
          <ItemContent>
            <ItemTitle>Add a vault</ItemTitle>
            <ItemDescription>
              Create a new Caedora vault or reconnect to an existing one.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button type="button" onClick={() => setConnectMode('create')}>
              <FolderPlus className="size-4" />
              Create vault
            </Button>
            <Button type="button" variant="outline" onClick={() => setConnectMode('open')}>
              <FolderOpen className="size-4" />
              Open vault
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
      <ConnectDialog
        open={connectMode !== null}
        mode={connectMode ?? 'create'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConnectMode(null)
            void refreshVaults()
          }
        }}
      />
    </>
  )
}

function GeneralSettings() {
  const { settings, updateSettings } = useSettings()

  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Auto-sync</ItemTitle>
          <ItemDescription>
            Automatically save and commit changes while you type.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <button
            type="button"
            onClick={() =>
              updateSettings({
                syncMode: settings.syncMode === 'auto' ? 'manual' : 'auto',
              })
            }
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle auto-sync"
          >
            {settings.syncMode === 'auto' ? (
              <ToggleRight className="text-primary size-7" />
            ) : (
              <ToggleLeft className="size-7" />
            )}
          </button>
        </ItemActions>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Sync interval</ItemTitle>
          <ItemDescription>
            Controls how often changes are committed when auto-sync is enabled.
          </ItemDescription>
        </ItemContent>
        <ItemActions className="flex-wrap justify-end">
          {SYNC_INTERVAL_OPTIONS.map(({ label, ms }) => (
            <Button
              key={ms}
              type="button"
              size="sm"
              variant={settings.syncIntervalMs === ms ? 'default' : 'outline'}
              onClick={() => updateSettings({ syncIntervalMs: ms })}
              disabled={settings.syncMode !== 'auto'}
            >
              {label}
            </Button>
          ))}
        </ItemActions>
      </Item>
      {settings.syncMode === 'manual' && (
        <>
          <Separator />
          <Item variant="muted" size="sm">
            <ItemContent>
              <ItemTitle>Manual sync is enabled</ItemTitle>
              <ItemDescription>
                Use the sidebar sync icon to manually save and commit your changes.
              </ItemDescription>
            </ItemContent>
          </Item>
        </>
      )}
    </ItemGroup>
  )
}

function AiSettings() {
  const { settings, updateSettings } = useSettings()
  const [state, setState] = useState<AiProviderState | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const ai = settings.ai

  useEffect(() => {
    let alive = true
    const loadState = () => {
      getAiState()
        .then((next) => {
          if (alive) setState(next)
        })
        .catch(() => {})
    }
    const unsubscribe = onModelDownloadEvent((event) => {
      if (alive) {
        setState((current) =>
          current
            ? {
                ...current,
                download: event.progress,
                state: event.type === 'progress' ? 'downloading' : current.state,
              }
            : current
        )
        if (event.type !== 'progress') loadState()
      }
    })
    loadState()
    const timer = window.setInterval(loadState, 2_000)
    return () => {
      alive = false
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [])

  async function refreshAiState() {
    try {
      const next = await getAiState()
      setState(next)
      return next
    } catch {
      return null
    }
  }

  async function startDownload() {
    setBusy(true)
    setMessage(null)
    try {
      setState(await startModelDownload(ai.bundledModel.modelId))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start model download.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelDownload() {
    setBusy(true)
    try {
      setState(await cancelModelDownload(ai.bundledModel.modelId))
    } finally {
      setBusy(false)
      void refreshAiState()
    }
  }

  async function deleteModel() {
    if (!window.confirm('Delete the bundled local model? You will need to re-download ~4.7 GB to use it again.')) {
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      setState(await deleteBundledModel(ai.bundledModel.modelId))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete model.')
    } finally {
      setBusy(false)
    }
  }

  async function updateDesktopAi(updates: Partial<DesktopAiSettings>) {
    const next = {
      ...ai,
      ...updates,
      sidebar: {
        ...ai.sidebar,
        ...updates.sidebar,
      },
      bundledModel: {
        ...ai.bundledModel,
        ...updates.bundledModel,
      },
      cloud: {
        ...ai.cloud,
        ...updates.cloud,
      },
    }
    await updateSettings({ ai: next })
    try {
      setState(await updateAiSettings(updates))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update Argus settings.')
    }
  }

  async function selectProvider(provider: AiProviderKind | 'auto') {
    await updateDesktopAi({
      selectedProvider: provider,
      explicitProviderChoice: provider !== 'auto',
    })
  }

  async function saveKey() {
    if (!apiKey.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      const next = await saveCloudApiKey(apiKey.trim())
      setState(next)
      setApiKey('')
      await updateSettings({
        ai: {
          ...ai,
          cloud: {
            ...ai.cloud,
            hasApiKey: true,
          },
        },
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save API key.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Provider</ItemTitle>
          <ItemDescription>
            Argus runs only in the desktop app.
          </ItemDescription>
          {state && (
            <p className="text-muted-foreground mt-1 text-xs">
              {state.message}
            </p>
          )}
        </ItemContent>
        <ItemActions className="flex-wrap justify-end">
          <Button
            type="button"
            size="sm"
            variant={ai.selectedProvider === 'auto' ? 'default' : 'outline'}
            onClick={() => void selectProvider('auto')}
          >
            Auto
          </Button>
          <Button
            type="button"
            size="sm"
            variant={ai.selectedProvider === 'ollama' ? 'default' : 'outline'}
            onClick={() => void selectProvider('ollama')}
          >
            <Server className="size-4" />
            Ollama
          </Button>
          <Button
            type="button"
            size="sm"
            variant={ai.selectedProvider === 'local-llama' ? 'default' : 'outline'}
            onClick={() => void selectProvider('local-llama')}
          >
            <Cpu className="size-4" />
            Bundled
          </Button>
          <Button
            type="button"
            size="sm"
            variant={ai.selectedProvider === 'cloud' ? 'default' : 'outline'}
            onClick={() => void selectProvider('cloud')}
          >
            <Cloud className="size-4" />
            Cloud
          </Button>
        </ItemActions>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Ollama</ItemTitle>
          <ItemDescription>
            Local, free, and fully offline once Ollama and a model are installed.
          </ItemDescription>
          {state?.ollamaModels.length ? (
            <p className="text-muted-foreground mt-1 font-mono text-[10px]">
              Detected: {state.ollamaModels.map((model) => model.label).slice(0, 5).join(', ')}
            </p>
          ) : (
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-1 block text-xs underline underline-offset-2"
            >
              Install Ollama
            </a>
          )}
        </ItemContent>
        <ItemActions>
          <select
            value={ai.ollamaModel}
            onChange={(event) => void updateDesktopAi({ ollamaModel: event.target.value })}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            disabled={!state?.ollamaModels.length}
          >
            <option value="">Auto</option>
            {state?.ollamaModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </ItemActions>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Bundled local model</ItemTitle>
          <ItemDescription>
            Download a GGUF model into desktop app data before using this provider. This keeps
            chat fully offline.
          </ItemDescription>
          {state?.download ? (
            <div className="mt-3 max-w-xl">
              <div className="bg-muted h-2 overflow-hidden rounded-sm">
                <div
                  className="bg-primary h-full transition-[width]"
                  style={{ width: `${state.download.percent}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {state.download.message ?? 'Downloading model...'} {state.download.percent.toFixed(1)}%
                {' - '}
                {formatBytes(state.download.downloadedBytes)}
                {state.download.totalBytes ? ` of ${formatBytes(state.download.totalBytes)}` : ''}
                {state.download.etaSeconds ? ` - about ${formatEta(state.download.etaSeconds)} remaining` : ''}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">
              {state?.bundledModelDownloaded
                ? 'Model downloaded and ready.'
                : 'Download local model (approx 4.7 GB) to enable.'}
            </p>
          )}
        </ItemContent>
        <ItemActions>
          {state?.download ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void cancelDownload()} disabled={busy}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void startDownload()}
                disabled={busy || state?.bundledModelDownloaded}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {state?.bundledModelDownloaded ? 'Downloaded' : 'Download model'}
              </Button>
              {state?.bundledModelDownloaded && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteModel()}
                  disabled={busy}
                  aria-label="Delete bundled model"
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              )}
            </>
          )}
        </ItemActions>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Cloud API</ItemTitle>
          <ItemDescription>
            Your messages and file contents will be sent to {cloudProviderLabel(ai.cloud.provider)}.
            Usage may incur provider charges.
          </ItemDescription>
          {message && <p className="text-destructive mt-1 text-xs">{message}</p>}
        </ItemContent>
        <ItemActions className="flex-wrap justify-end">
          <select
            value={ai.cloud.provider}
            onChange={(event) =>
              void updateDesktopAi({
                cloud: {
                  ...ai.cloud,
                  provider: event.target.value as DesktopAiSettings['cloud']['provider'],
                },
              })
            }
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom-openai">Custom OpenAI-compatible</option>
          </select>
          <Input
            value={ai.cloud.model}
            onChange={(event) =>
              void updateDesktopAi({ cloud: { ...ai.cloud, model: event.target.value } })
            }
            className="w-44"
            placeholder="Model"
          />
          {ai.cloud.provider === 'custom-openai' && (
            <Input
              value={ai.cloud.baseUrl}
              onChange={(event) =>
                void updateDesktopAi({ cloud: { ...ai.cloud, baseUrl: event.target.value } })
              }
              className="w-56"
              placeholder="Base URL"
            />
          )}
          <Input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="w-44"
            placeholder={ai.cloud.hasApiKey ? 'Key saved' : 'API key'}
            autoComplete="off"
          />
          <Button type="button" size="sm" onClick={() => void saveKey()} disabled={busy || !apiKey.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Save key
          </Button>
          {ai.cloud.hasApiKey && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                setState(await clearCloudApiKey())
                await updateSettings({
                  ai: {
                    ...ai,
                    cloud: {
                      ...ai.cloud,
                      hasApiKey: false,
                    },
                  },
                })
              }}
            >
              Clear key
            </Button>
          )}
        </ItemActions>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Tool permissions</ItemTitle>
          <ItemDescription>
            Reads are always allowed. Choose when file changes can run without approval.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <select
            value={
              ai.toolPermissionLevel ??
              (ai.autoApproveSafeOperations ? 'allow-all' : 'require-approval')
            }
            onChange={(event) => {
              const toolPermissionLevel = event.target
                .value as DesktopAiSettings['toolPermissionLevel']
              void updateDesktopAi({
                toolPermissionLevel,
                toolPermissionLevelConfigured: true,
                autoApproveSafeOperations: toolPermissionLevel !== 'require-approval',
              })
            }}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            aria-label="Argus tool permission level"
          >
            <option value="require-approval">Ask for all</option>
            <option value="allow-all-except-delete">Ask for delete only</option>
            <option value="allow-all">Allow all edits</option>
          </select>
        </ItemActions>
      </Item>
      <Separator />
      <Item className="items-stretch">
        <ItemContent className="min-w-0">
          <ItemTitle>Built-in system context</ItemTitle>
          <ItemDescription>
            This read-only context is sent to Argus before each request.
          </ItemDescription>
          <pre className="bg-muted text-muted-foreground mt-3 max-h-64 overflow-auto rounded-md p-3 whitespace-pre-wrap text-xs">
            {ARGUS_ASSISTANT_PROMPT}
          </pre>
        </ItemContent>
      </Item>
      <Separator />
      <Item className="items-stretch">
        <ItemContent className="min-w-0">
          <ItemTitle>Extra system context</ItemTitle>
          <ItemDescription>
            Add your own instructions. These are appended after the built-in context.
          </ItemDescription>
          <textarea
            value={ai.extraSystemPrompt ?? ''}
            onChange={(event) =>
              void updateDesktopAi({ extraSystemPrompt: event.target.value })
            }
            className="border-input bg-background mt-3 min-h-32 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            placeholder="Example: Prefer short travel notes with packing reminders."
          />
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}

function EditorSettings() {
  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Rich text editor</ItemTitle>
          <ItemDescription>
            Notes open in the TipTap markdown editor with formatting controls enabled.
          </ItemDescription>
        </ItemContent>
      </Item>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Autosave behavior</ItemTitle>
          <ItemDescription>
            Local files are written shortly after edits; sync settings control commit cadence.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}

function AppearanceSettings() {
  const { settings, updateSettings } = useSettings()
  const isDesktop = Boolean(getDesktopApi())

  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Theme</ItemTitle>
          <ItemDescription>
            Switch between light, dark, and system appearance.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <ModeToggle />
        </ItemActions>
      </Item>
      <Separator />
      <Item className="items-start">
        <ItemContent>
          <ItemTitle>Color palette</ItemTitle>
          <ItemDescription>
            Choose app colors separately from light and dark appearance.
          </ItemDescription>
          <div className="grid w-full grid-cols-1 gap-2 pt-3 sm:grid-cols-2">
            {APPEARANCE_PALETTES.map((palette) => {
              const selected = settings.appearancePalette === palette.id
              const swatches =
                palette.id === 'custom'
                  ? customPaletteSwatches(settings.customPaletteHex)
                  : palette.swatches
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => updateSettings({ appearancePalette: palette.id })}
                  aria-pressed={selected}
                  className={cn(
                    'border-border bg-card hover:bg-accent flex min-h-24 flex-col justify-between rounded-md border p-3 text-left transition',
                    selected && 'border-primary ring-primary/30 ring-2'
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium">{palette.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {palette.description}
                      </span>
                    </span>
                    {selected && <CircleCheck className="text-primary size-4 shrink-0" />}
                  </span>
                  <span className="mt-3 grid grid-cols-4 overflow-hidden rounded-sm border">
                    {swatches.map((color) => (
                      <span
                        key={color}
                        className="h-7"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          {settings.appearancePalette === 'custom' && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={settings.customPaletteHex}
                onChange={(event) => {
                  const value = event.target.value
                  updateSettings({
                    customPaletteHex: value,
                    appearancePalette: isValidHex(value) ? 'custom' : settings.appearancePalette,
                  })
                }}
                placeholder="#5b8cff"
                aria-label="Custom palette hex color"
                className={cn(
                  'font-mono sm:max-w-40',
                  !isValidHex(settings.customPaletteHex) && 'border-destructive'
                )}
              />
              <input
                type="color"
                value={
                  isValidHex(settings.customPaletteHex)
                    ? normalizeHex(settings.customPaletteHex)
                    : '#5b8cff'
                }
                onChange={(event) =>
                  updateSettings({
                    customPaletteHex: event.target.value,
                    appearancePalette: 'custom',
                  })
                }
                aria-label="Pick custom palette color"
                className="border-border bg-background h-9 w-12 rounded-md border p-1"
              />
              {!isValidHex(settings.customPaletteHex) && (
                <span className="text-destructive text-xs">Use a 6-digit hex color.</span>
              )}
            </div>
          )}
        </ItemContent>
      </Item>
      {isDesktop && (
        <>
          <Separator />
          <Item>
            <ItemContent>
              <ItemTitle>Desktop transparency</ItemTitle>
              <ItemDescription>
                Use a translucent blurred sidebar in the desktop app.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    desktopTransparencyEnabled: !settings.desktopTransparencyEnabled,
                  })
                }
                className="text-muted-foreground hover:text-foreground"
                aria-label="Toggle desktop transparency"
              >
                {settings.desktopTransparencyEnabled ? (
                  <ToggleRight className="text-primary size-7" />
                ) : (
                  <ToggleLeft className="size-7" />
                )}
              </button>
            </ItemActions>
          </Item>
        </>
      )}
    </ItemGroup>
  )
}

function HotkeySettings() {
  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Keyboard shortcuts</ItemTitle>
          <ItemDescription>
            Shortcut customization is not configurable yet.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}

function vaultLabel(state: PersistedVaultState): string {
  if (state.type === 'github') return `${state.githubOwner}/${state.githubRepo}`
  return state.directoryName ?? state.directoryHandle?.name ?? 'Local vault'
}

function isValidHex(value: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(value.trim())
}

function normalizeHex(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function customPaletteSwatches(value: string): string[] {
  const color = isValidHex(value) ? normalizeHex(value) : '#5b8cff'
  return ['#f7f7f7', color, '#181818', '#0f0f0f']
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit < 2 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

function cloudProviderLabel(provider: DesktopAiSettings['cloud']['provider']): string {
  if (provider === 'anthropic') return 'Anthropic'
  if (provider === 'custom-openai') return 'your custom endpoint'
  return 'OpenAI'
}

function vaultKind(state: PersistedVaultState): string {
  if (state.type === 'github') return 'GitHub vault'
  return state.directoryPath ? 'Desktop folder' : 'Local folder'
}

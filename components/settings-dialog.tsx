'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  CircleCheck,
  CircleX,
  FolderOpen,
  FolderPlus,
  Keyboard,
  Loader2,
  Palette,
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
  LOCAL_LLM_PRESETS,
  SYNC_INTERVAL_OPTIONS,
  type LocalLlmSettings,
} from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { useVault } from '@/lib/vault-context'
import { testLocalLlmConnection, type LocalLlmTestResult } from '@/lib/local-llm'
import { getDesktopApi } from '@/lib/desktop'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import type { PersistedVaultState } from '@/lib/types'
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
      { id: 'ai', label: 'AI', Icon: Bot },
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
  const title = useMemo(
    () => sections.flatMap((group) => group.items).find((item) => item.id === section)?.label,
    [section]
  )

  useEffect(() => {
    if (open) setSection(initialSection)
  }, [open, initialSection])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-none w-[96vw] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[180px_1fr]">
          <aside className="border-b p-2 md:border-r md:border-b-0">
            {sections.map((group) => (
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
              Create a new personal-md vault or reconnect to an existing one.
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
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<LocalLlmTestResult | null>(null)
  const localLlm = settings.localLlm

  function updateLocalLlm(updates: Partial<LocalLlmSettings>) {
    setResult(null)
    void updateSettings({
      localLlm: {
        ...localLlm,
        ...updates,
      },
    })
  }

  async function runTest() {
    setTesting(true)
    try {
      setResult(await testLocalLlmConnection(localLlm))
    } finally {
      setTesting(false)
    }
  }

  return (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>Local LLM</ItemTitle>
          <ItemDescription>
            Use a local OpenAI-compatible server for desktop AI features.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <button
            type="button"
            onClick={() => updateLocalLlm({ enabled: !localLlm.enabled })}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle local LLM"
          >
            {localLlm.enabled ? (
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
          <ItemTitle>Runtime</ItemTitle>
          <ItemDescription>
            Pick a default endpoint or use a custom OpenAI-compatible URL.
          </ItemDescription>
        </ItemContent>
        <ItemActions className="flex-wrap justify-end">
          {LOCAL_LLM_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={localLlm.preset === preset.id ? 'default' : 'outline'}
              onClick={() =>
                updateLocalLlm({
                  preset: preset.id,
                  baseUrl: preset.baseUrl,
                  model: preset.model,
                })
              }
            >
              {preset.label}
            </Button>
          ))}
        </ItemActions>
      </Item>
      <Separator />
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="local-llm-base-url">
            Base URL
          </label>
          <Input
            id="local-llm-base-url"
            value={localLlm.baseUrl}
            onChange={(e) =>
              updateLocalLlm({
                baseUrl: e.target.value,
                preset: 'custom',
              })
            }
            placeholder="http://localhost:11434/v1"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="local-llm-model">
            Model
          </label>
          <Input
            id="local-llm-model"
            value={localLlm.model}
            onChange={(e) => updateLocalLlm({ model: e.target.value })}
            placeholder="llama3.2"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="local-llm-api-key">
            API key
          </label>
          <Input
            id="local-llm-api-key"
            type="password"
            value={localLlm.apiKey}
            onChange={(e) => updateLocalLlm({ apiKey: e.target.value })}
            placeholder="Optional"
            autoComplete="off"
          />
        </div>
      </div>
      <Separator />
      <Item>
        <ItemContent>
          <ItemTitle>Connection</ItemTitle>
          <ItemDescription>
            {result
              ? result.message
              : 'Check that the selected local server is reachable.'}
          </ItemDescription>
          {result?.models.length ? (
            <p className="text-muted-foreground mt-1 font-mono text-[10px]">
              {result.models.slice(0, 5).join(', ')}
            </p>
          ) : null}
        </ItemContent>
        <ItemActions>
          {result ? (
            result.ok ? (
              <CircleCheck className="text-good size-4" />
            ) : (
              <CircleX className="text-destructive size-4" />
            )
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void runTest()}
            disabled={testing || !localLlm.baseUrl}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bot className="size-4" />
            )}
            Test
          </Button>
        </ItemActions>
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

function vaultKind(state: PersistedVaultState): string {
  if (state.type === 'github') return 'GitHub vault'
  return state.directoryPath ? 'Desktop folder' : 'Local folder'
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FolderOpen,
  FolderPlus,
  Clock,
  Keyboard,
  Loader2,
  Monitor,
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
import { SYNC_INTERVAL_OPTIONS } from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { useVault } from '@/lib/vault-context'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import type { PersistedVaultState } from '@/lib/types'
import { cn } from '@/lib/utils'

export type SettingsSection = 'general' | 'editor' | 'appearance' | 'hotkeys' | 'vaults'

type StoredVault = { id: string; state: PersistedVaultState }

const sections: Array<{
  group: string
  items: Array<{ id: SettingsSection; label: string; Icon: typeof SlidersHorizontal }>
}> = [
  {
    group: 'Options',
    items: [
      { id: 'general', label: 'General', Icon: SlidersHorizontal },
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
  return state.directoryHandle?.name ?? 'Local vault'
}

function vaultKind(state: PersistedVaultState): string {
  return state.type === 'github' ? 'GitHub vault' : 'Local folder'
}

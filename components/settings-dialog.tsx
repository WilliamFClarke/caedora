'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Check,
  Cloud,
  CircleCheck,
  Cpu,
  Download,
  ExternalLink,
  FolderOpen,
  Github,
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
  UserRound,
} from 'lucide-react'
import { SignInButton, SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Input } from '@/components/ui/input'
import {
  APPEARANCE_PALETTES,
  SYNC_INTERVAL_OPTIONS,
} from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { getDesktopApi } from '@/lib/desktop'
import { ACCOUNT_URL } from '@/lib/accounts'
import { ConnectDialog } from '@/components/connect-dialog'
import { caedoraClerkAppearance } from '@/components/account/clerk-appearance'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import { useVault } from '@/lib/vault-context'
import { type StoredVault, vaultLabel } from '@/components/vault/saved-vault-list'
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
import type { AiProviderKind, AiProviderState, AiSettings as DesktopAiSettings } from '@/lib/ai/types'
import { cn } from '@/lib/utils'
import { VaultManagerDialog } from '@/components/vault/vault-manager-dialog'

export type SettingsSection = 'general' | 'account' | 'ai' | 'editor' | 'appearance' | 'hotkeys'

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
      { id: 'account', label: 'Account', Icon: UserRound },
    ],
  },
  {
    group: 'Integrations',
    items: [
      { id: 'ai', label: 'Argus (AI Assistant)', Icon: Bot },
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
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-none w-[calc(100vw-1rem)] max-w-[1320px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1320px] md:h-[88vh] md:w-[96vw]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[300px_1fr] md:grid-rows-none">
          <aside className="bg-muted/20 border-b p-4 md:border-r md:border-b-0">
            {visibleSections.map((group) => (
              <div key={group.group} className="mb-8 flex flex-row flex-wrap items-center gap-1 last:mb-0 md:flex-col md:flex-nowrap md:items-stretch">
                <div className="text-muted-foreground hidden px-2 pb-2 text-[11px] font-medium md:block">
                  {group.group}
                </div>
                {group.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={cn(
                      'flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm transition-colors md:h-8',
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

          <main className="min-h-0 overflow-y-auto p-5 sm:p-8">
            <div className="mx-auto max-w-4xl">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            {section === 'general' && <GeneralSettings />}
            {section === 'account' && <AccountSettings />}
            {section === 'ai' && <AiSettings />}
            {section === 'editor' && <EditorSettings />}
            {section === 'appearance' && <AppearanceSettings />}
            {section === 'hotkeys' && <HotkeySettings />}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AccountSettings() {
  const [connectGitHubOpen, setConnectGitHubOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  useEffect(() => {
    setIsDesktop(Boolean(getDesktopApi()))
  }, [])

  return (
    <>
      <Tabs defaultValue="account" className="gap-5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          {clerkConfigured ? (
            <ConfiguredAccountSettings isDesktop={isDesktop} />
          ) : (
            <UnconfiguredAccountSettings />
          )}
        </TabsContent>
        <TabsContent value="github">
          <GitHubAccountSettings onOpenGitHub={() => setConnectGitHubOpen(true)} />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingSettings />
        </TabsContent>
      </Tabs>
      <ConnectDialog
        open={connectGitHubOpen}
        onOpenChange={setConnectGitHubOpen}
        mode="open"
        showSavedVaults={false}
        initialSource="github"
      />
    </>
  )
}

function UnconfiguredAccountSettings() {
  return (
    <SettingsSectionBlock title="Account">
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Accounts are not configured yet</ItemTitle>
            <ItemDescription>
              Add Clerk through Vercel Marketplace to enable optional email,
              GitHub, and Google accounts. Caedora can still be used without an
              account, and GitHub vault access remains available separately.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button asChild size="sm" variant="outline">
              <a href="/account">Setup details</a>
            </Button>
          </ItemActions>
        </Item>
      </ItemGroup>
    </SettingsSectionBlock>
  )
}

function ConfiguredAccountSettings({ isDesktop }: { isDesktop: boolean }) {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) {
    return (
      <ItemGroup>
        <Item>
          <ItemContent>
            <ItemTitle>Account</ItemTitle>
            <ItemDescription>Loading account state...</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </ItemActions>
        </Item>
      </ItemGroup>
    )
  }

  return (
    <SettingsSectionBlock title="Account">
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
      {isDesktop && (
        <>
          <Item variant="muted" size="sm" className="rounded-none">
            <ItemContent>
              <ItemTitle>Web account page</ItemTitle>
              <ItemDescription>
                Open the hosted account page in your browser for account
                management outside the desktop app.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button asChild size="sm" variant="outline">
                <a href={ACCOUNT_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open account page
                </a>
              </Button>
            </ItemActions>
          </Item>
          <Separator />
        </>
      )}
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>{isSignedIn ? 'Signed in' : 'Not signed in'}</ItemTitle>
          <ItemDescription>
            {isSignedIn
              ? user.primaryEmailAddress?.emailAddress ?? user.fullName ?? 'Account connected.'
              : 'Use Caedora without an account, or sign in for future account-linked features.'}
          </ItemDescription>
        </ItemContent>
        <ItemActions className="flex-wrap justify-end">
          {isSignedIn ? (
            <>
              <UserButton appearance={caedoraClerkAppearance} />
              <SignOutButton>
                <Button type="button" size="sm" variant="outline">
                  Sign out
                </Button>
              </SignOutButton>
              <Button asChild size="sm" variant="secondary">
                <a href="/account">Account page</a>
              </Button>
            </>
          ) : (
            <SignInButton mode="modal" appearance={caedoraClerkAppearance}>
              <Button type="button" size="sm">
                Sign in
              </Button>
            </SignInButton>
          )}
        </ItemActions>
      </Item>
      <Separator />
      <Item variant="muted" size="sm" className="rounded-none">
        <ItemContent>
          <ItemTitle>Privacy boundary</ItemTitle>
          <ItemDescription>
            Accounts do not store vault content, note paths, note titles, GitHub
            tokens, or vault indexes on Caedora servers.
          </ItemDescription>
        </ItemContent>
      </Item>
      </ItemGroup>
    </SettingsSectionBlock>
  )
}

function GitHubAccountSettings({ onOpenGitHub }: { onOpenGitHub: () => void }) {
  const router = useRouter()
  const { connectToVault } = useVault()
  const [githubVaults, setGithubVaults] = useState<StoredVault[]>([])
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [busyVaultId, setBusyVaultId] = useState<string | null>(null)

  async function refreshGithubVaults() {
    const [stored, active] = await Promise.all([listVaults(), getActiveVaultId()])
    setGithubVaults(stored.filter((vault) => vault.state.type === 'github'))
    setActiveVaultIdState(active)
  }

  useEffect(() => {
    void refreshGithubVaults()
  }, [])

  async function openVault(id: string) {
    if (busyVaultId) return
    setBusyVaultId(id)
    try {
      await connectToVault(id)
      router.push('/vault')
      await refreshGithubVaults()
    } finally {
      setBusyVaultId(null)
    }
  }

  async function deleteVault(id: string) {
    await removeVault(id)
    await refreshGithubVaults()
  }

  return (
    <SettingsSectionBlock title="GitHub">
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>GitHub vault access</ItemTitle>
            <ItemDescription>
              Connect a GitHub repository as a Caedora vault. This works with or
              without a Caedora account; repository permission is granted separately
              through GitHub.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button type="button" onClick={onOpenGitHub}>
              <Github className="size-4" />
              Connect GitHub vault
            </Button>
          </ItemActions>
        </Item>
        <Separator />
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Previously connected repositories</ItemTitle>
            <ItemDescription>
              These GitHub vault connections are saved on this device. They are
              not tied to a Caedora account and can be reopened after signing out
              and back in on the same device.
            </ItemDescription>
            <div className="mt-3 grid gap-2">
              {githubVaults.length > 0 ? (
                githubVaults.map((vault) => {
                  const active = vault.id === activeVaultId
                  const busy = vault.id === busyVaultId
                  return (
                    <div
                      key={vault.id}
                      className="border-border bg-background flex min-w-0 flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {vaultLabel(vault.state)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {active ? 'Currently open' : 'Saved GitHub vault'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={active ? 'secondary' : 'outline'}
                          onClick={() => void openVault(vault.id)}
                          disabled={active || Boolean(busyVaultId)}
                        >
                          {busy ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
                          {active ? 'Open' : 'Open'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void deleteVault(vault.id)}
                          disabled={Boolean(busyVaultId)}
                          aria-label={`Remove ${vaultLabel(vault.state)} connection`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  No GitHub repositories are saved on this device yet.
                </p>
              )}
            </div>
          </ItemContent>
        </Item>
        <Separator />
        <Item variant="muted" size="sm" className="rounded-none">
          <ItemContent>
            <ItemTitle>Separate permission</ItemTitle>
            <ItemDescription>
              Signing in with GitHub identifies you. It does not silently grant
              repository access or store repository content on Caedora servers.
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </SettingsSectionBlock>
  )
}

function PricingSettings() {
  return (
    <SettingsSectionBlock title="Pricing">
      <div className="grid gap-3 sm:grid-cols-2">
        <PricingCard
          title="Free"
          price="$0"
          badge="Current"
          features={[
            'Local, browser, and GitHub vaults',
            'No account required',
            'Open Knowledge Format editing',
            'Desktop app support',
          ]}
        />
        <PricingCard
          title="Paid"
          price="Coming soon"
          badge="Planned"
          muted
          features={[
            'Future subscription features',
            'Account-linked entitlements',
            'Optional paid services',
            'Basic vault access stays free',
          ]}
        />
      </div>
    </SettingsSectionBlock>
  )
}

function PricingCard({
  title,
  price,
  badge,
  features,
  muted,
}: {
  title: string
  price: string
  badge: string
  features: string[]
  muted?: boolean
}) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className={cn('mt-1 font-semibold', muted ? 'text-muted-foreground text-xl' : 'text-2xl')}>
            {price}
          </p>
        </div>
        <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
          {badge}
        </span>
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="text-primary mt-0.5 size-3.5 shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SettingsSectionBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function GeneralSettings() {
  const { settings, updateSettings } = useSettings()
  const [vaultManagerOpen, setVaultManagerOpen] = useState(false)

  return (
    <>
      <ItemGroup>
        <Item>
          <ItemContent>
            <ItemTitle>Vaults</ItemTitle>
            <ItemDescription>
              Manage saved vaults, exports, and vault switching.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button type="button" size="sm" variant="outline" onClick={() => setVaultManagerOpen(true)}>
              <FolderOpen className="size-4" />
              Manage vaults
            </Button>
          </ItemActions>
        </Item>
        <Separator />
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
      <VaultManagerDialog open={vaultManagerOpen} onOpenChange={setVaultManagerOpen} />
    </>
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
      setMessage(error instanceof Error ? error.message : 'Could not update Argus (AI Assistant) settings.')
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
            Argus (AI Assistant) runs only in the desktop app.
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
            aria-label="Argus (AI Assistant) tool permission level"
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
            This read-only context is sent to Argus (AI Assistant) before each request.
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
            placeholder="Example: Prefer concise concepts with explicit source links."
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
            Concepts open in the TipTap Markdown editor with formatting controls enabled.
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


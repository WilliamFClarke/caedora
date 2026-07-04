'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CreditCard,
  Database,
  ExternalLink,
  Github,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { SignInButton, SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ConnectDialog } from '@/components/connect-dialog'
import { caedoraClerkAppearance } from '@/components/account/clerk-appearance'
import { ACCOUNT_URL } from '@/lib/accounts'
import { getDesktopApi } from '@/lib/desktop'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import { useVault } from '@/lib/vault-context'
import {
  type StoredVault,
  vaultKind,
  vaultLabel,
} from '@/components/vault/saved-vault-list'
import { cn } from '@/lib/utils'

type AccountSection = 'profile' | 'security' | 'github' | 'data' | 'billing'

const accountSections: Array<{
  id: AccountSection
  label: string
  Icon: typeof UserRound
}> = [
  { id: 'profile', label: 'Profile', Icon: UserRound },
  { id: 'security', label: 'Security', Icon: KeyRound },
  { id: 'github', label: 'GitHub access', Icon: Github },
  { id: 'data', label: 'Data and privacy', Icon: ShieldCheck },
  { id: 'billing', label: 'Billing', Icon: CreditCard },
]

export function AccountPageClient() {
  const router = useRouter()
  const [section, setSection] = useState<AccountSection>('profile')
  const [connectGitHubOpen, setConnectGitHubOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const title = useMemo(
    () => accountSections.find((item) => item.id === section)?.label ?? 'Account',
    [section]
  )

  useEffect(() => {
    setIsDesktop(Boolean(getDesktopApi()))
  }, [])

  return (
    <>
      <main className="bg-background min-h-screen">
        <div className="border-border bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-muted-foreground -ml-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">Account settings</h1>
              <p className="text-muted-foreground hidden text-sm sm:block">
                Manage identity, GitHub access, billing, and privacy controls.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid min-h-[calc(100dvh-3.75rem)] max-w-7xl grid-rows-[auto_1fr] md:grid-cols-[280px_1fr] md:grid-rows-none">
          <aside className="border-border bg-muted/20 min-w-0 overflow-hidden border-b px-3 py-3 md:border-r md:border-b-0 md:p-4">
            <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto pb-1 md:flex-col md:items-stretch md:overflow-visible md:pb-0">
              {accountSections.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors md:w-full',
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
          </aside>

          <section className="min-w-0 px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {sectionDescription(section)}
                </p>
              </div>

              {section === 'profile' &&
                (clerkConfigured ? (
                  <ProfileSettings isDesktop={isDesktop} />
                ) : (
                  <UnconfiguredAccountSettings />
                ))}
              {section === 'security' &&
                (clerkConfigured ? <SecuritySettings /> : <UnconfiguredAccountSettings />)}
              {section === 'github' && (
                <GitHubAccountSettings onOpenGitHub={() => setConnectGitHubOpen(true)} />
              )}
              {section === 'data' && (
                <DataAndPrivacySettings clerkConfigured={clerkConfigured} />
              )}
              {section === 'billing' && <BillingSettings />}
            </div>
          </section>
        </div>
      </main>

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

function sectionDescription(section: AccountSection): string {
  if (section === 'security') return 'Review sign-in state and account deletion controls.'
  if (section === 'github') return 'Connect repositories as local-first Caedora vaults.'
  if (section === 'data') return 'Understand what stays on this device and in your own storage.'
  if (section === 'billing') return 'Review the current plan and future account-linked plans.'
  return 'Review your optional Caedora account and profile details.'
}

function UnconfiguredAccountSettings() {
  return (
    <ItemGroup className="overflow-hidden rounded-lg border bg-card">
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>Accounts are not configured yet</ItemTitle>
          <ItemDescription>
            Add Clerk through Vercel Marketplace to enable optional email, GitHub,
            and Google accounts. Caedora can still be used without an account,
            and GitHub vault access remains available separately.
          </ItemDescription>
        </ItemContent>
      </Item>
      <Separator />
      <Item variant="muted" size="sm" className="rounded-none">
        <ItemContent>
          <ItemTitle>No account required</ItemTitle>
          <ItemDescription>
            Vault content stays in your local folder, browser storage, or GitHub
            repository. It is not uploaded to Caedora account services.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}

function ProfileSettings({ isDesktop }: { isDesktop: boolean }) {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) return <LoadingItem title="Profile" description="Loading account state..." />

  if (!isSignedIn) {
    return (
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Not signed in</ItemTitle>
            <ItemDescription>
              Sign in for future account-linked features. Core vault editing does
              not require an account.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton mode="modal" appearance={caedoraClerkAppearance}>
              <Button type="button" size="sm">
                Sign in
              </Button>
            </SignInButton>
          </ItemActions>
        </Item>
        <Separator />
        <PrivacyBoundaryItem />
      </ItemGroup>
    )
  }

  return (
    <ItemGroup className="overflow-hidden rounded-lg border bg-card">
      {isDesktop && (
        <>
          <Item variant="muted" size="sm" className="rounded-none">
            <ItemContent>
              <ItemTitle>Hosted account page</ItemTitle>
              <ItemDescription>
                Open the web account page in your browser for hosted account
                management outside the desktop app.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button asChild size="sm" variant="outline">
                <a href={ACCOUNT_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open hosted page
                </a>
              </Button>
            </ItemActions>
          </Item>
          <Separator />
        </>
      )}
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>{user.fullName || 'Signed in'}</ItemTitle>
          <ItemDescription>
            {user.primaryEmailAddress?.emailAddress ?? 'Account connected.'}
          </ItemDescription>
          <div className="text-muted-foreground mt-2 grid gap-1 text-xs sm:grid-cols-2">
            <span>Created: {formatDate(user.createdAt)}</span>
            <span>Last sign in: {formatDate(user.lastSignInAt)}</span>
          </div>
        </ItemContent>
        <ItemActions className="justify-end">
          <UserButton appearance={caedoraClerkAppearance} />
          <SignOutButton>
            <Button type="button" size="sm" variant="outline">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </SignOutButton>
        </ItemActions>
      </Item>
      <Separator />
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>Contact details</ItemTitle>
          <ItemDescription>
            Manage email addresses and profile details through Clerk account controls.
          </ItemDescription>
          <div className="mt-3 grid gap-2">
            {user.emailAddresses.map((email) => (
              <div
                key={email.id}
                className="border-border bg-background flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{email.emailAddress}</span>
                {email.id === user.primaryEmailAddressId && (
                  <span className="text-muted-foreground shrink-0 text-xs">Primary</span>
                )}
              </div>
            ))}
          </div>
        </ItemContent>
      </Item>
      <Separator />
      <PrivacyBoundaryItem />
    </ItemGroup>
  )
}

function SecuritySettings() {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) return <LoadingItem title="Security" description="Loading security state..." />

  if (!isSignedIn) {
    return (
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Not signed in</ItemTitle>
            <ItemDescription>
              Sign in before changing account security or deletion settings.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton mode="modal" appearance={caedoraClerkAppearance}>
              <Button type="button" size="sm">Sign in</Button>
            </SignInButton>
          </ItemActions>
        </Item>
      </ItemGroup>
    )
  }

  return (
    <div className="grid gap-4">
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Active account</ItemTitle>
            <ItemDescription>
              Signed in as {user.primaryEmailAddress?.emailAddress ?? user.fullName ?? 'this account'}.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignOutButton>
              <Button type="button" size="sm" variant="outline">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </SignOutButton>
          </ItemActions>
        </Item>
        <Separator />
        <Item variant="muted" size="sm" className="rounded-none">
          <ItemContent>
            <ItemTitle>Password, MFA, and sessions</ItemTitle>
            <ItemDescription>
              Use the Clerk profile menu above or the hosted account page to edit
              password, multifactor authentication, connected identities, and sessions.
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
      <DeleteAccountPanel />
    </div>
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
    <ItemGroup className="overflow-hidden rounded-lg border bg-card">
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>GitHub vault access</ItemTitle>
          <ItemDescription>
            Connect a GitHub repository as a Caedora vault. Repository access is
            granted separately from your optional Caedora account.
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
          <ItemTitle>Saved GitHub repositories</ItemTitle>
          <ItemDescription>
            These connections are saved on this device only. Caedora does not
            store repository content or tokens on its servers.
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
                        Open
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
            repository access or upload vault content to Caedora.
          </ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  )
}

function DataAndPrivacySettings({ clerkConfigured }: { clerkConfigured: boolean }) {
  const [vaults, setVaults] = useState<StoredVault[]>([])

  useEffect(() => {
    void listVaults().then(setVaults)
  }, [])

  return (
    <div className="grid gap-4">
      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Vault content location</ItemTitle>
            <ItemDescription>
              Notes remain in storage you control: a local folder, browser
              storage, or your GitHub repository. Caedora account services do
              not receive note text, note titles, backlinks, or generated indexes.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Separator />
        <Item className="rounded-none">
          <ItemContent>
            <ItemTitle>Saved vault records on this device</ItemTitle>
            <ItemDescription>
              These are local connection records. Open the vault menu in the
              sidebar to switch, export, or manage vaults.
            </ItemDescription>
            <div className="mt-3 grid gap-2">
              {vaults.length > 0 ? (
                vaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="border-border bg-background flex min-w-0 items-center gap-3 rounded-md border p-3"
                  >
                    {vault.state.type === 'github' ? (
                      <Github className="text-muted-foreground size-4 shrink-0" />
                    ) : vault.state.type === 'browser' ? (
                      <Database className="text-muted-foreground size-4 shrink-0" />
                    ) : (
                      <HardDrive className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{vaultLabel(vault.state)}</p>
                      <p className="text-muted-foreground text-xs">{vaultKind(vault.state)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  No vault connection records are saved in this browser yet.
                </p>
              )}
            </div>
          </ItemContent>
        </Item>
        <Separator />
        <PrivacyBoundaryItem />
      </ItemGroup>

      <ItemGroup className="overflow-hidden rounded-lg border bg-card">
        <Item variant="muted" size="sm" className="rounded-none">
          <ItemContent>
            <ItemTitle>Account deletion scope</ItemTitle>
            <ItemDescription>
              {clerkConfigured
                ? 'Deleting your account removes the optional hosted identity. It does not delete local folders, browser vault exports, GitHub repositories, or device-local saved vault records.'
                : 'Hosted account deletion is unavailable because accounts are not configured in this environment.'}
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </div>
  )
}

function BillingSettings() {
  return (
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
  )
}

function DeleteAccountPanel() {
  const router = useRouter()
  const { user } = useUser()
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canDelete = Boolean(user?.deleteSelfEnabled)
  const confirmed = confirmation.trim() === 'DELETE'

  async function deleteAccount() {
    if (!user || !canDelete || !confirmed || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await user.delete()
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete account.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ItemGroup className="overflow-hidden rounded-lg border border-destructive/30 bg-card">
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle className="text-destructive">Delete account</ItemTitle>
          <ItemDescription>
            Permanently delete your optional Caedora account identity. Your
            vault files and GitHub repositories are not deleted by this action.
          </ItemDescription>
          {!canDelete && (
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <AlertTriangle className="size-3.5" />
              Self-service account deletion is not enabled for this Clerk instance.
            </p>
          )}
          {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Type DELETE to confirm"
            className="mt-3 max-w-sm"
            disabled={!canDelete || deleting}
            aria-label="Delete account confirmation"
          />
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void deleteAccount()}
            disabled={!canDelete || !confirmed || deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete account
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
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

function PrivacyBoundaryItem() {
  return (
    <Item variant="muted" size="sm" className="rounded-none">
      <ItemContent>
        <ItemTitle>Privacy boundary</ItemTitle>
        <ItemDescription>
          Accounts do not store vault content, note paths, note titles, GitHub
          tokens, or vault indexes on Caedora servers.
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

function LoadingItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <ItemGroup className="overflow-hidden rounded-lg border bg-card">
      <Item className="rounded-none">
        <ItemContent>
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        </ItemActions>
      </Item>
    </ItemGroup>
  )
}

function formatDate(value: Date | null): string {
  if (!value) return 'Not available'
  return value.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

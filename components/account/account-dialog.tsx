'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ExternalLink,
  Github,
  Loader2,
  Trash2,
  UserRound,
} from 'lucide-react'
import { SignInButton, SignOutButton, UserButton, useUser } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { ConnectDialog } from '@/components/connect-dialog'
import { caedoraClerkAppearance } from '@/components/account/clerk-appearance'
import { ACCOUNT_URL } from '@/lib/accounts'
import { getDesktopApi } from '@/lib/desktop'
import { getActiveVaultId, listVaults, removeVault } from '@/lib/storage'
import { useVault } from '@/lib/vault-context'
import { type StoredVault, vaultLabel } from '@/components/vault/saved-vault-list'
import { cn } from '@/lib/utils'

export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [connectGitHubOpen, setConnectGitHubOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  useEffect(() => {
    setIsDesktop(Boolean(getDesktopApi()))
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-3xl [&>button]:top-4 [&>button]:right-4">
          <DialogTitle className="sr-only">Account</DialogTitle>
          <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
            <header className="border-b px-5 pt-5 pb-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                  <UserRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-none">Account</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Manage identity, GitHub access, and future plan details.
                  </p>
                </div>
              </div>
            </header>
            <div className="min-h-0 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
              <Tabs defaultValue="account" className="gap-5">
                <TabsList className="grid h-auto w-full grid-cols-3">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
    <AccountSectionBlock title="Account">
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
    </AccountSectionBlock>
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
    <AccountSectionBlock title="Account">
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
              Accounts do not store vault content, note paths, note titles,
              GitHub tokens, or vault indexes on Caedora servers.
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </AccountSectionBlock>
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
    <AccountSectionBlock title="GitHub">
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
              repository access or store repository content on Caedora servers.
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </AccountSectionBlock>
  )
}

function PricingSettings() {
  return (
    <AccountSectionBlock title="Pricing">
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
    </AccountSectionBlock>
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

function AccountSectionBlock({
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

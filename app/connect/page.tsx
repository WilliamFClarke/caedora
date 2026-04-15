'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import { useVault } from '@/lib/vault-context'
import {
  FileText,
  Github,
  GitBranch,
  HardDrive,
  FolderOpen,
  ArrowLeft,
  Shield,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react'

const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied: 'GitHub authorisation was cancelled or denied.',
  token_exchange: 'Failed to connect with GitHub — please try again.',
  storage: 'Unable to save your session. Please enable localStorage in your browser.',
  no_code: 'Invalid OAuth response. Please try again.',
}

export default function ConnectPage() {
  const router = useRouter()
  const { status, connectLocal, grantPermission } = useVault()

  // Read ?error= from the URL (set by the GitHub OAuth callback)
  const errorParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('error') ?? undefined
      : undefined
  const errorMessage = errorParam ? (OAUTH_ERRORS[errorParam] ?? 'An error occurred. Please try again.') : null

  // If already connected, go straight to vault
  useEffect(() => {
    if (status.state === 'ready') router.replace('/vault')
  }, [status.state, router])

  // ─── Mode B: permission required ──────────────────────────────────────────
  if (status.state === 'permission-required') {
    return (
      <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)] flex flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-bold tracking-tight">personal-md</span>
            </div>
            <ModeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Re-grant access</h1>
              <p className="text-muted-foreground text-sm">
                Your browser revoked access to{' '}
                <span className="font-medium text-foreground">
                  {status.folderName}
                </span>{' '}
                after the last session. Click below to reconnect.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={grantPermission}
              disabled={status.state === ('connecting' as string)}
            >
              {status.state === ('connecting' as string) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              Grant access to {status.folderName}
            </Button>
            <button
              onClick={() => {
                void import('@/lib/storage').then(({ clearVaultState }) => {
                  void clearVaultState()
                  window.location.reload()
                })
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forget this vault and start over
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── Mode A: fresh connect ───────────────────────────────────────────────
  const isConnecting = status.state === 'connecting'

  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)]">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-bold tracking-tight">personal-md</span>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Connect your vault</h1>
          <p className="text-muted-foreground">
            Choose where your personal markdown files will live. We never store your data.
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive mb-6">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Card className="hover:border-foreground/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">Local folder</CardTitle>
                  <CardDescription>
                    Open a folder on your machine — we read/write files directly, no upload
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={connectLocal}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                Open local folder
              </Button>
              <p className="text-xs text-muted-foreground">
                The folder should be (or will become) a git repo. If it has no{' '}
                <code className="font-mono">.git</code>, we’ll run{' '}
                <code className="font-mono">git init</code> for you.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-foreground/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Github className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">GitHub</CardTitle>
                  <CardDescription>
                    Use a private GitHub repository as your vault
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/api/auth/github">
                  <Github className="h-4 w-4" />
                  Continue with GitHub
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <GitBranch className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">
                    GitLab{' '}
                    <span className="text-xs font-normal text-muted-foreground">Coming soon</span>
                  </CardTitle>
                  <CardDescription>Use a private GitLab repository as your vault</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <HardDrive className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">
                    Browser storage{' '}
                    <span className="text-xs font-normal text-muted-foreground">Coming soon</span>
                  </CardTitle>
                  <CardDescription>
                    Store notes in your browser — no git account needed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Separator className="my-8" />

        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            We only read and write the folder you explicitly choose. Your access token (if using
            GitHub) is stored in your browser only — we never store it on our servers.
          </p>
        </div>
      </main>
    </div>
  )
}

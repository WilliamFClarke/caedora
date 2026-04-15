import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import { FileText, Github, GitBranch, HardDrive, ArrowLeft, Shield, AlertCircle } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'GitHub authorization was cancelled or denied.',
  token_exchange: 'Failed to connect with GitHub. Please try again.',
  storage: 'Unable to save your session — please enable localStorage in your browser.',
  no_code: 'Invalid OAuth response. Please try again.',
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'An error occurred. Please try again.') : null

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
                <Github className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">GitHub</CardTitle>
                  <CardDescription>Use a private GitHub repository as your vault</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/api/auth/github">
                  <Github className="h-4 w-4" />
                  Continue with GitHub
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60">
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

          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <HardDrive className="h-6 w-6" />
                <div>
                  <CardTitle className="text-base">
                    Local storage{' '}
                    <span className="text-xs font-normal text-muted-foreground">Coming soon</span>
                  </CardTitle>
                  <CardDescription>
                    Use your browser&apos;s local storage — no git account needed
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
            We only request read/write access to the single repository you choose. Your access
            token is encrypted in your browser only — we never store it on our servers.
          </p>
        </div>
      </main>
    </div>
  )
}

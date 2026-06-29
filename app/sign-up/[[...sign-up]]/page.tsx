import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isClerkConfigured } from '@/lib/accounts'
import { caedoraClerkAppearance } from '@/components/account/clerk-appearance'

export default function SignUpPage() {
  if (!isClerkConfigured()) return <AuthNotConfigured title="Sign up is not configured yet" />

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <SignUp appearance={caedoraClerkAppearance} />
    </main>
  )
}

function AuthNotConfigured({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">
          Caedora accounts are optional. Add the Clerk environment variables from
          the Vercel Marketplace integration to enable this page.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Use Caedora without an account</Link>
      </Button>
    </main>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ModeToggle } from '@/components/mode-toggle'

export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/caedora-logo.png" alt="" width={22} height={22} priority />
          <span className="text-base font-semibold tracking-tight">Caedora</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link
            href="/#features"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Features
          </Link>
          <Link
            href="/#templates"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Templates
          </Link>
          <Link
            href="/#privacy"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Privacy
          </Link>
          <Link
            href="/#argus"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Argus
          </Link>
          <Link
            href="/download"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Download
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Github } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { REPOSITORY_URL } from '@/lib/downloads'

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
            href="/#okf"
            className="text-muted-foreground hover:text-foreground transition"
          >
            OKF
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
            Argus AI
          </Link>
          <Link
            href="/download"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Download
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            title="GitHub repository"
            className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition"
          >
            <Github className="size-4" />
          </a>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Folder,
  FolderTree,
  Lock,
  Search,
  Sparkles,
  User,
  Wifi,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useVault } from '@/lib/vault-context'
import { CtaButtons } from '@/components/landing/cta-buttons'
import { Launcher } from '@/components/landing/launcher'
import { ScreenshotFrame } from '@/components/landing/screenshot-frame'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { isDesktopApp } from '@/lib/desktop'

export default function Home() {
  const router = useRouter()
  const { status } = useVault()
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  // Detect Electron after mount to avoid SSR/CSR mismatch.
  useEffect(() => {
    setIsDesktop(isDesktopApp())
  }, [])

  useEffect(() => {
    if (status.state === 'ready') router.replace('/vault')
  }, [status.state, router])

  if (isDesktop === null) return null
  if (isDesktop) return <Launcher />

  return (
    <div className="landing-theme bg-background text-foreground min-h-screen">
      <SiteHeader />

      <main>
        <Hero />
        <LogoStrip />
        <FeatureGrid />
        <TemplatesSection />
        <ShowcaseAlternating />
        <PrivacyCallout />
        <ArgusSection />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--landing-accent)_18%,_transparent)_0%,_transparent_60%)] pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24">
        <Image
          src="/caedora-logo.png"
          alt="Caedora"
          width={72}
          height={72}
          priority
          className="mb-6"
        />

        <Badge variant="outline" className="mb-6 gap-1.5 rounded-full px-3 py-1">
          <Sparkles className="text-primary size-3" />
          <span className="text-xs">Privacy-first personal wiki</span>
        </Badge>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Your life&apos;s notes,
          <span className="text-primary"> entirely yours.</span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-balance text-base leading-relaxed sm:text-lg">
          Caedora is a markdown-first personal wiki for tracking anything that
          matters to you. Your notes live in your own folder or GitHub repo,
          never on our servers. An AI assistant, Argus, sits beside you to help
          you think.
        </p>

        <CtaButtons size="xl" className="mt-10" />

        <p className="text-muted-foreground mt-6 text-xs">
          Free, works offline · No account required
        </p>

        <div className="mt-16 w-full">
          <ScreenshotFrame label="caedora.app — vault overview" />
        </div>
      </div>
    </section>
  )
}

function LogoStrip() {
  const items = ['Markdown', 'GitHub', 'File System Access', 'MCP', 'Local-first', 'Privacy-first']
  return (
    <section className="border-b">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-8 text-xs uppercase tracking-widest sm:px-6">
        {items.map((it) => (
          <span key={it}>{it}</span>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: Lock,
    title: 'Your storage, always',
    body:
      'Notes write directly to a folder on your machine or a GitHub repo you own. Nothing routes through our infrastructure.',
  },
  {
    icon: Bot,
    title: 'Argus, built-in',
    body:
      'A desktop assistant that reads your vault, drafts new notes, and answers questions — using the model you pick.',
  },
  {
    icon: FolderTree,
    title: 'Plain markdown',
    body:
      'Standard .md files, frontmatter, wiki-style links. Open the same files in any editor you already use.',
  },
  {
    icon: Wifi,
    title: 'Works offline',
    body:
      'Local-first by default. Open and edit your vault on a plane; sync happens when you reconnect.',
  },
  {
    icon: Search,
    title: 'Find anything',
    body:
      'Full-text search across notes, plus a quick command palette to jump straight to what you need.',
  },
  {
    icon: Sparkles,
    title: 'MCP-ready',
    body:
      'Expose your vault to any MCP-aware AI tool through caedora-mcp — bring your own assistant.',
  },
]

function FeatureGrid() {
  return (
    <section id="features" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mb-14 max-w-2xl">
          <p className="text-primary mb-3 text-sm font-medium uppercase tracking-widest">
            Features
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            A wiki that respects you.
          </h2>
          <p className="text-muted-foreground mt-4 text-base">
            Every design choice in Caedora starts from one rule: your content
            never leaves your control.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background flex flex-col gap-3 p-6 sm:p-7">
              <Icon className="text-primary size-5" />
              <h3 className="text-base font-medium">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const TEMPLATES = [
  {
    icon: User,
    title: 'Personal',
    desc: 'Pre-wired pages for shopping, health, travel, contacts, and journaling so you can start tracking life on day one.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Work',
    desc: 'Meeting notes, project briefs, weekly reviews, and 1:1 logs — ready to fill in.',
  },
  {
    icon: Folder,
    title: 'Blank',
    desc: 'A single welcome note and nothing else. Build your own structure from scratch.',
  },
]

function TemplatesSection() {
  return (
    <section id="templates" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mb-12 flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-primary mb-3 text-sm font-medium uppercase tracking-widest">
              Templates
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Start with a shape, not a blank page.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              Pick a template when you create your vault and Caedora seeds it
              with example notes you can edit, rename, or delete. Or start
              blank and grow your own structure.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TEMPLATES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6"
            >
              <Icon className="text-primary size-5" />
              <h3 className="text-base font-medium">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-8 text-sm">
          Every template is just markdown files in your vault — rearrange them
          however you like.
        </p>
      </div>
    </section>
  )
}

function ShowcaseAlternating() {
  const rows = [
    {
      label: 'caedora.app — editor',
      eyebrow: 'Editor',
      title: 'A markdown editor that gets out of the way.',
      body:
        'Rich-text feel, plain-markdown source. Frontmatter, slash commands, and wiki links work out of the box.',
      reverse: false,
    },
    {
      label: 'caedora.app — Argus assistant',
      eyebrow: 'Argus assistant',
      title: 'Your second brain, in your sidebar.',
      body:
        'Ask Argus to summarise yesterday, draft a meeting note, or find that idea from last March. It only sees the notes you let it.',
      reverse: true,
    },
    {
      label: 'caedora.app — graph & links',
      eyebrow: 'Connected notes',
      title: 'Knowledge that compounds.',
      body:
        'Backlinks and bidirectional references turn loose notes into a living web of context that grows with you.',
      reverse: false,
    },
  ]

  return (
    <section className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-24 sm:px-6 sm:py-32">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`flex flex-col items-center gap-10 lg:flex-row lg:gap-16 ${
              r.reverse ? 'lg:flex-row-reverse' : ''
            }`}
          >
            <div className="lg:w-5/12">
              <p className="text-primary mb-3 text-sm font-medium uppercase tracking-widest">
                {r.eyebrow}
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {r.title}
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">{r.body}</p>
            </div>
            <div className="w-full lg:w-7/12">
              <ScreenshotFrame label={r.label} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PrivacyCallout() {
  return (
    <section id="privacy" className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28">
        <div className="border-border/80 bg-card relative overflow-hidden rounded-2xl border p-8 sm:p-14">
          <div className="bg-[radial-gradient(circle_at_right,_color-mix(in_oklch,_var(--landing-accent)_22%,_transparent)_0%,_transparent_55%)] pointer-events-none absolute inset-0" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Lock className="text-primary mb-5 size-6" />
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                We literally cannot read your notes.
              </h2>
              <p className="text-muted-foreground mt-5 text-base leading-relaxed">
                Caedora has no backend that touches your content. Files write
                directly from your browser or desktop app into the folder or
                repo you chose. Tokens live in your browser&apos;s IndexedDB
                only. There&apos;s no &ldquo;sign up&rdquo; — because there&apos;s
                no account to sign up for.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/#features">
                    See features <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-5">
              {[
                ['Local folder', 'File System Access API writes straight to disk.'],
                ['GitHub repo', 'Commits land in a repo you own, with a PAT you control.'],
                ['No telemetry by default', 'Opt-in only, and never includes note contents.'],
                ['Yours to inspect', 'Run it locally, audit how your notes are handled.'],
              ].map(([h, b]) => (
                <li key={h} className="flex gap-4">
                  <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                  <div>
                    <p className="font-medium">{h}</p>
                    <p className="text-muted-foreground text-sm">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function ArgusSection() {
  return (
    <section id="argus" className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="max-w-2xl">
          <p className="text-primary mb-3 text-sm font-medium uppercase tracking-widest">
            Argus
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            An AI that knows your notes — and only your notes.
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            Argus runs inside Caedora and reads from your vault, not the
            internet. Bring your own API key, or use any MCP-compatible
            assistant through caedora-mcp.
          </p>
        </div>
        <div className="w-full max-w-4xl">
          <ScreenshotFrame label="caedora.app — Argus chat" aspect="aspect-[16/9]" />
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 py-24 text-center sm:px-6 sm:py-32">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Start your vault in 30 seconds.
        </h2>
        <p className="text-muted-foreground max-w-xl text-base">
          Open the web version right now, or grab the desktop app for your platform.
        </p>
        <CtaButtons size="xl" />
      </div>
    </section>
  )
}

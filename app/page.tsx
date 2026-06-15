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
import { Reveal } from '@/components/landing/reveal'
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
        <Reveal>
          <LogoStrip />
        </Reveal>
        <Reveal>
          <FeatureGrid />
        </Reveal>
        <Reveal>
          <TemplatesSection />
        </Reveal>
        <Reveal>
          <ShowcaseAlternating />
        </Reveal>
        <Reveal>
          <PrivacyCallout />
        </Reveal>
        <Reveal>
          <ArgusSection />
        </Reveal>
        <Reveal>
          <FinalCta />
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="caedora-hero-orb" aria-hidden="true" />
        <div className="caedora-hero-orb caedora-hero-orb--alt" aria-hidden="true" />
        <div className="caedora-hero-noise" aria-hidden="true" />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24">
        <Image
          src="/caedora-logo.png"
          alt="Caedora"
          width={160}
          height={160}
          priority
          className="mb-8 size-32 sm:size-40"
        />

        <Badge variant="outline" className="mb-6 gap-1.5 rounded-full px-3 py-1">
          <Sparkles className="text-primary size-3" />
          <span className="text-xs">Open Knowledge Format workspace</span>
        </Badge>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Your knowledge,
          <span className="text-primary"> open and entirely yours.</span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-balance text-base leading-relaxed sm:text-lg">
          Caedora is a private workspace for Open Knowledge Format bundles.
          Concepts combine structured YAML metadata with readable Markdown,
          living only in your own folder or GitHub repository.
        </p>

        <CtaButtons size="xl" className="mt-10" />

        <p className="text-muted-foreground mt-6 text-xs">
          Free, works offline · No account required
        </p>

        <Reveal delay={200} className="mt-16 w-full">
          <ScreenshotFrame
            label="caedora.app - bundle overview"
            src="/landing/hero.png"
            alt="Caedora showing an OKF concept with Argus AI in the sidebar"
          />
        </Reveal>
      </div>
    </section>
  )
}

function LogoStrip() {
  const items = ['OKF v0.1', 'Markdown', 'YAML', 'GitHub', 'MCP', 'Local-first']
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
      'Concepts write directly to a folder on your machine or a GitHub repository you own. Nothing routes through our infrastructure.',
  },
  {
    icon: Bot,
    title: 'Argus AI, built-in',
    body:
      'A desktop assistant that queries your bundle, drafts conformant concepts, and follows its OKF conventions and optional agent rules.',
  },
  {
    icon: FolderTree,
    title: 'Open Knowledge Format',
    body:
      'Portable Markdown concepts with YAML metadata, path-based identity, hierarchical indexes, and an append-only log.',
  },
  {
    icon: Wifi,
    title: 'Works offline',
    body:
      'Local-first by default. Open and edit your bundle offline; sync happens when you reconnect.',
  },
  {
    icon: Search,
    title: 'Progressive discovery',
    body:
      'Search metadata and content, browse generated indexes, filter by type or tag, and follow backlinks through the concept graph.',
  },
  {
    icon: Sparkles,
    title: 'MCP-ready',
    body:
      'Expose your bundle to MCP-aware tools for query, ingest, validation, graph traversal, and conformant maintenance.',
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
            A knowledge system people and agents can share.
          </h2>
          <p className="text-muted-foreground mt-4 text-base">
            Every design choice in Caedora starts from one rule: your content
            never leaves your control, while the format remains portable.
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
    desc: 'Meeting records, project briefs, weekly reviews, and decision logs, ready to fill in.',
  },
  {
    icon: Folder,
    title: 'Blank',
    desc: 'One welcome concept and one generated root index. Build your own concept graph from there.',
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
              Start minimal, expand intentionally.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              Every new bundle starts with one conformant welcome concept and
              one generated root index. Import optional domain templates later
              when they solve a real need.
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

        <p className="text-muted-foreground mt-8 mb-10 text-sm">
          Every template is an ordinary OKF bundle. Use the same files in any
          Markdown editor or compatible agent.
        </p>

        <ScreenshotFrame
          label="caedora.app — template marketplace"
          src="/landing/templates.png"
          alt="Caedora template marketplace showing Fitness, Reading, Daily journal and other templates"
        />
      </div>
    </section>
  )
}

function ShowcaseAlternating() {
  const rows = [
    {
      label: 'caedora.app — editor',
      src: '/landing/editor.png',
      alt: 'Welcome concept showing structured metadata and Markdown content',
      eyebrow: 'Editor',
      title: 'Structured metadata, readable content.',
      body:
        'Edit title, type, description, tags, resource, and timestamp as first-class fields while the body remains portable Markdown.',
      reverse: false,
    },
    {
      label: 'caedora.app — Argus AI',
      src: '/landing/argus.png',
      alt: 'Argus AI chat in the Caedora sidebar',
      eyebrow: 'Argus AI',
      title: 'An agent that understands the bundle contract.',
      body:
        'Ask Argus AI to synthesize a topic, ingest a source, or maintain cross-links. It only sees the bundle you connect.',
      reverse: true,
    },
    {
      label: 'caedora.app - connected concepts',
      src: '/landing/connected.png',
      alt: 'Caedora showing backlinks and connected concepts',
      eyebrow: 'Connected concepts',
      title: 'A navigable concept graph.',
      body:
        'Path-based concept IDs, Markdown links, backlinks, hierarchical indexes, and logs preserve context as the bundle grows.',
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
              <ScreenshotFrame label={r.label} src={r.src} alt={r.alt} />
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
                We cannot read your knowledge bundle.
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
                ['No telemetry by default', 'Opt-in only, and never includes concept contents.'],
                ['Yours to inspect', 'Run it locally and audit how your bundle is handled.'],
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
            Argus AI
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            An AI that knows your bundle and follows its rules.
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            Argus AI runs inside Caedora and reads from your bundle, not the
            internet. Bring your own API key, or use any MCP-compatible
            assistant through caedora-mcp.
          </p>
        </div>
        <div className="w-full max-w-4xl">
          <ScreenshotFrame
            label="caedora.app — Argus AI chat"
            src="/landing/argus.png"
            alt="Argus AI chat in the Caedora sidebar"
            aspect="aspect-[16/9]"
          />
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
          Start an open knowledge bundle in 30 seconds.
        </h2>
        <p className="text-muted-foreground max-w-xl text-base">
          Open the web version right now, or grab the desktop app for your platform.
        </p>
        <CtaButtons size="xl" />
      </div>
    </section>
  )
}

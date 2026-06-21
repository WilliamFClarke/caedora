'use client'

import { useState } from 'react'
import { Apple, Download, Globe, Monitor, Terminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { ConnectDialog } from '@/components/connect-dialog'
import { useOs, OS_LABELS } from '@/components/landing/use-os'
import { DESKTOP_DOWNLOADS, RELEASES_URL } from '@/lib/downloads'
import { cn } from '@/lib/utils'

type PlatformId = 'macos' | 'windows' | 'linux'

const PLATFORMS: {
  id: PlatformId
  icon: typeof Apple
  title: string
  subtitle: string
  variants: { label: string; note: string; href?: string }[]
}[] = [
  {
    id: 'macos',
    icon: Apple,
    title: 'macOS',
    subtitle: 'macOS 12 Monterey or later',
    variants: [
      DESKTOP_DOWNLOADS.macos.appleSilicon,
      { label: 'Intel (.dmg)', note: 'Older Intel-based Macs' },
    ],
  },
  {
    id: 'windows',
    icon: Monitor,
    title: 'Windows',
    subtitle: 'Windows 10 / 11 · 64-bit',
    variants: [
      { label: 'Installer (.exe)', note: 'Recommended for most users' },
      { label: 'Portable (.zip)', note: 'No installation required' },
    ],
  },
  {
    id: 'linux',
    icon: Terminal,
    title: 'Linux',
    subtitle: 'Ubuntu, Fedora, Arch, and other modern distros',
    variants: [
      { label: 'AppImage', note: 'Works on most distros' },
      { label: 'Deb (.deb)', note: 'Debian / Ubuntu' },
    ],
  },
]

export default function DownloadPage() {
  const detected = useOs()
  const [connectOpen, setConnectOpen] = useState(false)

  return (
    <div className="landing-theme bg-background text-foreground min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div className="mb-16 max-w-2xl">
          <Badge variant="outline" className="mb-5 rounded-full px-3 py-1 text-xs">
            Downloads
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Get Caedora for{' '}
            <span className="text-primary">
              {detected === 'unknown' || detected === 'mobile'
                ? 'your platform'
                : OS_LABELS[detected]}
            </span>
            .
          </h1>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            Download the native macOS app for Apple Silicon, or use the full
            Caedora experience right in your browser. Your concepts still write
            straight to your own folder or GitHub repo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => setConnectOpen(true)}>
              <Globe className="size-4" />
              Start now instead
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.id} platform={p} highlighted={detected === p.id} />
          ))}
        </div>

      </main>

      <SiteFooter />

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} mode="create" />
    </div>
  )
}

function PlatformCard({
  platform,
  highlighted,
}: {
  platform: (typeof PLATFORMS)[number]
  highlighted: boolean
}) {
  const Icon = platform.icon
  return (
    <Card
      className={cn(
        'flex flex-col gap-0 transition',
        highlighted && 'border-primary/60 ring-primary/20 ring-2'
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className="size-6" />
          {highlighted && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              Detected
            </Badge>
          )}
        </div>
        <CardTitle className="mt-4 text-xl">{platform.title}</CardTitle>
        <CardDescription>{platform.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {platform.variants.map((v) => (
          <Button
            key={v.label}
            variant="outline"
            asChild={Boolean(v.href)}
            disabled={!v.href}
            aria-disabled={!v.href}
            title={v.href ? `Download ${v.label}` : 'Coming soon'}
            className="h-auto w-full justify-start gap-3 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-100"
          >
            {v.href ? (
              <a href={v.href}>
                <Download className="size-4" />
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{v.label}</span>
                  <span className="text-muted-foreground text-xs">{v.note}</span>
                </span>
              </a>
            ) : (
              <>
                <Download className="size-4" />
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{v.label}</span>
                  <span className="text-muted-foreground text-xs">{v.note}</span>
                </span>
              </>
            )}
          </Button>
        ))}
        <p className="text-muted-foreground mt-2 text-xs">
          {platform.id === 'macos' ? (
            <>
              Downloads are served from{' '}
              <a className="underline underline-offset-4" href={RELEASES_URL}>
                GitHub Releases
              </a>
              .
            </>
          ) : (
            'Coming soon.'
          )}
        </p>
      </CardContent>
    </Card>
  )
}

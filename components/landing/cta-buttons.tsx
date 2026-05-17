'use client'

import { useState } from 'react'
import { ArrowRight, ChevronDown, Download, FolderOpen, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConnectDialog } from '@/components/connect-dialog'
import { useOs, OS_LABELS, type Os } from './use-os'
import { DESKTOP_DOWNLOADS } from '@/lib/downloads'
import { cn } from '@/lib/utils'

type Size = 'lg' | 'xl'

interface CtaButtonsProps {
  size?: Size
  className?: string
  showDownloadOnly?: boolean
}

const DOWNLOAD_OPTIONS: { id: Exclude<Os, 'unknown' | 'mobile'>; label: string }[] = [
  { id: 'macos', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
]

export function CtaButtons({ size = 'lg', className, showDownloadOnly }: CtaButtonsProps) {
  const detected = useOs()
  const [override, setOverride] = useState<Os | null>(null)
  const [connectMode, setConnectMode] = useState<'create' | 'open' | null>(null)

  const chosen: Os = override ?? (detected === 'mobile' || detected === 'unknown' ? 'macos' : detected)
  const downloadLabel = `Download for ${OS_LABELS[chosen]}`
  const isMobile = detected === 'mobile'
  const downloadHref =
    chosen === 'macos' ? DESKTOP_DOWNLOADS.macos.appleSilicon.href : undefined

  const sizeClasses = size === 'xl' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-sm'

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center', className)}>
      {!showDownloadOnly && (
        <>
          <Button
            size="lg"
            onClick={() => setConnectMode('create')}
            className={cn(sizeClasses, 'group w-full sm:w-auto')}
          >
            <Globe className="size-4" />
            Try in browser
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setConnectMode('open')}
            className={cn(sizeClasses, 'group w-full sm:w-auto')}
          >
            <FolderOpen className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" />
            Open existing vault
          </Button>
        </>
      )}

      <div className="group/dl inline-flex w-full overflow-hidden rounded-md border bg-background shadow-xs sm:w-auto">
        <Button
          variant="outline"
          size="lg"
          asChild={Boolean(downloadHref)}
          disabled={!downloadHref}
          aria-disabled={!downloadHref}
          title={downloadHref ? 'Download Apple Silicon macOS app' : 'Coming soon'}
          className={cn(
            sizeClasses,
            'flex-1 rounded-none border-0 bg-transparent shadow-none hover:bg-accent disabled:opacity-100 disabled:cursor-not-allowed sm:flex-none'
          )}
        >
          {downloadHref ? (
            <a href={downloadHref}>
              <Download className="size-4 transition-transform duration-300 group-hover/dl:translate-y-0.5" />
              {downloadLabel}
            </a>
          ) : (
            <>
              <Download className="size-4 transition-transform duration-300 group-hover/dl:translate-y-0.5" />
              {downloadLabel}
            </>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Choose a different platform"
              className="group/chev h-auto rounded-none border-0 border-l bg-transparent shadow-none hover:bg-accent"
            >
              <ChevronDown className="size-4 transition-transform duration-300 group-hover/chev:translate-y-0.5 data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {DOWNLOAD_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.id} onSelect={() => setOverride(opt.id)}>
                {opt.label}
                {chosen === opt.id && (
                  <span className="text-muted-foreground ml-auto text-xs">selected</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isMobile && !showDownloadOnly && (
        <p className="text-muted-foreground w-full text-center text-xs sm:hidden">
          On mobile? Use the browser version above.
        </p>
      )}

      <ConnectDialog
        open={connectMode !== null}
        onOpenChange={(open) => !open && setConnectMode(null)}
        mode={connectMode ?? 'create'}
      />
    </div>
  )
}

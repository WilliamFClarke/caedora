import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreenshotFrameProps {
  label: string
  /** Path under /public, e.g. /landing/hero.png. When missing the placeholder is rendered. */
  src?: string
  alt?: string
  /** Tailwind aspect ratio class, defaults to 16/10. */
  aspect?: string
  className?: string
}

/**
 * Renders an app screenshot with a chrome-like frame. Until a `src` is
 * supplied the box is a labelled placeholder so the marketing team knows
 * which image to drop where.
 */
export function ScreenshotFrame({
  label,
  src,
  alt,
  aspect = 'aspect-[16/10]',
  className,
}: ScreenshotFrameProps) {
  return (
    <div
      className={cn(
        'border-border/80 bg-card relative w-full overflow-hidden rounded-xl border shadow-2xl',
        className
      )}
    >
      <div className="border-border/60 bg-muted/60 flex items-center gap-1.5 border-b px-3 py-2">
        <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span className="text-muted-foreground ml-3 font-mono text-[10px] tracking-wide">
          {label}
        </span>
      </div>
      <div className={cn('bg-background relative w-full', aspect)}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? label} className="h-full w-full object-cover" />
        ) : (
          <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <ImageIcon className="size-8" />
            <p className="text-sm font-medium">Screenshot placeholder</p>
            <p className="font-mono text-xs opacity-70">{label}</p>
          </div>
        )}
      </div>
    </div>
  )
}

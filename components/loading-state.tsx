import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  title: string
  detail?: string
  className?: string
}

/** A centred spinner with a message, announced to screen readers as a status. */
export function LoadingState({ title, detail, className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-4 px-6 text-center', className)}
    >
      <Loader2 className="text-primary size-8 animate-spin" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
      </div>
    </div>
  )
}

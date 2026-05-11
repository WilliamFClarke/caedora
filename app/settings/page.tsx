'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/lib/settings-context'
import { SYNC_INTERVAL_OPTIONS } from '@/lib/settings'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-12">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure how Caedora saves and syncs your notes.
        </p>
      </div>

      {/* ── Auto-sync ── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">Sync</h2>
          <p className="text-muted-foreground text-xs">
            Controls when your edits are written to your vault.
          </p>
        </div>

        <div className="border-border flex flex-col gap-px overflow-hidden rounded-lg border">
          {/* Auto toggle */}
          <button
            type="button"
            onClick={() =>
              updateSettings({
                syncMode: settings.syncMode === 'auto' ? 'manual' : 'auto',
              })
            }
            className="bg-card hover:bg-accent/50 flex items-center justify-between px-4 py-3 transition-colors"
          >
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-sm font-medium">Auto-sync</span>
              <span className="text-muted-foreground text-xs">
                Automatically save and commit changes while you type.
              </span>
            </div>
            {settings.syncMode === 'auto' ? (
              <ToggleRight className="text-primary size-6 shrink-0" />
            ) : (
              <ToggleLeft className="text-muted-foreground size-6 shrink-0" />
            )}
          </button>

          {/* Sync interval — only shown when auto is on */}
          {settings.syncMode === 'auto' && (
            <div className="bg-card flex flex-col gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="text-muted-foreground size-3.5" />
                Sync every
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SYNC_INTERVAL_OPTIONS.map(({ label, ms }) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => updateSettings({ syncIntervalMs: ms })}
                    className={cn(
                      'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      settings.syncIntervalMs === ms
                        ? 'border-primary bg-primary/5 text-foreground font-medium'
                        : 'border-border text-muted-foreground hover:bg-accent/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                <strong className="text-foreground">GitHub vaults:</strong> each sync creates a
                commit. Lower intervals = more commits in your repo history.
                <br />
                <strong className="text-foreground">Local vaults:</strong> the file is saved every
                ~1 s regardless; this controls how often a git commit is made.
              </p>
            </div>
          )}
        </div>

        {settings.syncMode === 'manual' && (
          <div className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Auto-sync is off. Use the{' '}
              <strong>Sync</strong> button in the sidebar to manually save and commit your
              changes.
            </span>
          </div>
        )}
      </section>
    </div>
  )
}

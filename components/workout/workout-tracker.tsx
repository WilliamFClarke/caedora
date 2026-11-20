'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  CloudOff,
  Dumbbell,
  Loader2,
  Footprints,
  Pencil,
  Play,
  Plus,
  Smartphone,
  Timer,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { parseDataset, type Dataset } from '@/lib/dataset'
import { isWriteConflict } from '@/lib/storage/conflict'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'
import { matchWorkout } from '@/lib/deep-link'
import {
  commitDraft,
  dayOn,
  describeSession,
  describeSet,
  draftSetsFor,
  exercisesOn,
  findWorkoutSources,
  commitRuns,
  describeRun,
  formatCountdown,
  formatPace,
  formatElapsed,
  knownExercises,
  lastSessionFor,
  localDate,
  nextSetNumber,
  parseEntry,
  removeDraftSet,
  restSecondsFor,
  reviewDraft,
  setsFor,
  workoutTemplates,
  type DraftRun,
  type DraftSet,
  type LoggedSet,
  type PlannedExercise,
  type WorkoutDraft,
  type WorkoutSources,
  type WorkoutTemplate,
} from '@/lib/workout'
import {
  clearDraft,
  loadCachedFiles,
  loadDraft,
  saveCachedFiles,
  saveDraft,
} from '@/lib/workout-store'
import {
  cancelRestAlert,
  currentRestAlertState,
  disableRestAlerts,
  enableRestAlerts,
  scheduleRestAlert,
  type RestAlertState,
} from '@/lib/rest-alerts'

type Stage = 'pick' | 'session' | 'review' | 'saved'

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; sources: WorkoutSources; logRaw: string; fromCache: boolean }

interface Saved {
  label: string
  sets: number
  exercises: number
  runs: number
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "3 sets", "1 run" or "3 sets and 1 run". */
function describeCounts(sets: number, runs: number): string {
  if (runs === 0) return plural(sets, 'set')
  if (sets === 0) return plural(runs, 'run')
  return `${plural(sets, 'set')} and ${plural(runs, 'run')}`
}

const runsOf = (draft: WorkoutDraft) => draft.runs ?? []

/**
 * The workout tracker. Sets are kept on the device as they are logged, so a
 * workout carries on with no signal and survives a reload. Finishing shows
 * the whole workout to check, then adds it to the vault's training log as one
 * change, waiting for the connection to come back when it has to.
 */
export function WorkoutTracker({
  open,
  onOpenChange,
  provider,
  vaultKey,
  datasetPaths,
  onLogChanged,
  linkedWorkout = null,
  onLinkChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A planned workout a link asked for, by day value or label, shown first. */
  linkedWorkout?: string | null
  /** Called with the workout the tracker is on, so the address bar can link to it. */
  onLinkChange?: (workout: string | null) => void
  provider: VaultProvider
  /** Identifies the vault, so each vault keeps its own workout in progress. */
  vaultKey: string
  /** Every Dataset in the vault; the tracker finds its training log among them. */
  datasetPaths: string[]
  /** Called once the dialog closes after a workout was added to the vault. */
  onLogChanged?: () => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const [stage, setStage] = useState<Stage>('pick')
  const [saved, setSaved] = useState<Saved | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [waitingForSignal, setWaitingForSignal] = useState(false)
  const [storeError, setStoreError] = useState(false)
  const [changed, setChanged] = useState(false)
  const online = useOnline()
  const pathsKey = datasetPaths.join('\n')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoaded({ state: 'loading' })
    setSaved(null)
    setSaveError(null)
    void (async () => {
      const [stored, cached] = await Promise.all([loadDraft(vaultKey), loadCachedFiles(vaultKey)])
      const paths = pathsKey ? pathsKey.split('\n') : []
      const read = await Promise.all(
        paths.map(async (path) => {
          try {
            const raw = await provider.readFile(path, { fresh: true })
            return { raw, dataset: parseDataset(path, raw) }
          } catch {
            return null
          }
        })
      )
      const found = read.filter((item) => item !== null)
      let sources = findWorkoutSources(found.map((item) => item.dataset))
      let logRaw = sources ? (found.find((item) => item.dataset.path === sources?.log.path)?.raw ?? null) : null
      let fromCache = false
      if ((!sources || logRaw === null) && cached) {
        // No signal: start from the copy saved the last time the tracker opened.
        const copies = Object.entries(cached.files).map(([path, raw]) => parseDataset(path, raw))
        sources = findWorkoutSources(copies)
        logRaw = sources ? (cached.files[sources.log.path] ?? null) : null
        fromCache = true
      }
      if (cancelled) return
      if (!sources || logRaw === null) {
        setLoaded({ state: 'missing' })
        return
      }
      if (!fromCache) {
        const keep = [sources.log, sources.programme, sources.nextSession, sources.conditioning].map((item) => item?.path)
        const files = Object.fromEntries(
          found.filter((item) => keep.includes(item.dataset.path)).map((item) => [item.dataset.path, item.raw])
        )
        void saveCachedFiles(vaultKey, files)
      }
      setLoaded({ state: 'ready', sources, logRaw, fromCache })
      if (stored && stored.logPath === sources.log.path) {
        setDraft(stored.draft)
        setStage('session')
      } else {
        setDraft(null)
        setStage('pick')
      }
    })().catch((error: unknown) => {
      if (!cancelled) setLoaded({ state: 'error', message: messageOf(error) })
    })
    return () => {
      cancelled = true
    }
  }, [open, provider, pathsKey, vaultKey])

  const logPath = loaded.state === 'ready' ? loaded.sources.log.path : null

  // The address bar names the workout in progress, else the one a link asked for.
  const draftDay = draft?.day ?? null
  useEffect(() => {
    if (!open || loaded.state === 'loading') return
    onLinkChange?.(draftDay ?? linkedWorkout ?? null)
  }, [open, loaded.state, draftDay, linkedWorkout, onLinkChange])

  // Every change to the workout is written to the device straight away.
  const updateDraft = useCallback(
    (next: WorkoutDraft | null) => {
      setDraft(next)
      if (!logPath) return
      const write = next ? saveDraft(vaultKey, { logPath, draft: next, savedAt: Date.now() }) : clearDraft(vaultKey)
      write.then(
        () => setStoreError(false),
        () => setStoreError(true)
      )
    },
    [logPath, vaultKey]
  )

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next && changed) {
      setChanged(false)
      onLogChanged?.()
    }
  }

  const log = useMemo(
    () => (loaded.state === 'ready' ? parseDataset(loaded.sources.log.path, loaded.logRaw) : null),
    [loaded]
  )

  // What has already gone into the vault when saving stops part way, so a retry never adds it twice.
  const savedSoFar = useRef<Saved | null>(null)

  const saveToVault = useCallback(async () => {
    if (loaded.state !== 'ready' || !draft) return
    const { log: logSource, conditioning } = loaded.sources
    setSaving(true)
    setSaveError(null)

    const write = async (path: string, build: (raw: string) => { content: string; message: string }) => {
      let result = { content: '', message: '' }
      for (let attempt = 0; ; attempt++) {
        const raw = await provider.readFile(path, { fresh: true })
        result = build(raw)
        try {
          await provider.writeFile(path, result.content, { baseContent: raw, message: result.message })
          break
        } catch (error) {
          // Someone else committed in between: add the same rows to theirs.
          if (!isWriteConflict(error) || attempt > 0) throw error
        }
      }
      if (!provider.writesAreCommits) await provider.commit(result.message, [path])
      return result.content
    }

    if (runsOf(draft).length > 0 && !conditioning) {
      setSaving(false)
      setSaveError('There is no conditioning log in this vault to save the run to.')
      return
    }
    let current = draft
    const summary = savedSoFar.current ?? { label: draft.label, sets: 0, exercises: 0, runs: 0 }
    try {
      if (current.sets.length > 0) {
        const content = await write(logSource.path, (raw) => commitDraft(logSource.path, raw, current))
        setLoaded((state) => (state.state === 'ready' ? { ...state, logRaw: content, fromCache: false } : state))
        summary.sets += current.sets.length
        summary.exercises += new Set(current.sets.map((item) => item.exercise.toLowerCase())).size
        current = { ...current, sets: [] }
        savedSoFar.current = summary
        updateDraft(current)
      }
      const runs = runsOf(current)
      if (runs.length > 0 && conditioning) {
        await write(conditioning.path, (raw) => commitRuns(conditioning.path, raw, current))
        summary.runs += runs.length
        current = { ...current, runs: [] }
        savedSoFar.current = summary
      }
      savedSoFar.current = null
      setSaved(summary)
      setWaitingForSignal(false)
      setChanged(true)
      updateDraft(null)
      setStage('saved')
    } catch (error) {
      if (!navigator.onLine || error instanceof TypeError) {
        // Most likely no signal. The workout stays on the device and goes up when the connection is back.
        setWaitingForSignal(true)
      } else {
        setSaveError(messageOf(error))
      }
    } finally {
      setSaving(false)
    }
  }, [draft, loaded, provider, updateDraft])

  useEffect(() => {
    if (online && waitingForSignal && stage === 'review' && !saving) void saveToVault()
  }, [online, waitingForSignal, stage, saving, saveToVault])

  const ready = loaded.state === 'ready' && log

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        data-testid="workout-tracker"
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          // Full screen on a phone, including in-app web views, and a centred panel on larger screens.
          'top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0',
          'sm:top-[50%] sm:left-[50%] sm:h-[min(56rem,calc(100dvh-3rem))] sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border',
          '[&>button:last-child]:top-[calc(env(safe-area-inset-top)+1rem)] [&>button:last-child]:right-4'
        )}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {ready && draft && stage === 'session' ? (
          <SessionView
            draft={draft}
            sources={loaded.sources}
            log={log}
            online={online}
            storeError={storeError}
            onChange={updateDraft}
            onBack={() => setStage('pick')}
            onFinish={() => {
              setSaveError(null)
              setStage('review')
            }}
          />
        ) : ready && draft && stage === 'review' ? (
          <ReviewView
            draft={draft}
            log={log}
            logTitle={loaded.sources.log.title}
            runsTitle={loaded.sources.conditioning?.title ?? null}
            online={online}
            saving={saving}
            waitingForSignal={waitingForSignal}
            error={saveError}
            onChange={updateDraft}
            onBack={() => setStage('session')}
            onSave={() => void saveToVault()}
          />
        ) : (
          <>
            <Header title="Workout" description="Log each set as you go. Everything is kept on this device until you finish." />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {loaded.state === 'loading' && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Reading your training log
                </p>
              )}
              {loaded.state === 'error' && <p className="text-destructive text-sm">{loaded.message}</p>}
              {loaded.state === 'missing' && <MissingLog online={online} />}
              {ready && stage === 'saved' && saved && (
                <SavedView
                  saved={saved}
                  title={loaded.sources.log.title}
                  runsTitle={loaded.sources.conditioning?.title ?? null}
                  onDone={() => close(false)} onAgain={() => setStage('pick')} />
              )}
              {ready && stage !== 'saved' && (
                <Picker
                  linkedWorkout={linkedWorkout}
                  sources={loaded.sources}
                  log={log}
                  draft={draft}
                  fromCache={loaded.fromCache}
                  onResume={() => setStage('session')}
                  onReview={() => setStage('review')}
                  onDiscard={() => updateDraft(null)}
                  onStart={(next) => {
                    updateDraft(next)
                    setStage('session')
                  }}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function Header({
  title,
  description,
  back,
  children,
}: {
  title: string
  description: string
  back?: { label: string; onClick: () => void }
  children?: React.ReactNode
}) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-b px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pr-14 pb-3 backdrop-blur sm:px-6 sm:pr-14">
      <div className="flex items-center gap-2">
        {back && (
          <Button type="button" size="icon" variant="ghost" className="-ml-2 size-9 shrink-0" aria-label={back.label} onClick={back.onClick}>
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-lg font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="truncate text-xs">{description}</DialogDescription>
        </div>
      </div>
      {children}
    </header>
  )
}

function StatusPill({ online, storeError }: { online: boolean; storeError?: boolean }) {
  if (storeError) {
    return (
      <span className="bg-destructive/10 text-destructive inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
        <TriangleAlert className="size-3" />
        Not saving on this device
      </span>
    )
  }
  return online ? (
    <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
      <Smartphone className="size-3" />
      Saved on this device
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
      <CloudOff className="size-3" />
      Offline, saved on this device
    </span>
  )
}

function MissingLog({ online }: { online: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{online ? 'No training log found' : 'You are offline'}</p>
      <p className="text-muted-foreground">
        {online
          ? 'Add a Dataset with date, exercise, set, kg, reps and rir columns, one row per set. A programme Dataset with day and exercise columns adds ready made workouts to pick from.'
          : 'Open the workout tracker once with a connection so it can keep a copy of your programme on this device.'}
      </p>
    </div>
  )
}

function estimateMinutes(template: WorkoutTemplate): number {
  const seconds = template.exercises.reduce(
    (total, item) => total + (item.sets ?? 3) * (restSecondsFor(item) + 45),
    0
  )
  return Math.max(5, Math.round(seconds / 300) * 5)
}

function Picker({
  linkedWorkout,
  sources,
  log,
  draft,
  fromCache,
  onStart,
  onResume,
  onReview,
  onDiscard,
}: {
  linkedWorkout: string | null
  sources: WorkoutSources
  log: Dataset
  draft: WorkoutDraft | null
  fromCache: boolean
  onStart: (draft: WorkoutDraft) => void
  onResume: () => void
  onReview: () => void
  onDiscard: () => void
}) {
  const [date, setDate] = useState(localDate)
  const templates = useMemo(() => workoutTemplates(sources), [sources])
  const linked = useMemo(
    () => (linkedWorkout ? matchWorkout(templates, linkedWorkout) : null),
    [templates, linkedWorkout]
  )
  const today = exercisesOn(log, date)
  const begin = (fields: Pick<WorkoutDraft, 'day' | 'label' | 'exercises'>) =>
    onStart({ date, ...fields, sets: [], startedAt: Date.now() })

  const carryOn = () => {
    const day = dayOn(log, date)
    const template = templates.find((item) => item.day === day)
    const planned = template?.exercises ?? []
    const extra = today
      .filter((name) => !planned.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ name }))
    begin({ day: template?.day ?? null, label: template?.label ?? 'Workout', exercises: [...planned, ...extra] })
  }

  return (
    <div className="flex flex-col gap-6">
      {fromCache && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <CloudOff className="mt-0.5 size-3.5 shrink-0" />
          No connection, so this is the copy of your programme saved on this device. Your workout will go to the vault when you are back online.
        </p>
      )}

      {draft && (
        <section aria-label="Workout in progress" className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-2xl border p-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">In progress</p>
            <p className="mt-0.5 text-base font-semibold">{draft.label}</p>
            <p className="text-muted-foreground text-xs">
              {formatDate(draft.date)} · {describeCounts(draft.sets.length, runsOf(draft).length)} not yet in the vault
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-10 flex-1" onClick={onResume}>
              Resume workout
            </Button>
            {draft.sets.length + runsOf(draft).length > 0 && (
              <Button type="button" variant="outline" className="h-10 flex-1" onClick={onReview}>
                Review and save
              </Button>
            )}
            <Button type="button" variant="ghost" className="text-muted-foreground h-10" onClick={onDiscard}>
              Discard
            </Button>
          </div>
        </section>
      )}

      {!draft && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">What are you training?</h2>
              <p className="text-muted-foreground text-sm">Pick a day from your programme or start from scratch.</p>
            </div>
            <label className="text-muted-foreground flex shrink-0 flex-col gap-1 text-xs font-medium">
              Date
              <Input
                type="date"
                value={date}
                onChange={(event) => event.target.value && setDate(event.target.value)}
                className="h-9 w-[9.5rem] text-sm"
              />
            </label>
          </div>

          {linkedWorkout && !linked && (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-sm">
              There is no workout called {linkedWorkout} in your programme. Pick one below.
            </p>
          )}

          {linked && (
            <section
              aria-label={`Linked workout: ${linked.label}`}
              className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-2xl border p-4"
            >
              <div>
                <h3 className="text-base font-semibold">{linked.label}</h3>
                <p className="text-muted-foreground flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="size-3.5" />
                    {linked.exercises.length} exercises
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    About {estimateMinutes(linked)} min
                  </span>
                </p>
              </div>
              <ol className="flex flex-col gap-1 text-sm">
                {linked.exercises.map((item) => (
                  <li key={item.name} className="flex justify-between gap-3">
                    <span>{item.name}</span>
                    {(item.sets || item.reps) && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {[item.sets ? `${item.sets} sets` : null, item.reps].filter(Boolean).join(' of ')}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                className="h-11"
                onClick={() => begin({ day: linked.day, label: linked.label, exercises: linked.exercises })}
              >
                <Play className="size-4 fill-current" />
                Start {linked.label}
              </Button>
            </section>
          )}

          {today.length > 0 && (
            <button
              type="button"
              onClick={carryOn}
              className="hover:bg-accent flex flex-col items-start gap-1 rounded-2xl border border-dashed p-4 text-left transition-colors"
            >
              <span className="font-medium">Continue this session</span>
              <span className="text-muted-foreground text-sm">
                {today.length} exercise{today.length === 1 ? '' : 's'} already in the vault: {today.join(', ')}
              </span>
            </button>
          )}

          <section className="flex flex-col gap-3" aria-label="Planned workouts">
            {linked && templates.length > 1 && (
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Other workouts</h3>
            )}
            {templates.length === 0 ? (
              <p className="text-muted-foreground text-sm">No programme found. Start an empty workout and add exercises as you go.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {templates.filter((template) => template !== linked).map((template) => (
                  <li key={template.day}>
                    <button
                      type="button"
                      aria-label={`Start ${template.label}`}
                      onClick={() => begin({ day: template.day, label: template.label, exercises: template.exercises })}
                      className="group bg-card hover:border-primary/50 hover:bg-accent/40 flex h-full w-full flex-col gap-3 rounded-2xl border p-4 text-left shadow-xs transition-colors active:scale-[0.99]"
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-base font-semibold">{template.label}</span>
                        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full transition-transform group-hover:scale-105">
                          <Play className="ml-0.5 size-3.5 fill-current" />
                        </span>
                      </span>
                      <span className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Dumbbell className="size-3.5" />
                          {template.exercises.length} exercises
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          About {estimateMinutes(template)} min
                        </span>
                      </span>
                      <span className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {template.exercises.map((item) => item.name).join(' · ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => begin({ day: null, label: 'Workout', exercises: [] })}
            >
              <Plus className="size-4" />
              Start empty workout
            </Button>
            {sources.conditioning && (
              <Button type="button" variant="outline" className="h-11" onClick={() => begin({ day: null, label: 'Run', exercises: [] })}>
                <Footprints className="size-4" />
                Log a run
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface RestState {
  exercise: string
  /** Planned rest in seconds, before any adjustment. */
  total: number
  /** When the rest ends, as a timestamp, so the countdown survives the phone sleeping. */
  endsAt: number
}

function SessionView({
  draft,
  sources,
  log,
  online,
  storeError,
  onChange,
  onBack,
  onFinish,
}: {
  draft: WorkoutDraft
  sources: WorkoutSources
  log: Dataset
  online: boolean
  storeError: boolean
  onChange: (draft: WorkoutDraft) => void
  onBack: () => void
  onFinish: () => void
}) {
  const [adding, setAdding] = useState('')
  const [rest, setRest] = useState<RestState | null>(null)
  const now = useNow(1000)
  const alerts = useRestAlerts(rest)
  const runs = runsOf(draft)
  // A workout started from Log a run opens straight on the run form.
  const [runFormOpen, setRunFormOpen] = useState(
    () => draft.label === 'Run' && draft.exercises.length === 0 && draft.sets.length === 0 && runs.length === 0
  )
  const known = useMemo(() => knownExercises(sources), [sources])
  // Every exercise the programme plans, so one added on the day still gets its rest time and target.
  const planned = useMemo(() => {
    const map = new Map<string, PlannedExercise>()
    for (const template of workoutTemplates(sources)) {
      for (const item of template.exercises) {
        if (!map.has(item.name.toLowerCase())) map.set(item.name.toLowerCase(), item)
      }
    }
    return map
  }, [sources])

  const countFor = (name: string) => setsFor(log, draft.date, name).length + draftSetsFor(draft, name).length
  const plannedSets = draft.exercises.reduce((total, item) => total + (item.sets ?? 0), 0)
  const doneSets = draft.exercises.reduce((total, item) => total + Math.min(item.sets ?? 0, countFor(item.name)), 0)
  const current = draft.exercises.findIndex((item) => countFor(item.name) < (item.sets ?? 1))

  const addExercise = () => {
    const name = adding.trim()
    if (!name) return
    setAdding('')
    if (draft.exercises.some((item) => item.name.toLowerCase() === name.toLowerCase())) return
    const canonical = known.find((item) => item.toLowerCase() === name.toLowerCase()) ?? name
    const plan = planned.get(canonical.toLowerCase()) ?? { name: canonical }
    onChange({ ...draft, exercises: [...draft.exercises, plan] })
  }

  const logSet = (exercise: PlannedExercise, values: Pick<DraftSet, 'kg' | 'reps' | 'rir'>) => {
    const set: DraftSet = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      exercise: exercise.name,
      set: nextSetNumber(log, draft, exercise.name),
      ...values,
      muscle: exercise.muscle ?? planned.get(exercise.name.toLowerCase())?.muscle ?? null,
      loggedAt: Date.now(),
    }
    onChange({ ...draft, sets: [...draft.sets, set] })
    const seconds = restSecondsFor({ ...planned.get(exercise.name.toLowerCase()), ...exercise })
    setRest({ exercise: exercise.name, total: seconds, endsAt: Date.now() + seconds * 1000 })
  }

  return (
    <>
      <Header
        title={draft.label}
        description={`${formatDate(draft.date)} · ${describeCounts(draft.sets.length, runs.length)} logged`}
        back={{ label: 'Back to workouts', onClick: onBack }}
      >
        <div className="mt-2 flex items-center gap-3">
          <p className="flex shrink-0 items-center gap-1 text-sm font-medium" title="Time since the workout started">
            <Clock className="text-muted-foreground size-4" aria-hidden />
            <span role="timer" aria-label="Workout time" aria-live="off" className="tabular-nums">
              {formatElapsed(now - draft.startedAt)}
            </span>
          </p>
          {plannedSets > 0 ? (
            <div
              className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Workout progress"
              aria-valuemin={0}
              aria-valuemax={plannedSets}
              aria-valuenow={doneSets}
            >
              <div className="bg-primary h-full rounded-full transition-[width] duration-300" style={{ width: `${(doneSets / plannedSets) * 100}%` }} />
            </div>
          ) : (
            <span className="flex-1" />
          )}
          <RestAlertButton alerts={alerts} />
          <StatusPill online={online} storeError={storeError} />
        </div>
        {alerts.note && (
          <p role="status" className="text-muted-foreground mt-2 flex items-start gap-2 text-xs">
            <span className="flex-1">{alerts.note}</span>
            <button type="button" className="hover:text-foreground shrink-0 underline" onClick={alerts.clearNote}>
              OK
            </button>
          </p>
        )}
      </Header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
        <ol className="flex flex-col gap-3">
          {draft.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.name}
              number={index + 1}
              current={index === current}
              exercise={exercise}
              saved={setsFor(log, draft.date, exercise.name)}
              pending={draftSetsFor(draft, exercise.name)}
              lastTime={lastSessionFor(log, exercise.name, draft.date)}
              onLog={(values) => logSet(exercise, values)}
              onEditSet={(id, values) =>
                onChange({ ...draft, sets: draft.sets.map((item) => (item.id === id ? { ...item, ...values } : item)) })
              }
              onDeleteSet={(id) => onChange(removeDraftSet(draft, id))}
              onRemove={() =>
                onChange({
                  ...draft,
                  exercises: draft.exercises.filter((item) => item !== exercise),
                  sets: draft.sets.filter((item) => item.exercise.toLowerCase() !== exercise.name.toLowerCase()),
                })
              }
            />
          ))}
        </ol>
        {draft.exercises.length === 0 && runs.length === 0 && !runFormOpen && (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
            <Dumbbell className="size-6" />
            Add your first exercise to start logging.
          </div>
        )}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addExercise()
          }}
        >
          <Input
            aria-label="Exercise to add"
            placeholder="Add an exercise"
            list="workout-exercises"
            value={adding}
            onChange={(event) => setAdding(event.target.value)}
            className="h-11 text-base"
          />
          <datalist id="workout-exercises">
            {known.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Button type="submit" variant="outline" className="h-11" disabled={!adding.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
        {sources.conditioning && (
          <RunsSection
            runs={runs}
            title={sources.conditioning.title}
            formOpen={runFormOpen}
            onFormOpenChange={setRunFormOpen}
            onAdd={(run) => {
              onChange({ ...draft, runs: [...runs, run] })
              setRunFormOpen(false)
            }}
            onRemove={(id) => onChange({ ...draft, runs: runs.filter((item) => item.id !== id) })}
          />
        )}
      </div>

      {rest && <RestTimer rest={rest} onChange={setRest} />}
      <footer className="border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
        <Button type="button" className="h-12 w-full text-base" disabled={draft.sets.length === 0 && runs.length === 0} onClick={onFinish}>
          Finish workout
        </Button>
      </footer>
    </>
  )
}

const ROW = 'grid grid-cols-[1.75rem_minmax(0,1fr)_4.25rem_3.5rem_3rem_2.5rem] items-center gap-1.5 sm:gap-2'

function ExerciseCard({
  number,
  current,
  exercise,
  saved,
  pending,
  lastTime,
  onLog,
  onEditSet,
  onDeleteSet,
  onRemove,
}: {
  number: number
  current: boolean
  exercise: PlannedExercise
  /** Sets of this exercise already in the vault for the day. */
  saved: LoggedSet[]
  /** Sets logged in this workout, kept on the device. */
  pending: DraftSet[]
  lastTime: LoggedSet[]
  onLog: (values: Pick<DraftSet, 'kg' | 'reps' | 'rir'>) => void
  onEditSet: (id: string, values: Pick<DraftSet, 'kg' | 'reps' | 'rir'>) => void
  onDeleteSet: (id: string) => void
  onRemove: () => void
}) {
  const nextSet = Math.max(0, ...saved.map((item) => item.set), ...pending.map((item) => item.set)) + 1
  const previousFor = (set: number) => lastTime.find((item) => item.set === set) ?? lastTime[lastTime.length - 1]
  const latest = pending[pending.length - 1] ?? saved[saved.length - 1] ?? previousFor(nextSet)
  const [kg, setKg] = useState(latest?.kg != null ? String(latest.kg) : '')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState(latest?.rir != null ? String(latest.rir) : '')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const done = exercise.sets !== undefined && saved.length + pending.length >= exercise.sets
  const [collapsed, setCollapsed] = useState(false)
  const expanded = !done || !collapsed
  const id = `exercise-${exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const ghosts = Math.max(0, (exercise.sets ?? 0) - nextSet)
  const chips = [
    exercise.sets ? `${exercise.sets} × ${exercise.reps ?? 'sets'}` : exercise.reps ? `${exercise.reps} reps` : null,
    exercise.rir ? `RIR ${exercise.rir}` : null,
    `Rest ${formatCountdown(restSecondsFor(exercise))}`,
  ].filter((item): item is string => Boolean(item))

  const submit = () => {
    const values = { kg: parseEntry(kg), reps: parseEntry(reps), rir: parseEntry(rir) }
    if (values.reps === null) return setError('Enter the reps for this set.')
    setError(null)
    onLog(values)
    setReps('')
  }

  return (
    <li
      aria-labelledby={id}
      className={cn(
        'bg-card rounded-2xl border shadow-xs transition-colors',
        current && 'border-primary/50 ring-primary/15 ring-2',
        done && 'bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3 p-3 pb-2 sm:p-4 sm:pb-2">
        <span
          className={cn(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
            done ? 'bg-primary text-primary-foreground' : current ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
          aria-hidden
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={id} className="text-[15px] leading-snug font-semibold">
            {exercise.name}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((chip) => (
              <span key={chip} className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-medium">
                {chip}
              </span>
            ))}
            {!expanded && (
              <span className="text-muted-foreground px-1 text-[11px]">
                {describeSession([...saved, ...pending.map((item) => ({ ...item, index: -1, date: '', note: null }))])}
              </span>
            )}
          </div>
        </div>
        {done && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground -mt-1 size-8 shrink-0"
            aria-label={expanded ? `Hide sets of ${exercise.name}` : `Show sets of ${exercise.name}`}
            aria-expanded={expanded}
            onClick={() => setCollapsed((value) => !value)}
          >
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground -mt-1 -mr-1 size-8 shrink-0"
          aria-label={`Remove ${exercise.name} from this workout`}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          {(exercise.target || exercise.cue) && (
            <div className="text-muted-foreground mb-3 space-y-0.5 pl-10 text-xs leading-relaxed">
              {exercise.target && <p>{exercise.target}</p>}
              {exercise.cue && <p className="italic">{exercise.cue}</p>}
            </div>
          )}

          <div className={cn(ROW, 'text-muted-foreground px-1 pb-1 text-[10px] font-semibold tracking-wider uppercase')} aria-hidden>
            <span className="text-center">Set</span>
            <span>Last time</span>
            <span className="text-center">kg</span>
            <span className="text-center">Reps</span>
            <span className="text-center">RIR</span>
            <span />
          </div>

          <ul className="flex flex-col gap-1" aria-label={`${exercise.name} sets`}>
            {saved.map((item) => (
              <li key={`saved-${item.set}`} className={cn(ROW, 'rounded-lg px-1 py-1.5 text-sm')}>
                <span className="text-muted-foreground text-center text-xs font-semibold">{item.set}</span>
                <span className="text-muted-foreground truncate text-xs">In vault</span>
                <span className="text-center tabular-nums">{item.kg ?? ''}</span>
                <span className="text-center tabular-nums">{item.reps ?? ''}</span>
                <span className="text-center tabular-nums">{item.rir ?? ''}</span>
                <span className="text-primary grid place-items-center">
                  <Check className="size-4" />
                </span>
              </li>
            ))}
            {pending.map((item) =>
              editing === item.id ? (
                <EditSetRow
                  key={item.id}
                  set={item}
                  exercise={exercise.name}
                  onCancel={() => setEditing(null)}
                  onDelete={() => {
                    setEditing(null)
                    onDeleteSet(item.id)
                  }}
                  onSave={(values) => {
                    setEditing(null)
                    onEditSet(item.id, values)
                  }}
                />
              ) : (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-label={`Edit set ${item.set} of ${exercise.name}: ${describeSet(item)}`}
                    onClick={() => setEditing(item.id)}
                    className={cn(ROW, 'bg-primary/10 hover:bg-primary/15 w-full rounded-lg px-1 py-1.5 text-left text-sm')}
                  >
                    <span className="text-center text-xs font-semibold">{item.set}</span>
                    <span className="text-muted-foreground truncate text-xs">{previousLabel(previousFor(item.set))}</span>
                    <span className="text-center font-medium tabular-nums">{item.kg ?? ''}</span>
                    <span className="text-center font-medium tabular-nums">{item.reps ?? ''}</span>
                    <span className="text-center font-medium tabular-nums">{item.rir ?? ''}</span>
                    <span className="text-primary grid place-items-center">
                      <Pencil className="size-3.5" />
                    </span>
                  </button>
                </li>
              )
            )}
          </ul>

          <form
            className={cn(ROW, 'mt-1 px-1')}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <span className="text-center text-xs font-semibold">{nextSet}</span>
            <span className="text-muted-foreground truncate text-xs">{previousLabel(previousFor(nextSet))}</span>
            <SetInput label={`${exercise.name} kg`} value={kg} onChange={setKg} decimal />
            <SetInput label={`${exercise.name} reps`} value={reps} onChange={setReps} />
            <SetInput label={`${exercise.name} reps in reserve`} value={rir} onChange={setRir} />
            <Button type="submit" size="icon" className="size-10 rounded-lg" aria-label={`Log set ${nextSet} of ${exercise.name}`}>
              <Check className="size-5" />
            </Button>
          </form>
          {Array.from({ length: ghosts }, (_, index) => nextSet + index + 1).map((set) => (
            <div key={`ghost-${set}`} className={cn(ROW, 'text-muted-foreground/60 mt-1 px-1 py-1.5 text-xs')} aria-hidden>
              <span className="text-center font-semibold">{set}</span>
              <span className="truncate">{previousLabel(previousFor(set))}</span>
              <span className="text-center">·</span>
              <span className="text-center">·</span>
              <span className="text-center">·</span>
              <span />
            </div>
          ))}
          {error && (
            <p role="alert" className="text-destructive mt-2 pl-10 text-xs">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function previousLabel(set: LoggedSet | undefined): string {
  if (!set) return '·'
  const load = set.kg === null ? '' : set.kg === 0 ? 'BW' : `${set.kg}`
  return load && set.reps !== null ? `${load} × ${set.reps}` : set.reps !== null ? `${set.reps} reps` : load
}

function EditSetRow({
  set,
  exercise,
  onSave,
  onCancel,
  onDelete,
}: {
  set: DraftSet
  exercise: string
  onSave: (values: Pick<DraftSet, 'kg' | 'reps' | 'rir'>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [kg, setKg] = useState(set.kg != null ? String(set.kg) : '')
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '')
  const [rir, setRir] = useState(set.rir != null ? String(set.rir) : '')
  return (
    <li className="bg-muted/60 rounded-lg px-1 py-2">
      <form
        className={ROW}
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ kg: parseEntry(kg), reps: parseEntry(reps), rir: parseEntry(rir) })
        }}
      >
        <span className="text-center text-xs font-semibold">{set.set}</span>
        <span className="flex gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive size-8"
            aria-label={`Delete set ${set.set} of ${exercise}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Cancel editing" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </span>
        <SetInput label={`Set ${set.set} kg`} value={kg} onChange={setKg} decimal />
        <SetInput label={`Set ${set.set} reps`} value={reps} onChange={setReps} />
        <SetInput label={`Set ${set.set} reps in reserve`} value={rir} onChange={setRir} />
        <Button type="submit" size="icon" className="size-10 rounded-lg" aria-label={`Save set ${set.set} of ${exercise}`}>
          <Check className="size-5" />
        </Button>
      </form>
    </li>
  )
}

function SetInput({
  label,
  value,
  onChange,
  decimal = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  decimal?: boolean
}) {
  return (
    <Input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      className="bg-background h-10 rounded-lg px-1 text-center text-base font-medium tabular-nums"
      autoComplete="off"
    />
  )
}

/** The current time, updated on an interval, so on screen timers tick. */
function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, interval)
    // Catch up straight away when the phone wakes, rather than on the next tick.
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [interval])
  return now
}

const ALERT_NOTES: Partial<Record<RestAlertState, string>> = {
  on: 'Rest alerts are on. Your phone will notify you when a rest ends while Caedora is in the background.',
  denied: 'Notifications are blocked for Caedora. Allow them in your browser or phone settings to get rest alerts.',
  'install-ios':
    'On iPhone and iPad, rest alerts need Caedora on your Home Screen. In Safari tap Share, then Add to Home Screen, and open Caedora from there.',
  unsupported: 'This browser cannot show notifications, so the rest timer will beep and buzz only while the tracker is open.',
}

/** Rest alert setting for the session, and a notification scheduled for each rest while it is on. */
function useRestAlerts(rest: RestState | null) {
  const [state, setState] = useState<RestAlertState>('off')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void currentRestAlertState().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const endsAt = rest?.endsAt ?? null
  const exercise = rest?.exercise ?? null
  useEffect(() => {
    if (state !== 'on') return
    if (endsAt !== null && exercise !== null && endsAt > Date.now()) void scheduleRestAlert(endsAt, exercise)
    else void cancelRestAlert()
  }, [state, endsAt, exercise])

  // Leaving the workout drops the rest timer, so its alert goes too.
  useEffect(() => () => void cancelRestAlert(), [])

  const toggle = async () => {
    setBusy(true)
    try {
      if (state === 'on') {
        setState(await disableRestAlerts())
        setNote(null)
        return
      }
      const next = await enableRestAlerts()
      setState(next)
      setNote(ALERT_NOTES[next] ?? null)
    } catch {
      setNote('Rest alerts could not be turned on in this browser.')
    } finally {
      setBusy(false)
    }
  }

  return { state, note, busy, toggle, clearNote: () => setNote(null) }
}

function RestAlertButton({ alerts }: { alerts: ReturnType<typeof useRestAlerts> }) {
  const on = alerts.state === 'on'
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn('-my-1 size-8 shrink-0', on ? 'text-primary' : 'text-muted-foreground')}
      aria-label={on ? 'Turn off rest alerts' : 'Turn on rest alerts'}
      aria-pressed={on}
      title={on ? 'Rest alerts on' : 'Get a notification when a rest ends'}
      disabled={alerts.busy}
      onClick={() => void alerts.toggle()}
    >
      {on ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </Button>
  )
}

/** Counts down the rest after a set, then buzzes and beeps when it is time for the next one. */
function RestTimer({ rest, onChange }: { rest: RestState; onChange: (rest: RestState | null) => void }) {
  const [now, setNow] = useState(() => Date.now())
  const alerted = useRef<number | null>(null)
  const remaining = Math.max(0, (rest.endsAt - now) / 1000)
  const over = remaining <= 0

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [rest.endsAt])

  useEffect(() => {
    if (!over || alerted.current === rest.endsAt) return
    alerted.current = rest.endsAt
    alertRestOver()
  }, [over, rest.endsAt])

  const adjust = (seconds: number) => onChange({ ...rest, endsAt: Math.max(Date.now(), rest.endsAt + seconds * 1000) })
  const progress = Math.min(1, remaining / Math.max(1, rest.total))

  return (
    <section aria-label="Rest timer" className={cn('relative border-t px-4 py-3 sm:px-6', over ? 'bg-primary/10' : 'bg-muted/60')}>
      <div className="absolute inset-x-0 top-0 h-0.5" aria-hidden>
        <div className="bg-primary h-full transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Timer className={cn('size-5 shrink-0', over ? 'text-primary' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-xs">{over ? 'Rest over, time for the next set' : `Rest after ${rest.exercise}`}</p>
          <p role="timer" aria-live="off" className="text-3xl leading-tight font-semibold tabular-nums">
            {formatCountdown(remaining)}
          </p>
        </div>
        {!over && (
          <>
            <Button type="button" size="sm" variant="outline" className="h-10 px-2.5" onClick={() => adjust(-15)} aria-label="15 seconds less rest">
              −15
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-10 px-2.5" onClick={() => adjust(15)} aria-label="15 seconds more rest">
              +15
            </Button>
          </>
        )}
        <Button type="button" size="sm" className="h-10" variant={over ? 'default' : 'ghost'} onClick={() => onChange(null)}>
          {over ? 'Dismiss' : 'Skip'}
        </Button>
      </div>
    </section>
  )
}

/** A short buzz and two beeps, where the browser allows them. */
function alertRestOver() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // Vibration is optional.
  }
  try {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    for (const start of [0, 0.25]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.2, context.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + start + 0.2)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(context.currentTime + start)
      oscillator.stop(context.currentTime + start + 0.2)
    }
    window.setTimeout(() => void context.close(), 800)
  } catch {
    // Sound is optional too.
  }
}

/** Runs logged in this workout, and the form to add one. */
function RunsSection({
  runs,
  title,
  formOpen,
  onFormOpenChange,
  onAdd,
  onRemove,
}: {
  runs: DraftRun[]
  title: string
  formOpen: boolean
  onFormOpenChange: (open: boolean) => void
  onAdd: (run: DraftRun) => void
  onRemove: (id: string) => void
}) {
  return (
    <section aria-label="Runs" className="mt-6 flex flex-col gap-3">
      {runs.length > 0 && (
        <div className="bg-card rounded-2xl border p-3 shadow-xs sm:p-4">
          <h3 className="text-[15px] font-semibold">{runs.length === 1 ? 'Run' : 'Runs'}</h3>
          <p className="text-muted-foreground text-xs">Goes to {title} when you finish</p>
          <RunList runs={runs} onRemove={onRemove} />
        </div>
      )}
      {formOpen ? (
        <RunForm title={title} onAdd={onAdd} onCancel={() => onFormOpenChange(false)} />
      ) : (
        <Button type="button" variant="outline" className="h-11" onClick={() => onFormOpenChange(true)}>
          <Footprints className="size-4" />
          Add a run
        </Button>
      )}
    </section>
  )
}

function RunList({ runs, onRemove }: { runs: DraftRun[]; onRemove: (id: string) => void }) {
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
          <Footprints className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="tabular-nums">{describeRun(run)}</span>
            {run.note && <span className="text-muted-foreground block truncate text-xs">{run.note}</span>}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground size-8 shrink-0"
            aria-label={`Remove run: ${describeRun(run)}`}
            onClick={() => onRemove(run.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Time, distance and heart rate for a run outdoors or on a treadmill. Pace is worked out for you. */
function RunForm({ title, onAdd, onCancel }: { title: string; onAdd: (run: DraftRun) => void; onCancel: () => void }) {
  const [treadmill, setTreadmill] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const time = parseEntry(minutes)
  const km = parseEntry(distance)
  const pace = formatPace(time, km)

  const submit = () => {
    const hr = parseEntry(heartRate)
    if (time === null || time <= 0) return setError('Enter how many minutes you ran.')
    if (distance.trim() && (km === null || km <= 0)) return setError('Distance should be a number of kilometres, such as 5 or 5.2.')
    if (heartRate.trim() && (hr === null || hr < 30 || hr > 250)) return setError('Average heart rate should be in beats per minute.')
    onAdd({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      treadmill,
      minutes: time,
      distanceKm: km,
      avgHr: hr,
      note: note.trim() || null,
      loggedAt: Date.now(),
    })
  }

  return (
    <form
      aria-label="Log a run"
      className="bg-card flex flex-col gap-3 rounded-2xl border p-3 shadow-xs sm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">Log a run</h3>
        <div className="bg-muted flex rounded-lg p-0.5" role="group" aria-label="Where you ran">
          {[
            ['Outdoor', false],
            ['Treadmill', true],
          ].map(([label, value]) => (
            <button
              key={String(label)}
              type="button"
              aria-pressed={treadmill === value}
              onClick={() => setTreadmill(value as boolean)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                treadmill === value ? 'bg-background shadow-xs' : 'text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-medium">
          Minutes
          <Input inputMode="decimal" aria-label="Run minutes" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="h-11 text-base" />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-medium">
          Distance (km)
          <Input inputMode="decimal" aria-label="Run distance in km" value={distance} onChange={(event) => setDistance(event.target.value)} className="h-11 text-base" />
        </label>
        <label className="text-muted-foreground flex flex-col gap-1 text-xs font-medium">
          Avg HR
          <Input inputMode="numeric" aria-label="Run average heart rate" value={heartRate} onChange={(event) => setHeartRate(event.target.value)} className="h-11 text-base" />
        </label>
      </div>
      <Input
        aria-label="Run notes"
        placeholder={treadmill ? 'Notes, such as 1% incline' : 'Notes, such as the route'}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="h-11 text-base"
      />
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {pace ? `Pace ${pace}` : 'Add a distance to see your pace.'} Saved to {title} when you finish.
      </p>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1">
          Log run
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function ReviewView({
  draft,
  log,
  logTitle,
  runsTitle,
  online,
  saving,
  waitingForSignal,
  error,
  onChange,
  onBack,
  onSave,
}: {
  draft: WorkoutDraft
  log: Dataset
  logTitle: string
  runsTitle: string | null
  online: boolean
  saving: boolean
  waitingForSignal: boolean
  error: string | null
  onChange: (draft: WorkoutDraft) => void
  onBack: () => void
  onSave: () => void
}) {
  const all = reviewDraft(draft, log)
  // Exercises with nothing logged today are listed together, so the sets to save stay easy to scan.
  const review = all.filter((item) => item.sets.length > 0)
  const skipped = all.filter((item) => item.sets.length === 0 && item.notes.includes('Not done'))
  const [editing, setEditing] = useState<string | null>(null)
  const volume = draft.sets.reduce((total, item) => total + (item.kg ?? 0) * (item.reps ?? 0), 0)
  const runs = runsOf(draft)
  const lastLogged = Math.max(draft.startedAt, ...draft.sets.map((item) => item.loggedAt), ...runs.map((item) => item.loggedAt))
  const minutes = Math.max(1, Math.round((lastLogged - draft.startedAt) / 60000))
  const waiting = waitingForSignal || !online
  const distance = runs.reduce((total, item) => total + (item.distanceKm ?? 0), 0)
  const runMinutes = runs.reduce((total, item) => total + item.minutes, 0)
  const stats =
    draft.sets.length === 0 && runs.length > 0
      ? [
          ['Runs', String(runs.length)],
          ['Distance', `${Math.round(distance * 100) / 100} km`],
          ['Time', `${runMinutes} min`],
        ]
      : [
          ['Sets', String(draft.sets.length)],
          ['Volume', `${Math.round(volume).toLocaleString('en-GB')} kg`],
          ['Time', `${minutes} min`],
        ]
  const target = draft.sets.length > 0 && runs.length > 0 ? 'your vault' : draft.sets.length > 0 ? logTitle : (runsTitle ?? logTitle)

  return (
    <>
      <Header title="Check your workout" description={`${draft.label} · ${formatDate(draft.date)}`} back={{ label: 'Back to workout', onClick: onBack }} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
        <dl className="mb-4 grid grid-cols-3 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-muted/50 rounded-xl px-3 py-2.5">
              <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <ol className="flex flex-col gap-3" aria-label="Exercises to save">
          {review.map((item) => (
            <li key={item.exercise} className="bg-card rounded-2xl border p-3 shadow-xs sm:p-4">
              <h3 className="text-[15px] font-semibold">{item.exercise}</h3>
              {item.notes.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {item.notes.map((note) => (
                    <li key={note} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              {item.sets.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1" aria-label={`${item.exercise} sets to save`}>
                  {item.sets.map((set) =>
                    editing === set.id ? (
                      <EditSetRow
                        key={set.id}
                        set={set}
                        exercise={item.exercise}
                        onCancel={() => setEditing(null)}
                        onDelete={() => {
                          setEditing(null)
                          onChange(removeDraftSet(draft, set.id))
                        }}
                        onSave={(values) => {
                          setEditing(null)
                          onChange({ ...draft, sets: draft.sets.map((entry) => (entry.id === set.id ? { ...entry, ...values } : entry)) })
                        }}
                      />
                    ) : (
                      <li key={set.id}>
                        <button
                          type="button"
                          aria-label={`Edit set ${set.set} of ${item.exercise}: ${describeSet(set)}`}
                          onClick={() => setEditing(set.id)}
                          className="hover:bg-muted/60 flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm"
                        >
                          <span className="text-muted-foreground w-12 shrink-0 text-xs">Set {set.set}</span>
                          <span className="flex-1 tabular-nums">{describeSet(set)}</span>
                          <Pencil className="text-muted-foreground size-3.5" />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </li>
          ))}
        </ol>
        {skipped.length > 0 && (
          <p className="text-muted-foreground mt-3 flex items-start gap-1.5 px-1 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
            Not done: {skipped.map((item) => item.exercise).join(', ')}
          </p>
        )}
        {runs.length > 0 && (
          <section aria-label="Runs to save" className="bg-card mt-3 rounded-2xl border p-3 shadow-xs sm:p-4">
            <h3 className="text-[15px] font-semibold">{runs.length === 1 ? 'Run' : 'Runs'}</h3>
            <RunList runs={runs} onRemove={(id) => onChange({ ...draft, runs: runs.filter((item) => item.id !== id) })} />
          </section>
        )}
      </div>
      <footer className="flex flex-col gap-2 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
        {waiting && (
          <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <CloudOff className="mt-0.5 size-3.5 shrink-0" />
            No connection. Your workout is safe on this device and will be added to {target} as soon as you are back online.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
        <Button type="button" className="h-12 w-full text-base" disabled={saving || waiting || draft.sets.length + runs.length === 0} onClick={onSave}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {waiting ? 'Waiting for connection' : `Save ${describeCounts(draft.sets.length, runs.length)} to ${target}`}
        </Button>
      </footer>
    </>
  )
}

function SavedView({
  saved,
  title,
  runsTitle,
  onDone,
  onAgain,
}: {
  saved: Saved
  title: string
  runsTitle: string | null
  onDone: () => void
  onAgain: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="bg-primary text-primary-foreground grid size-14 place-items-center rounded-full">
        <Check className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{saved.label} saved</h2>
        <p className="text-muted-foreground text-sm">
          {saved.sets > 0 && `${plural(saved.sets, 'set')} across ${plural(saved.exercises, 'exercise')} added to ${title}.`}
          {saved.sets > 0 && saved.runs > 0 && ' '}
          {saved.runs > 0 && `${plural(saved.runs, 'run')} added to ${runsTitle ?? 'your conditioning log'}.`}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button type="button" className="h-11" onClick={onDone}>
          Done
        </Button>
        <Button type="button" variant="ghost" onClick={onAgain}>
          Start another
        </Button>
      </div>
    </div>
  )
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

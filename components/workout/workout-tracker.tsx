'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Dumbbell, Loader2, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseDataset } from '@/lib/dataset'
import { isWriteConflict } from '@/lib/storage/conflict'
import type { VaultProvider } from '@/lib/types'
import {
  dayOn,
  deleteSet,
  describeSession,
  describeSet,
  editSet,
  exercisesOn,
  findWorkoutSources,
  knownExercises,
  lastSessionFor,
  localDate,
  logSet,
  parseEntry,
  setsFor,
  workoutTemplates,
  type LoggedSet,
  type PlannedExercise,
  type WorkoutSources,
  type WorkoutTemplate,
} from '@/lib/workout'

interface Session {
  date: string
  /** The programme day, or null for an empty workout. */
  day: string | null
  label: string
  exercises: PlannedExercise[]
}

type Stage =
  | { kind: 'pick' }
  | { kind: 'session'; session: Session }
  | { kind: 'done'; label: string; sets: number; exercises: number }

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ready'; sources: WorkoutSources; logRaw: string }

/**
 * Starts a workout from the programme or from scratch and logs each set to
 * the vault's training log as it is done, one commit per set, so nothing is
 * lost if the phone locks between sets.
 */
export function WorkoutTracker({
  open,
  onOpenChange,
  provider,
  datasetPaths,
  onLogChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: VaultProvider
  /** Every Dataset in the vault; the tracker finds its training log among them. */
  datasetPaths: string[]
  /** Called once the dialog closes after any set was written. */
  onLogChanged?: () => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [stage, setStage] = useState<Stage>({ kind: 'pick' })
  const [changed, setChanged] = useState(false)
  const pathsKey = datasetPaths.join('\n')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoaded({ state: 'loading' })
    setStage({ kind: 'pick' })
    const paths = pathsKey ? pathsKey.split('\n') : []
    Promise.all(
      paths.map(async (path) => {
        try {
          return parseDataset(path, await provider.readFile(path, { fresh: true }))
        } catch {
          return null
        }
      })
    )
      .then(async (datasets) => {
        const sources = findWorkoutSources(datasets.filter((item) => item !== null))
        if (cancelled) return
        if (!sources) return setLoaded({ state: 'missing' })
        const logRaw = await provider.readFile(sources.log.path, { fresh: true })
        if (!cancelled) setLoaded({ state: 'ready', sources, logRaw })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoaded({ state: 'error', message: messageOf(error) })
      })
    return () => {
      cancelled = true
    }
  }, [open, provider, pathsKey])

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next && changed) {
      setChanged(false)
      onLogChanged?.()
    }
  }

  // Re-reads the log, applies one change and writes it as its own commit.
  const write: Write = async (change) => {
    if (loaded.state !== 'ready') return
    const path = loaded.sources.log.path
    let result = { content: '', message: '' }
    for (let attempt = 0; ; attempt++) {
      const raw = await provider.readFile(path, { fresh: true })
      result = change(path, raw)
      try {
        await provider.writeFile(path, result.content, { baseContent: raw, message: result.message })
        break
      } catch (error) {
        // Someone else committed in between: apply the same change to theirs.
        if (!isWriteConflict(error) || attempt > 0) throw error
      }
    }
    if (!provider.writesAreCommits) await provider.commit(result.message, [path])
    const content = result.content
    setLoaded((current) => (current.state === 'ready' ? { ...current, logRaw: content } : current))
    setChanged(true)
  }

  const log = useMemo(
    () => (loaded.state === 'ready' ? parseDataset(loaded.sources.log.path, loaded.logRaw) : null),
    [loaded]
  )

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 p-0 sm:h-[calc(100dvh-4rem)] sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        {loaded.state === 'ready' && log && stage.kind === 'session' ? (
          <SessionView
            session={stage.session}
            sources={loaded.sources}
            log={log}
            write={write}
            onChange={(session) => setStage({ kind: 'session', session })}
            onBack={() => setStage({ kind: 'pick' })}
            onFinish={(sets, exercises) =>
              setStage({ kind: 'done', label: stage.session.label, sets, exercises })
            }
          />
        ) : (
          <>
            <DialogHeader className="border-b px-5 py-4 pr-12">
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="size-5" />
                Workout
              </DialogTitle>
              <DialogDescription>
                {loaded.state === 'ready'
                  ? `Sets are saved to ${loaded.sources.log.title} as you log them.`
                  : 'Log each set as you go, straight into your vault.'}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loaded.state === 'loading' && (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Reading your training log
                </p>
              )}
              {loaded.state === 'error' && <p className="text-destructive text-sm">{loaded.message}</p>}
              {loaded.state === 'missing' && <MissingLog />}
              {loaded.state === 'ready' && log && stage.kind === 'pick' && (
                <Picker
                  sources={loaded.sources}
                  log={log}
                  onStart={(session) => setStage({ kind: 'session', session })}
                />
              )}
              {stage.kind === 'done' && (
                <div className="flex flex-col items-start gap-3">
                  <h3 className="text-lg font-semibold">{stage.label} finished</h3>
                  <p className="text-muted-foreground text-sm">
                    {stage.sets} set{stage.sets === 1 ? '' : 's'} across {stage.exercises} exercise
                    {stage.exercises === 1 ? '' : 's'} saved to your training log.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => close(false)}>
                      Done
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setStage({ kind: 'pick' })}>
                      Start another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MissingLog() {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">No training log found</p>
      <p className="text-muted-foreground">
        Add a Dataset with date, exercise, set, kg, reps and rir columns, one row per set. A programme Dataset
        with day and exercise columns adds ready made workouts to pick from.
      </p>
    </div>
  )
}

function Picker({
  sources,
  log,
  onStart,
}: {
  sources: WorkoutSources
  log: ReturnType<typeof parseDataset>
  onStart: (session: Session) => void
}) {
  const [date, setDate] = useState(localDate)
  const templates = useMemo(() => workoutTemplates(sources), [sources])
  const today = exercisesOn(log, date)

  const startTemplate = (template: WorkoutTemplate) =>
    onStart({ date, day: template.day, label: template.label, exercises: template.exercises })

  const resume = () => {
    const day = dayOn(log, date)
    const template = templates.find((item) => item.day === day)
    const planned = template?.exercises ?? []
    const extra = today
      .filter((name) => !planned.some((item) => item.name.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ name }))
    onStart({
      date,
      day: template?.day ?? null,
      label: template?.label ?? 'Workout',
      exercises: [...planned, ...extra],
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
        Date
        <Input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
      </label>

      {today.length > 0 && (
        <button
          type="button"
          onClick={resume}
          className="hover:bg-accent flex flex-col items-start gap-1 rounded-lg border border-dashed p-4 text-left"
        >
          <span className="font-medium">Continue this session</span>
          <span className="text-muted-foreground text-sm">
            {today.length} exercise{today.length === 1 ? '' : 's'} already logged: {today.join(', ')}
          </span>
        </button>
      )}

      <section className="flex flex-col gap-2" aria-label="Planned workouts">
        <h3 className="text-sm font-semibold">Pick a workout</h3>
        {templates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No programme found. Start an empty workout and add exercises as you go.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {templates.map((template) => (
              <li key={template.day}>
                <button
                  type="button"
                  aria-label={`Start ${template.label}`}
                  onClick={() => startTemplate(template)}
                  className="hover:bg-accent flex h-full w-full flex-col items-start gap-1 rounded-lg border p-4 text-left"
                >
                  <span className="flex w-full items-center justify-between gap-2 font-medium">
                    {template.label}
                    <Play className="text-muted-foreground size-4" />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {template.exercises.length} exercise{template.exercises.length === 1 ? '' : 's'}
                  </span>
                  <span className="text-muted-foreground line-clamp-2 text-xs">
                    {template.exercises.map((item) => item.name).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onStart({ date, day: null, label: 'Workout', exercises: [] })}
      >
        <Plus className="size-4" />
        Start empty workout
      </Button>
    </div>
  )
}

type Write = (change: (path: string, raw: string) => { content: string; message: string }) => Promise<void>

function SessionView({
  session,
  sources,
  log,
  write,
  onChange,
  onBack,
  onFinish,
}: {
  session: Session
  sources: WorkoutSources
  log: ReturnType<typeof parseDataset>
  write: Write
  onChange: (session: Session) => void
  onBack: () => void
  onFinish: (sets: number, exercises: number) => void
}) {
  const [adding, setAdding] = useState('')
  const known = useMemo(() => knownExercises(sources), [sources])
  const logged = session.exercises.map((exercise) => setsFor(log, session.date, exercise.name))
  const totalSets = logged.reduce((sum, sets) => sum + sets.length, 0)
  const doneExercises = logged.filter((sets) => sets.length > 0).length
  const muscles = useMemo(() => {
    const map = new Map<string, string>()
    for (const template of workoutTemplates(sources)) {
      for (const item of template.exercises) if (item.muscle) map.set(item.name.toLowerCase(), item.muscle)
    }
    return map
  }, [sources])

  const addExercise = () => {
    const name = adding.trim()
    if (!name) return
    setAdding('')
    if (session.exercises.some((item) => item.name.toLowerCase() === name.toLowerCase())) return
    const canonical = known.find((item) => item.toLowerCase() === name.toLowerCase()) ?? name
    onChange({ ...session, exercises: [...session.exercises, { name: canonical }] })
  }

  return (
    <>
      <DialogHeader className="border-b px-3 py-3 pr-12">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Back to workouts" onClick={onBack}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="truncate">{session.label}</DialogTitle>
            <DialogDescription>
              {formatDate(session.date)} · {totalSets} set{totalSets === 1 ? '' : 's'} logged
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
        <ol className="flex flex-col gap-3">
          {session.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.name}
              exercise={exercise}
              session={session}
              sets={logged[index]}
              lastTime={lastSessionFor(log, exercise.name, session.date)}
              muscle={exercise.muscle ?? muscles.get(exercise.name.toLowerCase()) ?? null}
              write={write}
              onRemove={() =>
                onChange({ ...session, exercises: session.exercises.filter((item) => item !== exercise) })
              }
            />
          ))}
        </ol>
        {session.exercises.length === 0 && (
          <p className="text-muted-foreground py-4 text-sm">Add the first exercise to start logging.</p>
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
          />
          <datalist id="workout-exercises">
            {known.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Button type="submit" variant="outline" disabled={!adding.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
        <p className="text-muted-foreground text-xs">Each set is saved as soon as you log it.</p>
        <Button type="button" onClick={() => onFinish(totalSets, doneExercises)}>
          Finish workout
        </Button>
      </div>
    </>
  )
}

function ExerciseCard({
  exercise,
  session,
  sets,
  lastTime,
  muscle,
  write,
  onRemove,
}: {
  exercise: PlannedExercise
  session: Session
  sets: LoggedSet[]
  lastTime: LoggedSet[]
  muscle: string | null
  write: Write
  onRemove: () => void
}) {
  const last = sets[sets.length - 1] ?? lastTime[0]
  const [kg, setKg] = useState(last?.kg != null ? String(last.kg) : '')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState(last?.rir != null ? String(last.rir) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const nextSet = sets.reduce((max, item) => Math.max(max, item.set), 0) + 1
  const plan = [
    exercise.sets ? `${exercise.sets} sets` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.rir ? `${exercise.rir} RIR` : null,
    exercise.rest ? `rest ${exercise.rest}` : null,
  ].filter(Boolean)
  const done = exercise.sets !== undefined && sets.length >= exercise.sets
  const id = `exercise-${exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const run = async (change: Parameters<Write>[0]) => {
    setBusy(true)
    setError(null)
    try {
      await write(change)
      return true
    } catch (problem) {
      setError(messageOf(problem))
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    const values = { kg: parseEntry(kg), reps: parseEntry(reps), rir: parseEntry(rir) }
    if (values.reps === null) return setError('Enter the reps for this set.')
    const ok = await run((path, raw) =>
      logSet(path, raw, {
        date: session.date,
        exercise: exercise.name,
        set: nextSet,
        ...values,
        day: session.day,
        muscle,
      })
    )
    if (ok) setReps('')
  }

  return (
    <li aria-labelledby={id} className="rounded-lg border p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 id={id} className="font-semibold">
            {exercise.name}
          </h3>
          {plan.length > 0 && <p className="text-muted-foreground text-xs">{plan.join(' · ')}</p>}
        </div>
        {done && <span className="text-primary text-xs font-medium">Done</span>}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Remove ${exercise.name} from this workout`}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>

      <dl className="mt-2 grid gap-1 text-xs">
        {exercise.target && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground shrink-0">Target</dt>
            <dd>{exercise.target}</dd>
          </div>
        )}
        {lastTime.length > 0 && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground shrink-0">Last time</dt>
            <dd>
              {describeSession(lastTime)} <span className="text-muted-foreground">({formatDate(lastTime[0].date)})</span>
            </dd>
          </div>
        )}
        {exercise.cue && (
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground shrink-0">Cue</dt>
            <dd>{exercise.cue}</dd>
          </div>
        )}
      </dl>

      {sets.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1" aria-label={`${exercise.name} sets`}>
          {sets.map((item) =>
            editing === item.set ? (
              <EditSetRow
                key={item.set}
                set={item}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                  const ok = await run((path, raw) => editSet(path, raw, item, values))
                  if (ok) setEditing(null)
                }}
              />
            ) : (
              <li key={item.set} className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                <span className="text-muted-foreground w-12 shrink-0 text-xs">Set {item.set}</span>
                <span className="flex-1 tabular-nums">{describeSet(item)}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Edit set ${item.set} of ${exercise.name}`}
                  disabled={busy}
                  onClick={() => setEditing(item.set)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Delete set ${item.set} of ${exercise.name}`}
                  disabled={busy}
                  onClick={() => void run((path, raw) => deleteSet(path, raw, item))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            )
          )}
        </ul>
      )}

      <form
        className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <NumberField label="kg" name={`${exercise.name} kg`} value={kg} onChange={setKg} decimal />
        <NumberField label="Reps" name={`${exercise.name} reps`} value={reps} onChange={setReps} />
        <NumberField label="RIR" name={`${exercise.name} reps in reserve`} value={rir} onChange={setRir} />
        <Button type="submit" disabled={busy} aria-label={`Log set ${nextSet} of ${exercise.name}`}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Log set {nextSet}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {error}
        </p>
      )}
    </li>
  )
}

function EditSetRow({
  set,
  busy,
  onSave,
  onCancel,
}: {
  set: LoggedSet
  busy: boolean
  onSave: (values: { kg: number | null; reps: number | null; rir: number | null }) => void
  onCancel: () => void
}) {
  const [kg, setKg] = useState(set.kg != null ? String(set.kg) : '')
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '')
  const [rir, setRir] = useState(set.rir != null ? String(set.rir) : '')
  return (
    <li className="rounded-md border px-2 py-2">
      <form
        className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ kg: parseEntry(kg), reps: parseEntry(reps), rir: parseEntry(rir) })
        }}
      >
        <NumberField label="kg" name={`Set ${set.set} kg`} value={kg} onChange={setKg} decimal />
        <NumberField label="Reps" name={`Set ${set.set} reps`} value={reps} onChange={setReps} />
        <NumberField label="RIR" name={`Set ${set.set} reps in reserve`} value={rir} onChange={setRir} />
        <Button type="submit" size="sm" disabled={busy}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </li>
  )
}

function NumberField({
  label,
  name,
  value,
  onChange,
  decimal = false,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  decimal?: boolean
}) {
  return (
    <label className="text-muted-foreground flex min-w-0 flex-col gap-1 text-xs">
      {label}
      <Input
        aria-label={name}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 text-base tabular-nums text-foreground"
        autoComplete="off"
      />
    </label>
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

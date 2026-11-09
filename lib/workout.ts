import {
  parseDataset,
  type Dataset,
  type DatasetColumn,
  type DatasetRow,
  type DatasetValue,
} from '@/lib/dataset'
import { appendDatasetRow, type DatasetInput } from '@/lib/dataset-edit'

/**
 * Workout tracking on top of ordinary Datasets. Nothing here is stored outside
 * the vault: a training log Dataset (one row per set) is the record, and an
 * optional programme Dataset and "next session" sheet supply the planned
 * workouts and today's targets. Columns are matched by name, so any vault
 * whose tables use names such as date, exercise, set, kg, reps and rir works.
 */

const LOAD_COLUMNS = ['kg', 'load', 'load_kg', 'weight', 'weight_kg']
const RIR_COLUMNS = ['rir', 'reps_in_reserve']
const SET_COLUMNS = ['set', 'set_number']
const E1RM_COLUMNS = ['e1rm_kg', 'e1rm']

export interface WorkoutSources {
  log: Dataset
  programme?: Dataset
  nextSession?: Dataset
}

export interface PlannedExercise {
  name: string
  sets?: number
  reps?: string
  rir?: string
  rest?: string
  /** Rest after each working set, in seconds, for the rest timer. */
  restSeconds?: number
  muscle?: string
  target?: string
  cue?: string
  note?: string
}

export interface WorkoutTemplate {
  /** The programme's day value, e.g. upper-a. */
  day: string
  label: string
  exercises: PlannedExercise[]
}

export interface LoggedSet {
  /** Row index in the training log, as parseDataset reads it. */
  index: number
  date: string
  exercise: string
  set: number
  kg: number | null
  reps: number | null
  rir: number | null
  note: string | null
}

export interface SetInput {
  date: string
  exercise: string
  set: number
  kg: number | null
  reps: number | null
  rir: number | null
  note?: string | null
  /** The programme day the set belongs to, when the workout came from one. */
  day?: string | null
  muscle?: string | null
}

function columnNames(dataset: Dataset): Set<string> {
  return new Set(dataset.schema.columns.map((column) => column.name))
}

function firstColumn(dataset: Dataset, candidates: string[]): DatasetColumn | undefined {
  for (const name of candidates) {
    const column = dataset.schema.columns.find((item) => item.name === name)
    if (column) return column
  }
  return undefined
}

/** A training log has a row per set: at least date, exercise and reps. */
export function isTrainingLog(dataset: Dataset): boolean {
  const names = columnNames(dataset)
  return names.has('date') && names.has('exercise') && names.has('reps')
}

/** A "next session" sheet plans each day's exercises with a target. */
export function isNextSessionSheet(dataset: Dataset): boolean {
  const names = columnNames(dataset)
  return names.has('day') && names.has('exercise') && names.has('target') && !names.has('date')
}

/** A programme lists each day's exercises, without dates. */
export function isProgramme(dataset: Dataset): boolean {
  const names = columnNames(dataset)
  return names.has('day') && names.has('exercise') && !names.has('date') && !names.has('target')
}

/** True for any Dataset the workout tracker reads. */
export function isWorkoutDataset(dataset: Dataset): boolean {
  return isTrainingLog(dataset) || isProgramme(dataset) || isNextSessionSheet(dataset)
}

function folderOf(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

/** Prefers the candidate in the same folder as the log, then the first by path. */
function closest(candidates: Dataset[], logPath: string): Dataset | undefined {
  const folder = folderOf(logPath)
  return candidates.find((item) => folderOf(item.path) === folder) ?? candidates[0]
}

/**
 * Picks the training log, programme and next session sheet from a vault's
 * Datasets. Returns null when there is no training log to write sets to.
 */
export function findWorkoutSources(datasets: Dataset[]): WorkoutSources | null {
  const sorted = [...datasets].sort((a, b) => a.path.localeCompare(b.path))
  const logs = sorted.filter(isTrainingLog)
  if (logs.length === 0) return null
  // A file named like a training log wins over another table that happens to have reps.
  const log = logs.find((item) => /training|workout|lift|gym/i.test(item.path)) ?? logs[0]
  const programme = closest(sorted.filter(isProgramme), log.path)
  const nextSession = closest(sorted.filter(isNextSessionSheet), log.path)
  return {
    log,
    ...(programme ? { programme } : {}),
    ...(nextSession ? { nextSession } : {}),
  }
}

/** "upper-a" → "Upper A", "arms-delts" → "Arms delts". */
export function dayLabel(day: string): string {
  const words = day.split(/[-_\s]+/).filter(Boolean)
  return words
    .map((word, index) =>
      word.length === 1 ? word.toUpperCase() : index === 0 ? word[0].toUpperCase() + word.slice(1) : word
    )
    .join(' ')
}

function text(value: DatasetValue | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const result = String(value).trim()
  return result || undefined
}

function number(value: DatasetValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function byOrder(rows: DatasetRow[]): DatasetRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (number(a.row.order) ?? a.index) - (number(b.row.order) ?? b.index) || a.index - b.index)
    .map(({ row }) => row)
}

/**
 * The workouts someone can start, one per programme day in the order the
 * programme lists them, with today's targets from the next session sheet.
 */
export function workoutTemplates(sources: WorkoutSources): WorkoutTemplate[] {
  const plan = sources.programme ?? sources.nextSession
  if (!plan) return []
  const days: string[] = []
  for (const row of plan.rows) {
    const day = text(row.day)
    if (day && !days.includes(day)) days.push(day)
  }
  return days.map((day) => {
    const rows = byOrder(plan.rows.filter((row) => text(row.day) === day))
    const sheet = sources.nextSession?.rows.filter((row) => text(row.day) === day) ?? []
    const exercises = rows.flatMap((row): PlannedExercise[] => {
      const name = text(row.exercise)
      if (!name) return []
      const next = sheet.find((item) => text(item.exercise) && sameName(String(item.exercise), name))
      const planned: PlannedExercise = { name }
      const sets = number(row.sets) ?? number(next?.sets)
      if (sets !== undefined) planned.sets = sets
      const restSeconds = number(row.rest_s) ?? parseRestSeconds(text(row.rest))
      if (restSeconds !== undefined) planned.restSeconds = restSeconds
      const fields: Array<[keyof PlannedExercise, string | undefined]> = [
        ['reps', text(row.reps)],
        ['rir', text(row.rir)],
        ['rest', text(row.rest)],
        ['muscle', text(row.muscle)],
        ['target', text(next?.target ?? row.target)],
        ['cue', text(next?.cue ?? row.cue)],
        ['note', sources.programme ? text(row.note) : undefined],
      ]
      for (const [key, value] of fields) if (value) (planned as unknown as Record<string, string>)[key] = value
      return [planned]
    })
    return { day, label: dayLabel(day), exercises }
  })
}

/** Rest used when the plan gives none, such as for an exercise added on the day. */
export const DEFAULT_REST_SECONDS = 90

/**
 * Reads a rest time written for people: "90 s", "3 min", "1:30", "2 to 3 min"
 * or "2-3 min" (the upper end, since longer rest suits hypertrophy work).
 */
export function parseRestSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined
  const textValue = value.trim().toLowerCase()
  const clock = textValue.match(/^(\d+):(\d{1,2})$/)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const numbers = [...textValue.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
  if (numbers.length === 0) return undefined
  const amount = Math.max(...numbers)
  const minutes = /min|\d\s*m\b/.test(textValue)
  const seconds = Math.round(minutes ? amount * 60 : amount)
  return seconds > 0 ? seconds : undefined
}

/** The rest timer length for an exercise. */
export function restSecondsFor(exercise: Pick<PlannedExercise, 'restSeconds' | 'rest'>): number {
  return exercise.restSeconds ?? parseRestSeconds(exercise.rest) ?? DEFAULT_REST_SECONDS
}

/** "2:05", or "0:09" in the last ten seconds. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Every set in the log, with the row index needed to edit or remove it. */
export function loggedSets(log: Dataset): LoggedSet[] {
  const load = firstColumn(log, LOAD_COLUMNS)
  const rir = firstColumn(log, RIR_COLUMNS)
  const set = firstColumn(log, SET_COLUMNS)
  const counts = new Map<string, number>()
  return log.rows.flatMap((row, index): LoggedSet[] => {
    const date = text(row.date)
    const exercise = text(row.exercise)
    if (!date || !exercise) return []
    const id = `${date}\n${exercise.toLowerCase()}`
    const position = (counts.get(id) ?? 0) + 1
    counts.set(id, position)
    return [
      {
        index,
        date,
        exercise,
        set: (set && number(row[set.name])) ?? position,
        kg: (load && number(row[load.name])) ?? null,
        reps: number(row.reps) ?? null,
        rir: (rir && number(row[rir.name])) ?? null,
        note: text(row.note) ?? null,
      },
    ]
  })
}

/** The sets logged for one exercise on one date, in set order. */
export function setsFor(log: Dataset, date: string, exercise: string): LoggedSet[] {
  return loggedSets(log)
    .filter((item) => item.date === date && sameName(item.exercise, exercise))
    .sort((a, b) => a.set - b.set || a.index - b.index)
}

/** The most recent earlier session of an exercise, for "last time". */
export function lastSessionFor(log: Dataset, exercise: string, before: string): LoggedSet[] {
  const earlier = loggedSets(log).filter((item) => item.date < before && sameName(item.exercise, exercise))
  if (earlier.length === 0) return []
  const date = earlier.reduce((latest, item) => (item.date > latest ? item.date : latest), earlier[0].date)
  return earlier.filter((item) => item.date === date).sort((a, b) => a.set - b.set || a.index - b.index)
}

/** The exercises logged on a date, in the order they were first logged. */
export function exercisesOn(log: Dataset, date: string): string[] {
  const names: string[] = []
  for (const item of loggedSets(log)) {
    if (item.date === date && !names.some((name) => sameName(name, item.exercise))) names.push(item.exercise)
  }
  return names
}

/** The programme day recorded against a date's sets, when the log has a day column. */
export function dayOn(log: Dataset, date: string): string | undefined {
  const row = log.rows.find((item) => text(item.date) === date && text(item.day) && text(item.day) !== 'other')
  return text(row?.day)
}

/** Every exercise name the programme, sheet and log know, for picking one to add. */
export function knownExercises(sources: WorkoutSources): string[] {
  const names: string[] = []
  const add = (value: DatasetValue | undefined) => {
    const name = text(value)
    if (name && !names.some((item) => sameName(item, name))) names.push(name)
  }
  for (const dataset of [sources.programme, sources.nextSession, sources.log]) {
    for (const row of dataset?.rows ?? []) add(row.exercise)
  }
  return names.sort((a, b) => a.localeCompare(b))
}

/** Epley estimate of a one rep max, counting reps in reserve as reps. */
export function estimateOneRepMax(kg: number | null, reps: number | null, rir: number | null): number | null {
  if (kg === null || reps === null || kg <= 0 || reps <= 0) return null
  return Math.round(kg * (1 + (reps + (rir ?? 0)) / 30) * 10) / 10
}

/** "32.5 kg × 9 @ 2", or "BW × 12" for a bodyweight set. */
export function describeSet(set: Pick<LoggedSet, 'kg' | 'reps' | 'rir'>): string {
  const load = set.kg === null ? '' : set.kg === 0 ? 'BW' : `${set.kg} kg`
  const reps = set.reps === null ? '' : `${set.reps}`
  const main = load && reps ? `${load} × ${reps}` : load || (reps ? `${reps} reps` : 'No reps')
  return set.rir === null ? main : `${main} @ ${set.rir} RIR`
}

/** "32.5 kg × 9, 8, 7" when the load held, otherwise each set in full. */
export function describeSession(sets: LoggedSet[]): string {
  if (sets.length === 0) return ''
  const loads = new Set(sets.map((item) => item.kg))
  if (loads.size === 1 && sets.every((item) => item.reps !== null)) {
    const kg = sets[0].kg
    const load = kg === null ? '' : kg === 0 ? 'BW × ' : `${kg} kg × `
    return `${load}${sets.map((item) => item.reps).join(', ')}`
  }
  return sets.map((item) => describeSet({ ...item, rir: null })).join(', ')
}

function allows(column: DatasetColumn | undefined, value: string): boolean {
  if (!column) return false
  if (column.type !== 'enum' || !column.values?.length) return true
  return column.values.includes(value)
}

/** The row a set is written as, using only the columns the log has. */
export function setRow(log: Dataset, input: SetInput): DatasetInput {
  const names = columnNames(log)
  const row: DatasetInput = { date: input.date, exercise: input.exercise.trim(), reps: input.reps }
  const set = firstColumn(log, SET_COLUMNS)
  if (set) row[set.name] = input.set
  const load = firstColumn(log, LOAD_COLUMNS)
  if (load) row[load.name] = input.kg
  const rir = firstColumn(log, RIR_COLUMNS)
  if (rir) row[rir.name] = input.rir
  if (names.has('note') && input.note?.trim()) row.note = input.note.trim()
  const day = log.schema.columns.find((column) => column.name === 'day')
  const dayValue = input.day ?? (day?.type === 'enum' ? 'other' : null)
  if (dayValue && allows(day, dayValue)) row.day = dayValue
  const muscle = log.schema.columns.find((column) => column.name === 'muscle')
  if (input.muscle && allows(muscle, input.muscle)) row.muscle = input.muscle
  const e1rm = firstColumn(log, E1RM_COLUMNS)
  const estimate = estimateOneRepMax(input.kg, input.reps, input.rir)
  if (e1rm && estimate !== null) row[e1rm.name] = estimate
  return row
}

/** A set kept on the device until the workout is finished and checked. */
export interface DraftSet {
  id: string
  exercise: string
  set: number
  kg: number | null
  reps: number | null
  rir: number | null
  muscle: string | null
  /** When it was logged, as a timestamp. */
  loggedAt: number
}

/** A workout in progress, autosaved on the device so it survives losing signal or a reload. */
export interface WorkoutDraft {
  date: string
  /** The programme day, or null for an empty workout. */
  day: string | null
  label: string
  exercises: PlannedExercise[]
  sets: DraftSet[]
  startedAt: number
}

/** The sets of one exercise in a draft, in set order. */
export function draftSetsFor(draft: WorkoutDraft, exercise: string): DraftSet[] {
  return draft.sets.filter((item) => sameName(item.exercise, exercise)).sort((a, b) => a.set - b.set)
}

/** The set number the next set of an exercise gets, after any already in the log that day. */
export function nextSetNumber(log: Dataset, draft: WorkoutDraft, exercise: string): number {
  const saved = setsFor(log, draft.date, exercise).map((item) => item.set)
  const pending = draftSetsFor(draft, exercise).map((item) => item.set)
  return Math.max(0, ...saved, ...pending) + 1
}

/** Removes a set from a draft and closes the gap in that exercise's set numbers. */
export function removeDraftSet(draft: WorkoutDraft, id: string): WorkoutDraft {
  const removed = draft.sets.find((item) => item.id === id)
  if (!removed) return draft
  const sets = draft.sets
    .filter((item) => item.id !== id)
    .map((item) =>
      sameName(item.exercise, removed.exercise) && item.set > removed.set ? { ...item, set: item.set - 1 } : item
    )
  return { ...draft, sets }
}

export interface ExerciseReview {
  exercise: string
  sets: DraftSet[]
  notes: string[]
}

/**
 * What to check before a workout goes into the vault: sets short of the plan,
 * planned exercises not done, and loads well above anything logged before,
 * which are usually typing slips such as 325 for 32.5.
 */
export function reviewDraft(draft: WorkoutDraft, log: Dataset): ExerciseReview[] {
  const names: string[] = []
  for (const item of draft.exercises) names.push(item.name)
  for (const item of draft.sets) if (!names.some((name) => sameName(name, item.exercise))) names.push(item.exercise)
  return names.map((name) => {
    const sets = draftSetsFor(draft, name)
    const plan = draft.exercises.find((item) => sameName(item.name, name))
    const saved = setsFor(log, draft.date, name).length
    const notes: string[] = []
    const done = sets.length + saved
    if (plan?.sets && done === 0) notes.push('Not done')
    else if (plan?.sets && done < plan.sets) notes.push(`${done} of ${plan.sets} sets`)
    const heaviest = loggedSets(log)
      .filter((item) => sameName(item.exercise, name) && item.kg !== null && item.date < draft.date)
      .reduce((max, item) => Math.max(max, item.kg ?? 0), 0)
    for (const item of sets) {
      if (heaviest > 0 && item.kg !== null && item.kg > heaviest * 1.5) {
        notes.push(`Set ${item.set} at ${item.kg} kg is well above your best of ${heaviest} kg`)
      }
      if (item.reps !== null && item.reps > 50) notes.push(`Set ${item.set} has ${item.reps} reps`)
    }
    return { exercise: name, sets, notes }
  })
}

/**
 * Adds every set of a finished workout to the training log as one change.
 * Set numbers carry on after any sets already saved for that day, so a
 * workout finished in two parts never repeats a set number.
 */
export function commitDraft(path: string, raw: string, draft: WorkoutDraft): { content: string; message: string } {
  let content = raw
  const log = parseDataset(path, raw)
  const order = reviewDraft(draft, log).map((item) => item.exercise)
  let count = 0
  for (const exercise of order) {
    const offset = Math.max(0, ...setsFor(log, draft.date, exercise).map((item) => item.set))
    draftSetsFor(draft, exercise).forEach((item, index) => {
      const set = offset > 0 ? offset + index + 1 : item.set
      const current = parseDataset(path, content)
      content = appendDatasetRow(path, content, setRow(current, { ...item, date: draft.date, set, day: draft.day }))
      count++
    })
  }
  return { content, message: `Log ${draft.label} on ${draft.date}: ${count} set${count === 1 ? '' : 's'}` }
}

/** Today's date in the browser's time zone, as the log writes it. */
export function localDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Parses a number typed at the gym, accepting a comma as the decimal mark. */
export function parseEntry(value: string): number | null {
  const cleaned = value.trim().replace(',', '.')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

import { expect, test } from '@playwright/test'
import { parseDataset } from '@/lib/dataset'
import { appendDatasetRow, deleteDatasetRowAt, updateDatasetRowAt } from '@/lib/dataset-edit'
import {
  dayLabel,
  deleteSet,
  describeSession,
  editSet,
  estimateOneRepMax,
  exercisesOn,
  findWorkoutSources,
  knownExercises,
  lastSessionFor,
  logSet,
  parseEntry,
  setsFor,
  workoutTemplates,
} from '@/lib/workout'
import { NEXT_SESSION, PROGRAMME, TRAINING_LOG, TRAINING_LOG_WITH_HISTORY } from '../fixtures/workout'

const LOG = 'health/training-log.md'

/** Appended cells are padded to the delimiter row, so compare with single spaces. */
const squash = (text: string) => text.replace(/ +/g, ' ')

function sources(log = TRAINING_LOG_WITH_HISTORY) {
  const found = findWorkoutSources([
    parseDataset('health/next-session.md', NEXT_SESSION),
    parseDataset(LOG, log),
    parseDataset('health/programme.md', PROGRAMME),
  ])
  if (!found) throw new Error('No training log found')
  return found
}

test('finds the training log, programme and next session sheet by their columns', () => {
  const found = sources()
  expect(found.log.path).toBe(LOG)
  expect(found.programme?.path).toBe('health/programme.md')
  expect(found.nextSession?.path).toBe('health/next-session.md')
  expect(findWorkoutSources([parseDataset('health/programme.md', PROGRAMME)])).toBeNull()
})

test('each programme day becomes a workout, with today\'s target and cue from the sheet', () => {
  const templates = workoutTemplates(sources())
  expect(templates.map((item) => item.label)).toEqual(['Upper A', 'Lower A'])
  const first = templates[0].exercises[0]
  expect(first).toMatchObject({
    name: 'Incline dumbbell press',
    sets: 3,
    reps: '6 to 10',
    rir: '1 to 2',
    rest: '3 min',
    muscle: 'chest',
    target: 'Find a load for 6 to 10 reps, 1 to 2 in reserve',
  })
  expect(first.cue).toContain('Bench at 30 degrees')
  expect(templates[1].exercises).toHaveLength(6)
})

test('day labels read naturally', () => {
  expect(dayLabel('upper-a')).toBe('Upper A')
  expect(dayLabel('arms-delts')).toBe('Arms delts')
})

test('logging a set appends one row with day, muscle and estimated 1RM filled in', () => {
  const { content, message } = logSet(LOG, TRAINING_LOG, {
    date: '2026-11-10',
    exercise: 'Incline dumbbell press',
    set: 1,
    kg: 32.5,
    reps: 9,
    rir: 2,
    day: 'upper-a',
    muscle: 'chest',
  })
  expect(content.startsWith(TRAINING_LOG.trimEnd())).toBe(true)
  expect(squash(content)).toContain('| 2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2 | | upper-a | chest | 44.4 |')
  expect(message).toBe('Log Incline dumbbell press set 1: 32.5 kg × 9 @ 2 RIR')
  const sets = setsFor(parseDataset(LOG, content), '2026-11-10', 'incline dumbbell press')
  expect(sets.map((item) => [item.set, item.kg, item.reps, item.rir])).toEqual([[1, 32.5, 9, 2]])
})

test('a set from an empty workout is marked as other and keeps an unknown muscle out', () => {
  const { content } = logSet(LOG, TRAINING_LOG, {
    date: '2026-11-10',
    exercise: 'Farmer carry',
    set: 1,
    kg: 40,
    reps: 1,
    rir: null,
    muscle: 'grip',
  })
  expect(squash(content)).toContain('| 2026-11-10 | Farmer carry | 1 | 40 | 1 | | | other | | 41.3 |')
})

test('a logged set can be edited and removed by date, exercise and set number', () => {
  let raw = TRAINING_LOG_WITH_HISTORY
  raw = editSet(LOG, raw, { date: '2026-11-03', exercise: 'Incline dumbbell press', set: 2 }, { kg: 30, reps: 8, rir: 1 }).content
  expect(squash(raw)).toContain('| 2026-11-03 | Incline dumbbell press | 2 | 30 | 8 | 1 | | upper-a | chest | 39 |')
  raw = deleteSet(LOG, raw, { date: '2026-11-03', exercise: 'Incline dumbbell press', set: 1 }).content
  const left = setsFor(parseDataset(LOG, raw), '2026-11-03', 'Incline dumbbell press')
  expect(left.map((item) => item.set)).toEqual([2])
  expect(() => deleteSet(LOG, raw, { date: '2026-11-03', exercise: 'Incline dumbbell press', set: 1 })).toThrow(
    /no longer in the log/
  )
})

test('last time shows the most recent earlier session', () => {
  const log = parseDataset(LOG, TRAINING_LOG_WITH_HISTORY)
  const last = lastSessionFor(log, 'Incline dumbbell press', '2026-11-10')
  expect(describeSession(last)).toBe('30 kg × 10, 9')
  expect(lastSessionFor(log, 'Incline dumbbell press', '2026-11-03')).toEqual([])
  expect(exercisesOn(log, '2026-11-03')).toEqual(['Incline dumbbell press'])
})

test('known exercises combine the programme and the log without repeats', () => {
  const names = knownExercises(sources())
  expect(names).toContain('Romanian deadlift')
  expect(names.filter((name) => name === 'Incline dumbbell press')).toHaveLength(1)
})

test('numbers typed at the gym accept a comma and blanks', () => {
  expect(parseEntry('32,5')).toBe(32.5)
  expect(parseEntry(' ')).toBeNull()
  expect(parseEntry('abc')).toBeNull()
  expect(estimateOneRepMax(0, 10, 1)).toBeNull()
  expect(estimateOneRepMax(100, 5, 0)).toBe(116.7)
})

test('rows can be appended, changed and removed in a table without a key', () => {
  const appended = appendDatasetRow(LOG, TRAINING_LOG, { date: '2026-11-10', exercise: 'Pull up', set: 1, kg: 0, reps: 8 })
  expect(squash(appended)).toContain('| 2026-11-10 | Pull up | 1 | 0 | 8 |')
  const changed = updateDatasetRowAt(LOG, appended, 0, { reps: 9 })
  expect(squash(changed)).toContain('| 2026-11-10 | Pull up | 1 | 0 | 9 |')
  expect(deleteDatasetRowAt(LOG, changed, 0)).toBe(TRAINING_LOG)
})

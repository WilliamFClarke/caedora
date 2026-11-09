import { expect, test } from '@playwright/test'
import { parseDataset } from '@/lib/dataset'
import { appendDatasetRow, deleteDatasetRowAt, updateDatasetRowAt } from '@/lib/dataset-edit'
import {
  commitDraft,
  dayLabel,
  describeSession,
  estimateOneRepMax,
  exercisesOn,
  findWorkoutSources,
  knownExercises,
  formatCountdown,
  lastSessionFor,
  nextSetNumber,
  parseEntry,
  parseRestSeconds,
  removeDraftSet,
  restSecondsFor,
  reviewDraft,
  setsFor,
  workoutTemplates,
  type DraftSet,
  type WorkoutDraft,
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

function draftSet(exercise: string, set: number, kg: number | null, reps: number, rir: number | null = null): DraftSet {
  return { id: `${exercise}-${set}`, exercise, set, kg, reps, rir, muscle: exercise === 'Incline dumbbell press' ? 'chest' : null, loggedAt: 0 }
}

function upperA(sets: DraftSet[]): WorkoutDraft {
  const template = workoutTemplates(sources())[0]
  return { date: '2026-11-10', day: template.day, label: template.label, exercises: template.exercises, sets, startedAt: 0 }
}

test('finishing a workout adds every set to the log in one change, with day, muscle and estimated 1RM', () => {
  const draft = upperA([draftSet('Incline dumbbell press', 1, 32.5, 9, 2), draftSet('Incline dumbbell press', 2, 32.5, 8, 1)])
  const { content, message } = commitDraft(LOG, TRAINING_LOG, draft)
  expect(content.startsWith(TRAINING_LOG.trimEnd())).toBe(true)
  expect(squash(content)).toContain('| 2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2 | | upper-a | chest | 44.4 |')
  expect(squash(content)).toContain('| 2026-11-10 | Incline dumbbell press | 2 | 32.5 | 8 | 1 | | upper-a | chest | 42.3 |')
  expect(message).toBe('Log Upper A on 2026-11-10: 2 sets')
})

test('a set from an empty workout is marked as other and keeps an unknown muscle out', () => {
  const draft: WorkoutDraft = {
    date: '2026-11-10',
    day: null,
    label: 'Workout',
    exercises: [{ name: 'Farmer carry' }],
    sets: [{ ...draftSet('Farmer carry', 1, 40, 1), muscle: 'grip' }],
    startedAt: 0,
  }
  expect(squash(commitDraft(LOG, TRAINING_LOG, draft).content)).toContain('| 2026-11-10 | Farmer carry | 1 | 40 | 1 | | | other | | 41.3 |')
})

test('set numbers carry on after sets already saved that day', () => {
  const first = commitDraft(LOG, TRAINING_LOG, upperA([draftSet('Incline dumbbell press', 1, 30, 10)])).content
  const log = parseDataset(LOG, first)
  const second = upperA([])
  expect(nextSetNumber(log, second, 'Incline dumbbell press')).toBe(2)
  // A draft started before the first save still numbers from 1, so commit shifts it.
  const content = commitDraft(LOG, first, upperA([draftSet('Incline dumbbell press', 1, 30, 9)])).content
  expect(setsFor(parseDataset(LOG, content), '2026-11-10', 'Incline dumbbell press').map((item) => item.set)).toEqual([1, 2])
})

test('removing a set closes the gap in set numbers', () => {
  const draft = upperA([
    draftSet('Incline dumbbell press', 1, 30, 10),
    draftSet('Incline dumbbell press', 2, 30, 9),
    draftSet('Incline dumbbell press', 3, 30, 8),
  ])
  const next = removeDraftSet(draft, 'Incline dumbbell press-2')
  expect(next.sets.map((item) => [item.set, item.reps])).toEqual([
    [1, 10],
    [2, 8],
  ])
})

test('the review flags short exercises, skipped ones and likely typing slips', () => {
  const log = parseDataset(LOG, TRAINING_LOG_WITH_HISTORY)
  const review = reviewDraft(upperA([draftSet('Incline dumbbell press', 1, 325, 9)]), log)
  const press = review.find((item) => item.exercise === 'Incline dumbbell press')
  expect(press?.notes).toEqual(['1 of 3 sets', 'Set 1 at 325 kg is well above your best of 30 kg'])
  expect(review.find((item) => item.exercise === 'Chest supported row')?.notes).toEqual(['Not done'])
})

test('rest times are read from the plan, with a default for anything unplanned', () => {
  expect(parseRestSeconds('90 s')).toBe(90)
  expect(parseRestSeconds('3 min')).toBe(180)
  expect(parseRestSeconds('2:30')).toBe(150)
  expect(parseRestSeconds('2 to 3 min')).toBe(180)
  expect(parseRestSeconds('2m')).toBe(120)
  expect(parseRestSeconds('')).toBeUndefined()
  expect(workoutTemplates(sources())[0].exercises[0].restSeconds).toBe(180)
  expect(restSecondsFor({})).toBe(90)
  expect(formatCountdown(125)).toBe('2:05')
  expect(formatCountdown(-3)).toBe('0:00')
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

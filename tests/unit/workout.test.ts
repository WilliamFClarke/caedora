import { expect, test } from '@playwright/test'
import { parseDataset } from '@/lib/dataset'
import { appendDatasetRow, deleteDatasetRowAt, updateDatasetRowAt } from '@/lib/dataset-edit'
import {
  commitDraft,
  commitRuns,
  describeRun,
  formatPace,
  dayLabel,
  describeSession,
  estimateOneRepMax,
  exercisesOn,
  findWorkoutSources,
  knownExercises,
  formatCountdown,
  formatElapsed,
  lastSessionFor,
  loadInText,
  nextSetNumber,
  parseEntry,
  parseRestSeconds,
  removeDraftSet,
  restSecondsFor,
  reviewDraft,
  setsFor,
  similarExercise,
  suggestLoad,
  workoutTemplates,
  type DraftRun,
  type DraftSet,
  type WorkoutDraft,
} from '@/lib/workout'
import { CONDITIONING_LOG, NEXT_SESSION, PROGRAMME, TRAINING_LOG, TRAINING_LOG_WITH_HISTORY } from '../fixtures/workout'

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

test('formats how long a workout has been going', () => {
  expect(formatElapsed(0)).toBe('0:00')
  expect(formatElapsed(65_900)).toBe('1:05')
  expect(formatElapsed(59 * 60_000 + 59_000)).toBe('59:59')
  expect(formatElapsed(3_600_000 + 4 * 60_000 + 7_000)).toBe('1:04:07')
  expect(formatElapsed(-5000)).toBe('0:00')
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

const CONDITIONING = 'health/conditioning-log.md'

function run(fields: Partial<DraftRun>): DraftRun {
  return { id: 'r', treadmill: false, minutes: 30, distanceKm: 5, avgHr: null, note: null, loggedAt: 0, ...fields }
}

function runDraft(date: string, runs: DraftRun[]): WorkoutDraft {
  return { date, day: null, label: 'Run', exercises: [], sets: [], runs, startedAt: 0 }
}

test('finds the conditioning log beside the training log', () => {
  const found = findWorkoutSources([
    parseDataset(LOG, TRAINING_LOG_WITH_HISTORY),
    parseDataset(CONDITIONING, CONDITIONING_LOG),
  ])
  expect(found?.conditioning?.path).toBe(CONDITIONING)
  expect(found?.log.path).toBe(LOG)
})

test('pace and run summaries read naturally', () => {
  expect(formatPace(30, 5)).toBe('6:00 min/km')
  expect(formatPace(27.5, 5)).toBe('5:30 min/km')
  expect(formatPace(30, null)).toBeNull()
  expect(describeRun(run({ treadmill: true, avgHr: 152 }))).toBe('Treadmill · 5 km in 30 min · 6:00 min/km · 152 bpm')
  expect(describeRun(run({ distanceKm: null, minutes: 20 }))).toBe('Outdoor · 20 min')
})

test('a run goes to the top of a newest first conditioning log, in the format already there', () => {
  const result = commitRuns(CONDITIONING, CONDITIONING_LOG, runDraft('2026-11-17', [run({ treadmill: true, note: '1% incline' })]))
  expect(result.message).toBe('Log run on 2026-11-17: 5 km in 30 min')
  const rows = parseDataset(CONDITIONING, result.content).rows
  expect(rows.map((row) => row.date)).toEqual(['2026-11-17', '2026-11-13'])
  expect(rows[0]).toMatchObject({ type: 'run', minutes: 30, distance_km: 5, notes: 'Treadmill. Average pace: 6:00 min/km. 1% incline' })
  // Everything around the table is left alone.
  expect(result.content.split('| 2026-11-17 |')[0]).toBe(CONDITIONING_LOG.split('| 2026-11-13 |')[0])
})

test('an older run slots in by date, and an oldest first log keeps adding at the end', () => {
  const twoRows = commitRuns(CONDITIONING, CONDITIONING_LOG, runDraft('2026-11-17', [run({})])).content
  const backdated = commitRuns(CONDITIONING, twoRows, runDraft('2026-11-15', [run({ minutes: 25, avgHr: 150 })]))
  expect(parseDataset(CONDITIONING, backdated.content).rows.map((row) => row.date)).toEqual(['2026-11-17', '2026-11-15', '2026-11-13'])

  const oldestFirst = CONDITIONING_LOG.replace('newest first', 'oldest first')
  const appended = commitRuns(CONDITIONING, oldestFirst, runDraft('2026-11-17', [run({}), run({ id: 'b', minutes: 10, distanceKm: null })]))
  expect(appended.message).toBe('Log run on 2026-11-17: 2 runs')
  const rows = parseDataset(CONDITIONING, appended.content).rows
  expect(rows.map((row) => row.minutes)).toEqual([12, 30, 10])
  expect(rows[2].distance_km ?? null).toBeNull()
})

test('the kg box starts at the plan, then last time, then a similar exercise, then the target', () => {
  const sheet = NEXT_SESSION.replace('    target: { type: text', "    kg: { type: number, label: Today's kg }\n    target: { type: text")
    .replace('| sets | last_time | target | cue |', '| sets | last_time | kg | target | cue |')
    .replace('| --- | --- | --- | --- | --- | --- | --- |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    .replace(/^(\| [a-z-]+ \| \d+ \| [^|]+ \| \d+ \| [^|]* \|)/gm, '$1 |')
    .replace('| EZ bar curl | 3 |  | |', '| EZ bar curl | 3 |  | 12.5 |')
  const found = findWorkoutSources([
    parseDataset('health/next-session.md', sheet),
    parseDataset(LOG, `${TRAINING_LOG_WITH_HISTORY}| 2026-11-05 | Triceps extension | 1 | 27 | 13 | 0 |  | other | triceps | |\n`),
    parseDataset('health/programme.md', PROGRAMME),
  ])
  if (!found) throw new Error('No training log found')
  const upper = workoutTemplates(found)[0].exercises
  const named = (name: string) => upper.find((item) => item.name === name)!
  expect(named('EZ bar curl').kg).toBe(12.5)
  expect(named('Incline dumbbell press').kg).toBeUndefined()

  const date = '2026-11-10'
  expect(suggestLoad(found.log, named('EZ bar curl'), date, 1)).toEqual({ kg: 12.5, source: 'plan' })
  expect(suggestLoad(found.log, named('Incline dumbbell press'), date, 2)).toEqual({ kg: 30, source: 'last-time' })
  expect(suggestLoad(found.log, named('Overhead cable triceps extension'), date, 1)).toEqual({
    kg: 27,
    source: 'similar',
    exercise: 'Triceps extension',
    date: '2026-11-05',
  })
  expect(suggestLoad(found.log, { name: 'Chest supported row', target: 'Start at about 40 kg' }, date, 1)).toEqual({
    kg: 40,
    source: 'target',
  })
  expect(suggestLoad(found.log, named('Cable lateral raise'), date, 1)).toBeNull()
  // Only earlier sessions count, so a workout on the day of the history starts empty.
  expect(suggestLoad(found.log, named('Incline dumbbell press'), '2026-11-03', 1)).toBeNull()
})

test('similar exercises share every word of the shorter name', () => {
  expect(similarExercise('Leg extension', 'Seated leg extension')).toBe(true)
  expect(similarExercise('Tricep extension', 'Overhead cable triceps extension')).toBe(true)
  expect(similarExercise('Cable lateral raise', 'Dumbbell lateral raise')).toBe(false)
  expect(similarExercise('Leg extension', 'Leg extension')).toBe(false)
  expect(similarExercise('Press', 'Incline dumbbell press')).toBe(false)
  expect(loadInText('16 kg; aim for 10, 10, 10')).toBe(16)
  expect(loadInText('Starting guess: about 2,5 kg per side')).toBe(2.5)
  expect(loadInText('Find a load for 8 to 12 reps')).toBeUndefined()
})

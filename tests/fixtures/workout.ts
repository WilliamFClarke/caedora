/**
 * The training log, programme and next session sheet from a health vault,
 * trimmed to two programme days, for the workout tracker.
 */

export const TRAINING_LOG = `---
type: Dataset
title: Training log
description: Every working set lifted, one short row per set entered at the gym between sets, used to track progressive overload, estimated strength and weekly hard sets per muscle.
tags: [health, training, log, strength, gym]
dataset:
  columns:
    date: { type: date, required: true }
    exercise: { type: text, required: true }
    set: { type: number, required: true }
    kg: { type: number, label: Load (kg) }
    reps: { type: number }
    rir: { type: number, label: Reps in reserve }
    note: { type: text }
    day: { type: enum, values: [upper-a, lower-a, upper-b, lower-b, arms-delts, other] }
    muscle: { type: enum, values: [chest, back, side-delts, rear-delts, front-delts, biceps, triceps, quads, hamstrings, glutes, calves, abs] }
    e1rm_kg: { type: number, label: Estimated 1RM (kg) }
generated: { by: claude, at: 2026-11-09T18:00:00Z }
---

# Training log

Built for logging at the gym on a phone, between sets. Each working set is one row, and only the first six columns need typing: date, exercise, set number, kg, reps and reps in reserve. Claude fills day, muscle and estimated 1RM afterwards, so a quick row like \`2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2\` is enough. Newest at the bottom is fine while logging; Claude tidies the order later.

Three ways to log, whichever is easiest on the day:

1. In Caedora, open this page and add a row per set.
2. Message Claude between sets or after the session in any shorthand, such as "incline DB 32.5 x 9, 8, 7 @2", and Claude adds the rows.
3. Open [Next session](/health/next-session.md) first to see today's targets, then log here.

Rules for the numbers:

- Only working sets go in, taken within about 3 reps of failure. Skip warm ups.
- Dumbbell loads are per dumbbell. Pull up and dip loads are the added weight, 0 for bodyweight.
- Reps in reserve is the honest guess of how many more clean reps were left. 0 means failure.
- Estimated 1RM uses the Epley formula, kg × (1 + (reps + rir) ÷ 30), so sets at different reps and effort can be compared on one line.
- Use the exercise names in the [training programme](/health/programme.md), so each lift can be followed over time.

| date | exercise | set | kg | reps | rir | note | day | muscle | e1rm_kg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`

/** The same log with one earlier upper A session already in it. */
export const TRAINING_LOG_WITH_HISTORY = `---
type: Dataset
title: Training log
description: Every working set lifted, one short row per set entered at the gym between sets, used to track progressive overload, estimated strength and weekly hard sets per muscle.
tags: [health, training, log, strength, gym]
dataset:
  columns:
    date: { type: date, required: true }
    exercise: { type: text, required: true }
    set: { type: number, required: true }
    kg: { type: number, label: Load (kg) }
    reps: { type: number }
    rir: { type: number, label: Reps in reserve }
    note: { type: text }
    day: { type: enum, values: [upper-a, lower-a, upper-b, lower-b, arms-delts, other] }
    muscle: { type: enum, values: [chest, back, side-delts, rear-delts, front-delts, biceps, triceps, quads, hamstrings, glutes, calves, abs] }
    e1rm_kg: { type: number, label: Estimated 1RM (kg) }
generated: { by: claude, at: 2026-11-09T18:00:00Z }
---

# Training log

Built for logging at the gym on a phone, between sets. Each working set is one row, and only the first six columns need typing: date, exercise, set number, kg, reps and reps in reserve. Claude fills day, muscle and estimated 1RM afterwards, so a quick row like \`2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2\` is enough. Newest at the bottom is fine while logging; Claude tidies the order later.

Three ways to log, whichever is easiest on the day:

1. In Caedora, open this page and add a row per set.
2. Message Claude between sets or after the session in any shorthand, such as "incline DB 32.5 x 9, 8, 7 @2", and Claude adds the rows.
3. Open [Next session](/health/next-session.md) first to see today's targets, then log here.

Rules for the numbers:

- Only working sets go in, taken within about 3 reps of failure. Skip warm ups.
- Dumbbell loads are per dumbbell. Pull up and dip loads are the added weight, 0 for bodyweight.
- Reps in reserve is the honest guess of how many more clean reps were left. 0 means failure.
- Estimated 1RM uses the Epley formula, kg × (1 + (reps + rir) ÷ 30), so sets at different reps and effort can be compared on one line.
- Use the exercise names in the [training programme](/health/programme.md), so each lift can be followed over time.

| date | exercise | set | kg | reps | rir | note | day | muscle | e1rm_kg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03 | Incline dumbbell press | 1 | 30 | 10 | 2 |  | upper-a | chest | 42 |
| 2026-11-03 | Incline dumbbell press | 2 | 30 | 9 | 1 |  | upper-a | chest | 40 |
`

export const PROGRAMME = `---
type: Dataset
title: Training programme
description: The current weekly lifting programme, one row per exercise with sets, rep range, effort and rest, which the training log and weekly check ins are measured against.
tags: [health, training, programme]
dataset:
  key: [day, order]
  columns:
    day: { type: enum, values: [upper-a, lower-a, upper-b, lower-b, arms-delts] }
    order: { type: number, required: true }
    exercise: { type: text, required: true }
    muscle: { type: enum, values: [chest, back, side-delts, rear-delts, front-delts, biceps, triceps, quads, hamstrings, glutes, calves, abs] }
    sets: { type: number }
    reps: { type: text, label: Rep range }
    rir: { type: text, label: Reps in reserve }
    rest: { type: text }
    note: { type: text }
generated: { by: claude, at: 2026-11-09T18:00:00Z }
---

# Training programme

Block 1, provisional until the [health profile](/health/profile.md) is filled in. The reasoning, progression and weekly layout are in the [training plan](/health/training-plan.md). Swap any exercise for the closest machine or cable version the gym has, keeping the muscle and rep range, and note the swap here so the [training log](/health/training-log.md) stays comparable.

The arms and delts day is optional. Add it once four sessions a week feel routine and recovery scores in the [daily check in](/health/daily-log.md) stay good.

| day | order | exercise | muscle | sets | reps | rir | rest | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| upper-a | 1 | Incline dumbbell press | chest | 3 | 6 to 10 | 1 to 2 | 3 min | Bench at 30 degrees, upper chest priority |
| upper-a | 2 | Chest supported row | back | 3 | 8 to 10 | 1 to 2 | 2 to 3 min | Drive elbows back, pause at the top |
| upper-a | 3 | Wide neutral grip lat pulldown | back | 3 | 10 to 12 | 1 | 2 min | Back width |
| upper-a | 4 | Seated dumbbell shoulder press | front-delts | 2 | 8 to 10 | 1 to 2 | 2 to 3 min | |
| upper-a | 5 | Cable lateral raise | side-delts | 3 | 12 to 15 | 0 to 1 | 90 s | V taper priority |
| upper-a | 6 | EZ bar curl | biceps | 3 | 8 to 12 | 1 | 90 s | |
| upper-a | 7 | Overhead cable triceps extension | triceps | 3 | 10 to 12 | 1 | 90 s | Long head bias |
| lower-a | 1 | Hack squat or back squat | quads | 3 | 6 to 8 | 2 | 3 min | Main lower lift |
| lower-a | 2 | Romanian deadlift | hamstrings | 3 | 8 to 10 | 2 | 2 to 3 min | |
| lower-a | 3 | Bulgarian split squat | glutes | 2 | 10 to 12 each leg | 1 to 2 | 2 min | |
| lower-a | 4 | Seated leg curl | hamstrings | 3 | 10 to 12 | 1 | 90 s | |
| lower-a | 5 | Standing calf raise | calves | 4 | 8 to 12 | 1 | 60 s | Full stretch, 1 s pause at the bottom |
| lower-a | 6 | Hanging leg raise | abs | 3 | 10 to 15 | 1 | 60 s | |
`

export const NEXT_SESSION = `---
type: Dataset
title: Next session
description: The gym sheet for each programme day, every exercise with last time's best set and today's target load and reps, refreshed by Claude after each logged session so progressive overload is planned, not guessed.
tags: [health, training, gym, programme]
dataset:
  key: [day, order]
  columns:
    day: { type: enum, values: [upper-a, lower-a, upper-b, lower-b, arms-delts] }
    order: { type: number, required: true }
    exercise: { type: text, required: true }
    sets: { type: number }
    last_time: { type: text, label: Last time }
    target: { type: text, label: Today's target }
    cue: { type: text }
generated: { by: claude, at: 2026-11-09T18:00:00Z }
---

# Next session

Open this on the phone before training. Each row is one exercise from the [training programme](/health/programme.md) with what Will did last time and what to aim for today. Log each set in the [training log](/health/training-log.md) as it is done. After the session Claude reads the log and rewrites the rows for that day using the double progression rule in the [training plan](/health/training-plan.md): hit the top of the rep range on every set at the target effort and the load goes up next time; otherwise add a rep.

Until the first session of each day is logged, "last time" is empty and the target is to find a load that lands in the rep range at the stated reps in reserve. The first week is for finding those loads, not for testing limits.

| day | order | exercise | sets | last_time | target | cue |
| --- | --- | --- | --- | --- | --- | --- |
| upper-a | 1 | Incline dumbbell press | 3 |  | Find a load for 6 to 10 reps, 1 to 2 in reserve | Bench at 30 degrees, shoulder blades pinned, elbows about 45 degrees |
| upper-a | 2 | Chest supported row | 3 |  | Find a load for 8 to 10 reps, 1 to 2 in reserve | Pause 1 s at the top |
| upper-a | 3 | Wide neutral grip lat pulldown | 3 |  | Find a load for 10 to 12 reps, 1 in reserve | Lead with the elbows, full stretch at the top |
| upper-a | 4 | Seated dumbbell shoulder press | 2 |  | Find a load for 8 to 10 reps, 1 to 2 in reserve |  |
| upper-a | 5 | Cable lateral raise | 3 |  | Find a load for 12 to 15 reps, 0 to 1 in reserve | Lead with the elbow, no swing |
| upper-a | 6 | EZ bar curl | 3 |  | Find a load for 8 to 12 reps, 1 in reserve | Elbows still |
| upper-a | 7 | Overhead cable triceps extension | 3 |  | Find a load for 10 to 12 reps, 1 in reserve | Deep stretch behind the head |
| lower-a | 1 | Hack squat or back squat | 3 |  | Find a load for 6 to 8 reps, 2 in reserve | Controlled 2 s lowering |
| lower-a | 2 | Romanian deadlift | 3 |  | Find a load for 8 to 10 reps, 2 in reserve | Hips back, bar close, stop at a hamstring stretch |
| lower-a | 3 | Bulgarian split squat | 2 |  | Find a load for 10 to 12 reps each leg, 1 to 2 in reserve |  |
| lower-a | 4 | Seated leg curl | 3 |  | Find a load for 10 to 12 reps, 1 in reserve |  |
| lower-a | 5 | Standing calf raise | 4 |  | Find a load for 8 to 12 reps, 1 in reserve | 1 s pause at the bottom |
| lower-a | 6 | Hanging leg raise | 3 |  | 10 to 15 reps, 1 in reserve | Curl the pelvis up, do not swing |
`

export const WORKOUT_FILES: Record<string, string> = {
  'health/training-log.md': TRAINING_LOG_WITH_HISTORY,
  'health/programme.md': PROGRAMME,
  'health/next-session.md': NEXT_SESSION,
}

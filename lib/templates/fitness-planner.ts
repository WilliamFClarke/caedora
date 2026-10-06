import type { TemplateFile } from '../vault-templates'

/**
 * Fitness planner template. The workout log and measurements are Datasets
 * that dashboard.md reads. The rows are illustrative examples to replace.
 */

export const FITNESS_PLANNER_FILES: TemplateFile[] = [
  {
    path: 'fitness/README.md',
    content: `# Fitness planner

Open the [fitness dashboard](dashboard.md) for your training time, session mix and body measurements.

Use this folder for training plans, nutrition notes, measurements and weekly reviews. The rows that ship in the [workout log](workouts/workout-log.md) and [measurements](measurements.md) are examples, so replace them with your own.
`,
  },
  {
    path: 'fitness/workouts/workout-log.md',
    content: `---
type: Dataset
title: Workout log
description: One row per training session with its type, length and how hard it felt.
tags: [fitness, workout]
dataset:
  columns:
    date: { type: date, required: true }
    type: { type: enum, values: [strength, run, cycle, swim, walk, mobility, other], required: true }
    minutes: { type: number, required: true }
    distance_km: { type: number }
    effort: { type: number }
    notes: { type: text }
---

# Workout log

Effort is how hard the session felt from 1 (very easy) to 10 (flat out). Leave distance empty for sessions without one.

| date | type | minutes | distance_km | effort | notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-01 | strength | 55 | | 7 | Squat, bench, rows |
| 2026-09-03 | run | 32 | 5.2 | 6 | Easy pace |
| 2026-09-06 | cycle | 75 | 28 | 5 | |
| 2026-09-08 | strength | 60 | | 8 | Deadlift, press, pull ups |
| 2026-09-10 | run | 40 | 6.5 | 7 | Intervals |
| 2026-09-13 | mobility | 20 | | 3 | |
| 2026-09-15 | strength | 55 | | 7 | |
| 2026-09-18 | swim | 35 | 1.5 | 6 | |
| 2026-09-20 | run | 52 | 8.4 | 6 | Long run |
| 2026-09-22 | strength | 60 | | 8 | New squat best |
| 2026-09-25 | walk | 90 | 9 | 3 | Hill walk |
| 2026-09-29 | strength | 50 | | 7 | |
| 2026-10-01 | run | 34 | 5.5 | 6 | |
| 2026-10-04 | cycle | 80 | 31 | 6 | |
`,
  },
  {
    path: 'fitness/measurements.md',
    content: `---
type: Dataset
title: Measurements
description: Dated body measurements, taken at the same time of day each time.
tags: [fitness, measurements]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    weight_kg: { type: number }
    waist_cm: { type: number }
    resting_hr: { type: number }
    notes: { type: text }
---

# Measurements

| date | weight_kg | waist_cm | resting_hr | notes |
| --- | --- | --- | --- | --- |
| 2026-08-09 | 82.4 | 89 | 61 | |
| 2026-08-23 | 81.9 | 88.5 | 60 | |
| 2026-09-06 | 81.6 | 88 | 60 | |
| 2026-09-20 | 81.0 | 87.5 | 58 | |
| 2026-10-04 | 80.7 | 87 | 58 | |
`,
  },
  {
    path: 'fitness/templates/workout.md',
    content: `---
tags: [fitness, workout]
status: active
---

# Workout

- Warmup:
- Main work:
- Accessories:
- Notes:
`,
  },
  {
    path: 'fitness/dashboard.md',
    content: `---
type: Dashboard
title: Fitness dashboard
description: Training time, session mix and body measurements from the fitness Datasets.
---

# Fitness dashboard

Reads [Workout log](workouts/workout-log.md) and [Measurements](measurements.md).

\`\`\`caedora-dashboard
data:
  workouts: workouts/workout-log.md
  measurements: measurements.md
rows:
  - columns: 4
    items:
      - stat: { label: Sessions logged, source: workouts, value: count(), format: integer }
      - stat: { label: Minutes trained, source: workouts, value: sum(minutes), format: integer }
      - stat: { label: Average effort, source: workouts, value: avg(effort), format: number }
      - stat: { label: Weight (kg), source: measurements, latest: date, value: sum(weight_kg), format: number, trend: true, sparkline: true }
  - columns: 2
    items:
      - bar:
          title: Minutes per session
          source: workouts
          x: date
          y: sum(minutes)
          series: type
          stacked: true
          ranges: [3m, 12m, all]
      - pie: { title: Sessions by type, source: workouts, label: type, value: count() }
  - columns: 2
    items:
      - table:
          title: Latest measurements
          source: measurements
          columns: [date, weight_kg, waist_cm, resting_hr]
          sort: -date
          limit: 5
      - table:
          title: Recent sessions
          source: workouts
          columns: [date, type, minutes, distance_km, effort]
          sort: -date
          limit: 5
\`\`\`
`,
  },
  {
    path: 'fitness/AGENTS.md',
    content: `# Fitness coaching guidance

Use the workout log, nutrition notes and measurements as context. Prefer practical plans and ask before changing goals.

- Add one row to workouts/workout-log.md per session and keep ISO dates (YYYY-MM-DD) and the existing session types.
- Add a new row to measurements.md for each check in rather than editing old rows.
- Do not give medical advice. Suggest speaking to a professional about pain or injury.
`,
  },
]

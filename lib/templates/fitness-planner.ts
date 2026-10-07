import type { TemplateFile } from '../vault-templates'

/**
 * Fitness planner template. Five years of example data for a 35 year old
 * getting fitter, read by dashboard.md. Replace the rows with your own.
 */

export const FITNESS_PLANNER_FILES: TemplateFile[] = [
  {
    path: 'fitness/README.md',
    content: `# Fitness planner

Open the [fitness dashboard](dashboard.md) to see how your body, fitness and strength are changing.

Three Datasets feed it. The rows that ship with this template are five years of example data, so replace them with your own.

1. At the end of each month add a row to the [monthly check in](monthly.md): weight, body fat, resting heart rate, VO2 max, your best 5k and how much you trained.
2. Add a row to [personal bests](personal-bests.md) whenever you lift more than before.
3. Log each session in the [workout log](workouts/workout-log.md).
`,
  },
  {
    path: 'fitness/monthly.md',
    content: `---
type: Dataset
title: Monthly check in
description: One row a month with body measurements, fitness markers and how much training was done.
tags: [fitness, measurements]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    weight_kg: { type: number }
    body_fat: { type: percent }
    resting_hr: { type: number }
    vo2_max: { type: number }
    run_5k_min: { type: number }
    sessions: { type: number }
    training_hours: { type: number }
    run_km: { type: number }
    steps: { type: number }
    sleep_hours: { type: number }
---

# Monthly check in

Fill this in on the last day of each month. Weigh in first thing in the morning, take resting heart rate and VO2 max from your watch, and use your best 5k of the month in minutes. Steps and sleep are daily averages.

| date | weight_kg | body_fat | resting_hr | vo2_max | run_5k_min | sessions | training_hours | run_km | steps | sleep_hours |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2021-10-31 | 91.5 | 26.7 | 72 | 36.3 | 32.8 | 6 | 4.7 | 17 | 6075 | 6.2 |
| 2021-11-30 | 91.8 | 26.2 | 71 | 36.4 | 32.5 | 7 | 5 | 21 | 6823 | 6.2 |
| 2021-12-31 | 91.8 | 26.5 | 71 | 37 | 32.1 | 4 | 2.5 | 0 | 5653 | 6.3 |
| 2022-01-31 | 91.7 | 26 | 69 | 37.3 | 31.9 | 3 | 2.7 | 5 | 5917 | 6.3 |
| 2022-02-28 | 91.1 | 25.8 | 69 | 37.5 | 31.9 | 8 | 6.7 | 20 | 7067 | 6.5 |
| 2022-03-31 | 90.3 | 25.4 | 70 | 38.2 | 31.6 | 7 | 4.9 | 19 | 7141 | 6.4 |
| 2022-04-30 | 90 | 25.2 | 69 | 38.4 | 31.2 | 7 | 5.5 | 30 | 7019 | 6.4 |
| 2022-05-31 | 89.9 | 24.6 | 67 | 38.7 | 31.4 | 8 | 6.2 | 22 | 7103 | 6.6 |
| 2022-06-30 | 89.8 | 24.7 | 68 | 38.6 | 30.8 | 9 | 7.2 | 29 | 7015 | 6.5 |
| 2022-07-31 | 89.7 | 24.2 | 68 | 39.3 | 30.8 | 9 | 7.5 | 32 | 7346 | 6.5 |
| 2022-08-31 | 88.8 | 24.5 | 67 | 39.1 | 30.4 | 8 | 6.2 | 31 | 7425 | 6.6 |
| 2022-09-30 | 89 | 24 | 65 | 39.4 | 29.9 | 9 | 7.7 | 41 | 7729 | 6.7 |
| 2022-10-31 | 88.5 | 24 | 66 | 39.6 | 29.6 | 7 | 6 | 34 | 7275 | 6.6 |
| 2022-11-30 | 88.3 | 23.3 | 65 | 40.2 | 29.5 | 8 | 6.8 | 40 | 7541 | 6.6 |
| 2022-12-31 | 88.7 | 23.7 | 65 | 40.2 | 29.2 | 8 | 6.6 | 23 | 6963 | 6.7 |
| 2023-01-31 | 88.5 | 23.3 | 64 | 40.9 | 29 | 8 | 6.8 | 30 | 6750 | 6.8 |
| 2023-02-28 | 87.9 | 23 | 64 | 41.1 | 28.9 | 10 | 8.1 | 49 | 7615 | 6.6 |
| 2023-03-31 | 87.7 | 23 | 64 | 41.5 | 28.6 | 11 | 9.5 | 47 | 7863 | 6.6 |
| 2023-04-30 | 87.4 | 22.3 | 64 | 41.9 | 28.6 | 9 | 8 | 58 | 8318 | 6.7 |
| 2023-05-31 | 86.9 | 22.2 | 63 | 41.9 | 28.3 | 9 | 7.1 | 55 | 8084 | 6.8 |
| 2023-06-30 | 86.6 | 22.4 | 64 | 41.6 | 27.9 | 10 | 9.1 | 59 | 8210 | 6.7 |
| 2023-07-31 | 86.6 | 22.1 | 63 | 42.1 | 28.1 | 11 | 9.4 | 65 | 8218 | 6.9 |
| 2023-08-31 | 86 | 21.5 | 63 | 42.3 | 27.8 | 11 | 9.9 | 57 | 8394 | 6.8 |
| 2023-09-30 | 86.3 | 21.6 | 63 | 43.1 | 27.3 | 11 | 9.1 | 53 | 8270 | 7 |
| 2023-10-31 | 86 | 21.5 | 61 | 43.1 | 27.4 | 11 | 9.7 | 58 | 8366 | 6.8 |
| 2023-11-30 | 85.9 | 21.2 | 62 | 43.2 | 26.9 | 12 | 10.9 | 57 | 8926 | 6.8 |
| 2023-12-31 | 86 | 21.6 | 60 | 43.3 | 27.2 | 9 | 7.5 | 46 | 7771 | 7 |
| 2024-01-31 | 85.8 | 21.4 | 60 | 44.1 | 26.9 | 9 | 7.7 | 53 | 7746 | 7 |
| 2024-02-29 | 84.6 | 20.3 | 61 | 43.8 | 26.5 | 12 | 10.5 | 64 | 9383 | 7.1 |
| 2024-03-31 | 85.1 | 20.1 | 59 | 44.3 | 26.6 | 12 | 11 | 75 | 8946 | 7 |
| 2024-04-30 | 84.4 | 20 | 59 | 44.3 | 26.4 | 12 | 11 | 77 | 9577 | 7 |
| 2024-05-31 | 84.2 | 19.9 | 59 | 45 | 26.2 | 12 | 10.7 | 77 | 9372 | 7.1 |
| 2024-06-30 | 84 | 19.5 | 58 | 44.6 | 25.8 | 12 | 10.4 | 80 | 9226 | 7.1 |
| 2024-07-31 | 83.9 | 19.9 | 58 | 45.1 | 25.7 | 12 | 11.6 | 75 | 9698 | 7.2 |
| 2024-08-31 | 84 | 19.4 | 57 | 45.4 | 25.6 | 13 | 12.5 | 76 | 9887 | 6.9 |
| 2024-09-30 | 83.4 | 19.5 | 59 | 45.9 | 25.4 | 14 | 13.2 | 78 | 9587 | 7 |
| 2024-10-31 | 83.5 | 19.2 | 57 | 45.4 | 25.3 | 15 | 14.1 | 86 | 10002 | 7.1 |
| 2024-11-30 | 83.1 | 18.9 | 57 | 45.6 | 25 | 14 | 13.2 | 80 | 9685 | 7 |
| 2024-12-31 | 83.6 | 19.1 | 58 | 46.1 | 24.6 | 12 | 11 | 66 | 9003 | 7.2 |
| 2025-01-31 | 83.8 | 19 | 57 | 46.6 | 24.4 | 12 | 11.4 | 71 | 8988 | 7.2 |
| 2025-02-28 | 82.9 | 18.7 | 56 | 46.7 | 24.1 | 13 | 12.4 | 98 | 9763 | 7.3 |
| 2025-03-31 | 82.8 | 18.2 | 57 | 47.1 | 24.1 | 15 | 14.7 | 95 | 10397 | 7.3 |
| 2025-04-30 | 82.6 | 18.2 | 55 | 46.8 | 23.9 | 15 | 14.8 | 88 | 10332 | 7.3 |
| 2025-05-31 | 82.1 | 18 | 55 | 47.4 | 23.7 | 16 | 15.9 | 99 | 10075 | 7.4 |
| 2025-06-30 | 82.3 | 17.6 | 56 | 47.7 | 23.9 | 16 | 15.5 | 106 | 10710 | 7.2 |
| 2025-07-31 | 82.1 | 17.7 | 55 | 47.5 | 23.4 | 16 | 16.2 | 94 | 10486 | 7.3 |
| 2025-08-31 | 81.4 | 17.4 | 55 | 48 | 23.2 | 14 | 13.7 | 94 | 10577 | 7.4 |
| 2025-09-30 | 81.8 | 17.3 | 54 | 48 | 23.2 | 16 | 15.5 | 106 | 10777 | 7.4 |
| 2025-10-31 | 81.8 | 17.3 | 55 | 48.4 | 23.4 | 16 | 15.8 | 102 | 10298 | 7.4 |
| 2025-11-30 | 81 | 17.3 | 55 | 48.7 | 23.3 | 17 | 16.5 | 106 | 10736 | 7.3 |
| 2025-12-31 | 82.1 | 17.4 | 54 | 48 | 23 | 14 | 13.8 | 91 | 10069 | 7.4 |
| 2026-01-31 | 82 | 17.4 | 54 | 48.4 | 22.6 | 13 | 13.2 | 100 | 10169 | 7.4 |
| 2026-02-28 | 81.3 | 16.8 | 55 | 48.7 | 22.9 | 18 | 18 | 105 | 10962 | 7.4 |
| 2026-03-31 | 80.7 | 16.4 | 53 | 48.8 | 22.6 | 17 | 17.4 | 116 | 11243 | 7.5 |
| 2026-04-30 | 80.7 | 16.7 | 54 | 49.1 | 22.7 | 16 | 16.5 | 115 | 11330 | 7.5 |
| 2026-05-31 | 80.9 | 16.6 | 54 | 49.2 | 22.4 | 16 | 16.7 | 120 | 11069 | 7.4 |
| 2026-06-30 | 80.8 | 16.4 | 53 | 48.9 | 22.5 | 17 | 17.5 | 113 | 11210 | 7.3 |
| 2026-07-31 | 80.5 | 16.6 | 54 | 49.3 | 22.5 | 17 | 17.3 | 112 | 11439 | 7.4 |
| 2026-08-31 | 80.7 | 16.5 | 54 | 49.2 | 22.5 | 16 | 17.1 | 118 | 11065 | 7.4 |
| 2026-09-30 | 80.4 | 16.2 | 53 | 49.5 | 22.3 | 17 | 18.1 | 113 | 11322 | 7.5 |
`,
  },
  {
    path: 'fitness/personal-bests.md',
    content: `---
type: Dataset
title: Personal bests
description: Heaviest single lift for each of the main lifts, added whenever one is beaten.
tags: [fitness, strength]
dataset:
  key: [date, lift]
  columns:
    date: { type: date, required: true }
    lift: { type: enum, values: [squat, bench, deadlift, overhead-press], required: true }
    kg: { type: number, required: true }
    notes: { type: text }
---

# Personal bests

Add a row only when you beat your best for a lift. Estimated one rep maxes are fine.

| date | lift | kg | notes |
| --- | --- | --- | --- |
| 2021-10-09 | bench | 55 |  |
| 2021-10-09 | deadlift | 90 |  |
| 2021-10-09 | overhead-press | 35 |  |
| 2021-10-09 | squat | 70 |  |
| 2022-01-11 | bench | 60 |  |
| 2022-01-20 | overhead-press | 37.5 |  |
| 2022-02-11 | squat | 77.5 |  |
| 2022-02-12 | deadlift | 100 |  |
| 2022-04-17 | bench | 62.5 |  |
| 2022-04-29 | overhead-press | 40 |  |
| 2022-05-13 | deadlift | 107.5 |  |
| 2022-06-06 | squat | 85 |  |
| 2022-08-14 | bench | 67.5 |  |
| 2022-09-04 | overhead-press | 42.5 |  |
| 2022-09-07 | deadlift | 115 |  |
| 2022-09-11 | squat | 90 |  |
| 2022-12-17 | bench | 72.5 |  |
| 2022-12-18 | overhead-press | 45 |  |
| 2022-12-22 | squat | 95 |  |
| 2022-12-24 | deadlift | 122.5 |  |
| 2023-03-22 | bench | 75 |  |
| 2023-03-23 | overhead-press | 47.5 |  |
| 2023-04-20 | deadlift | 130 |  |
| 2023-04-20 | squat | 102.5 |  |
| 2023-06-18 | overhead-press | 50 |  |
| 2023-07-22 | bench | 77.5 |  |
| 2023-08-24 | deadlift | 137.5 |  |
| 2023-08-25 | squat | 107.5 |  |
| 2023-10-11 | bench | 80 |  |
| 2023-11-21 | deadlift | 142.5 |  |
| 2023-11-27 | squat | 112.5 |  |
| 2024-01-22 | overhead-press | 52.5 |  |
| 2024-02-07 | bench | 85 |  |
| 2024-03-11 | squat | 117.5 |  |
| 2024-03-18 | deadlift | 150 |  |
| 2024-05-22 | bench | 87.5 |  |
| 2024-05-26 | overhead-press | 55 |  |
| 2024-06-22 | deadlift | 155 |  |
| 2024-07-04 | squat | 120 |  |
| 2024-08-30 | bench | 90 |  |
| 2024-09-26 | overhead-press | 57.5 |  |
| 2024-10-09 | deadlift | 160 |  |
| 2024-10-17 | squat | 125 |  |
| 2024-12-15 | bench | 92.5 |  |
| 2025-01-16 | squat | 127.5 |  |
| 2025-01-30 | deadlift | 165 |  |
| 2025-03-28 | overhead-press | 60 |  |
| 2025-04-22 | bench | 95 |  |
| 2025-04-30 | deadlift | 167.5 |  |
| 2025-05-06 | squat | 132.5 |  |
| 2025-07-26 | bench | 97.5 |  |
| 2025-07-27 | deadlift | 172.5 |  |
| 2025-09-13 | squat | 135 |  |
| 2025-09-24 | overhead-press | 62.5 |  |
| 2025-12-03 | bench | 100 |  |
| 2025-12-03 | deadlift | 177.5 |  |
| 2025-12-18 | squat | 137.5 |  |
| 2026-04-16 | squat | 140 |  |
| 2026-06-10 | bench | 102.5 |  |
| 2026-07-04 | deadlift | 180 |  |
| 2026-07-26 | squat | 142.5 |  |
| 2026-08-06 | overhead-press | 65 |  |
`,
  },
  {
    path: 'fitness/workouts/workout-log.md',
    content: `---
type: Dataset
title: Workout log
description: One row per training session with its type, length, distance and effort.
tags: [fitness, workout]
dataset:
  columns:
    date: { type: date, required: true }
    type: { type: enum, values: [strength, run, cycle, swim, walk, mobility, sport], required: true }
    minutes: { type: number, required: true }
    distance_km: { type: number }
    effort: { type: number }
    avg_hr: { type: number }
    notes: { type: text }
---

# Workout log

Effort is how hard the session felt from 1 (very easy) to 10 (flat out). Totals for each month go in the [monthly check in](../monthly.md).

| date | type | minutes | distance_km | effort | avg_hr | notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-17 | strength | 55 |  | 7 | 116 | Squat and bench |
| 2026-08-18 | run | 46 | 7.6 | 6 | 148 |  |
| 2026-08-19 | strength | 63 |  | 8 | 114 | Deadlift and press |
| 2026-08-20 | run | 30 | 5 | 8 | 148 | Intervals |
| 2026-08-22 | cycle | 94 | 38 | 5 | 142 | Club ride |
| 2026-08-23 | run | 75 | 14.2 | 6 | 155 | Long run |
| 2026-08-23 | mobility | 21 |  | 3 | 92 |  |
| 2026-08-24 | strength | 56 |  | 7 | 116 | Squat and bench |
| 2026-08-25 | run | 43 | 7.7 | 6 | 151 |  |
| 2026-08-26 | strength | 67 |  | 8 | 117 | Deadlift and press |
| 2026-08-27 | run | 29 | 5 | 8 | 155 | Intervals |
| 2026-08-29 | cycle | 88 | 38.4 | 5 | 136 | Club ride |
| 2026-08-30 | run | 74 | 14.3 | 6 | 151 | Long run |
| 2026-08-30 | mobility | 28 |  | 3 | 95 |  |
| 2026-08-31 | strength | 58 |  | 7 | 120 | Squat and bench |
| 2026-09-01 | run | 41 | 7.8 | 6 | 155 |  |
| 2026-09-02 | strength | 67 |  | 8 | 119 | Deadlift and press |
| 2026-09-03 | run | 26 | 5.1 | 8 | 149 | Intervals |
| 2026-09-06 | run | 70 | 14.5 | 6 | 149 | Long run |
| 2026-09-06 | mobility | 20 |  | 3 | 88 |  |
| 2026-09-07 | strength | 60 |  | 7 | 121 | Squat and bench |
| 2026-09-08 | run | 46 | 7.8 | 6 | 154 |  |
| 2026-09-09 | strength | 63 |  | 8 | 118 | Deadlift and press |
| 2026-09-10 | run | 25 | 5.2 | 8 | 154 | Intervals |
| 2026-09-12 | cycle | 85 | 39.1 | 5 | 136 | Club ride |
| 2026-09-13 | run | 76 | 14.6 | 6 | 148 | Long run |
| 2026-09-13 | mobility | 30 |  | 3 | 90 |  |
| 2026-09-14 | strength | 55 |  | 7 | 122 | Squat and bench |
| 2026-09-15 | run | 41 | 7.9 | 6 | 154 |  |
| 2026-09-16 | strength | 61 |  | 8 | 116 | Deadlift and press |
| 2026-09-17 | run | 33 | 5.2 | 8 | 155 | Intervals |
| 2026-09-19 | cycle | 85 | 39.5 | 5 | 138 | Club ride |
| 2026-09-20 | run | 78 | 14.8 | 6 | 148 | Long run |
| 2026-09-20 | mobility | 28 |  | 3 | 88 |  |
| 2026-09-21 | strength | 55 |  | 7 | 116 | Squat and bench |
| 2026-09-22 | run | 38 | 8 | 6 | 152 |  |
| 2026-09-23 | strength | 61 |  | 8 | 120 | Deadlift and press |
| 2026-09-24 | run | 23 | 5.2 | 8 | 151 | Intervals |
| 2026-09-26 | cycle | 95 | 39.9 | 5 | 141 | Club ride |
| 2026-09-27 | run | 74 | 14.9 | 6 | 150 | Long run |
| 2026-09-27 | mobility | 30 |  | 3 | 91 |  |
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
description: Body composition, fitness markers, strength and training load over five years.
---

# Fitness dashboard

Reads [Monthly check in](monthly.md), [Personal bests](personal-bests.md) and [Workout log](workouts/workout-log.md). Most cards compare this month with last month.

\`\`\`caedora-dashboard
data:
  monthly: monthly.md
  bests: personal-bests.md
  workouts: workouts/workout-log.md
rows:
  - columns: 4
    items:
      - stat: { label: Weight (kg), source: monthly, latest: date, value: avg(weight_kg), format: number, trend: true, sparkline: true }
      - stat: { label: Resting heart rate, source: monthly, latest: date, value: avg(resting_hr), format: integer, trend: true, sparkline: true }
      - stat: { label: VO2 max, source: monthly, latest: date, value: avg(vo2_max), format: number, trend: true, sparkline: true }
      - stat: { label: 5k time (minutes), source: monthly, latest: date, value: avg(run_5k_min), format: number, trend: true, sparkline: true }
  - columns: 2
    items:
      - line: { title: Weight (kg), source: monthly, x: month(date), y: avg(weight_kg), format: number, ranges: [12m, 3y, all] }
      - line: { title: Body fat, source: monthly, x: month(date), y: avg(body_fat), ranges: [12m, 3y, all] }
  - columns: 1
    items:
      - line:
          title: Strength, best lift (kg)
          description: Personal bests carried forward until they are beaten
          source: bests
          x: date
          y: max(kg)
          series: lift
          snapshots: true
          curve: step
          format: number
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - bar: { title: Training hours per month, source: monthly, x: month(date), y: sum(training_hours), format: number, ranges: [12m, 3y, all] }
      - bar: { title: Running per month (km), description: Average for each year, source: monthly, x: year(date), y: avg(run_km), format: integer }
  - columns: 2
    items:
      - line: { title: 5k time (minutes), source: monthly, x: month(date), y: avg(run_5k_min), format: number, ranges: [12m, 3y, all] }
      - line: { title: Average daily steps, source: monthly, x: month(date), y: avg(steps), format: integer, ranges: [12m, 3y, all] }
  - columns: 2
    items:
      - pie: { title: Last six weeks by type, source: workouts, label: type, value: sum(minutes), format: integer }
      - table:
          title: Recent sessions
          source: workouts
          columns: [date, type, minutes, distance_km, effort]
          sort: -date
          limit: 6
\`\`\`
`,
  },
  {
    path: 'fitness/AGENTS.md',
    content: `# Fitness coaching guidance

Use the monthly check in, personal bests and workout log as context. Prefer practical plans and ask before changing goals.

- monthly.md, personal-bests.md and workouts/workout-log.md are Datasets. Add rows rather than editing old ones and keep ISO dates (YYYY-MM-DD).
- Add a personal best only when it beats the previous best for that lift.
- Do not give medical advice. Suggest speaking to a professional about pain or injury.
`,
  },
]

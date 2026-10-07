import type { TemplateFile } from '../vault-templates'

/**
 * Daily journal template. Five years of example monthly reviews, wheel of
 * life scores and decisions, read by dashboard.md. Replace the rows with your own.
 */

export const DAILY_JOURNAL_FILES: TemplateFile[] = [
  {
    path: 'journal/README.md',
    content: `# Daily journal

Open the [life dashboard](dashboard.md) to see how life is trending, the habits behind it and the decisions due another look.

Use this folder for daily notes, weekly reviews, decisions and small habit loops. At the end of each month add a row to the [monthly review](monthly-review.md), and each quarter score the [wheel of life](wheel-of-life.md). The rows that ship with this template are five years of example data, so replace them with your own.
`,
  },
  {
    path: 'journal/monthly-review.md',
    content: `---
type: Dataset
title: Monthly review
description: One row a month scoring how life felt, with the habits behind it.
tags: [journal, review]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    mood: { type: number }
    energy: { type: number }
    stress: { type: number }
    sleep_hours: { type: number }
    exercise_days: { type: number }
    meditation_days: { type: number }
    alcohol_units_week: { type: number }
    screen_time_hours: { type: number }
---

# Monthly review

Score mood, energy and stress from 1 to 10 for the month as a whole. Sleep and screen time are daily averages, alcohol is units in a typical week.

| date | mood | energy | stress | sleep_hours | exercise_days | meditation_days | alcohol_units_week | screen_time_hours |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2021-10-31 | 5.4 | 5 | 7.1 | 6.4 | 6 | 0 | 15 | 4.4 |
| 2021-11-30 | 5.5 | 4.4 | 6.9 | 6.5 | 4 | 0 | 17 | 4.5 |
| 2021-12-31 | 5.4 | 4.4 | 7.2 | 6.5 | 5 | 0 | 20 | 4.6 |
| 2022-01-31 | 5 | 4.9 | 7.1 | 6.4 | 4 | 0 | 16 | 4.4 |
| 2022-02-28 | 5.5 | 5 | 7.1 | 6.6 | 5 | 0 | 16 | 4.4 |
| 2022-03-31 | 6.1 | 5.6 | 7.3 | 6.4 | 7 | 0 | 16 | 4.3 |
| 2022-04-30 | 6 | 5.2 | 7.6 | 6.5 | 7 | 0 | 15 | 4.3 |
| 2022-05-31 | 6.2 | 5.5 | 7.1 | 6.6 | 10 | 0 | 15 | 4.1 |
| 2022-06-30 | 6.2 | 5.8 | 7 | 6.6 | 9 | 0 | 13 | 4.3 |
| 2022-07-31 | 6.1 | 5.4 | 6.3 | 6.7 | 10 | 0 | 13 | 4.3 |
| 2022-08-31 | 6 | 5.3 | 6.4 | 6.7 | 10 | 0 | 12 | 4.2 |
| 2022-09-30 | 5.8 | 5.8 | 6.3 | 6.7 | 11 | 0 | 14 | 4.3 |
| 2022-10-31 | 6 | 5.4 | 6.5 | 6.6 | 9 | 0 | 14 | 3.9 |
| 2022-11-30 | 5.5 | 5.5 | 6.2 | 6.8 | 9 | 0 | 13 | 4 |
| 2022-12-31 | 6 | 5.4 | 6.3 | 6.7 | 10 | 1 | 17 | 4 |
| 2023-01-31 | 5.7 | 5.2 | 6.6 | 6.7 | 9 | 0 | 12 | 3.9 |
| 2023-02-28 | 5.6 | 5.5 | 6.3 | 6.7 | 9 | 3 | 13 | 3.8 |
| 2023-03-31 | 6.5 | 6.1 | 6.5 | 6.7 | 12 | 5 | 11 | 3.8 |
| 2023-04-30 | 6.5 | 5.9 | 6.7 | 6.8 | 11 | 4 | 11 | 3.7 |
| 2023-05-31 | 6.7 | 5.7 | 6 | 6.9 | 11 | 3 | 13 | 3.6 |
| 2023-06-30 | 6.3 | 6.1 | 6.1 | 6.7 | 12 | 4 | 13 | 3.6 |
| 2023-07-31 | 6.8 | 6 | 5.7 | 6.9 | 13 | 6 | 11 | 3.5 |
| 2023-08-31 | 6.6 | 6 | 6 | 7 | 12 | 5 | 12 | 3.6 |
| 2023-09-30 | 6.9 | 6.2 | 5.4 | 6.9 | 14 | 6 | 10 | 3.5 |
| 2023-10-31 | 6.6 | 6.3 | 6 | 6.8 | 12 | 9 | 12 | 3.7 |
| 2023-11-30 | 6.3 | 6.2 | 5.9 | 6.9 | 12 | 9 | 11 | 3.5 |
| 2023-12-31 | 6.2 | 5.8 | 5.3 | 6.9 | 12 | 8 | 15 | 3.2 |
| 2024-01-31 | 6.7 | 6.1 | 5.8 | 7.1 | 13 | 10 | 9 | 3.5 |
| 2024-02-29 | 6.2 | 5.9 | 5.6 | 7 | 12 | 12 | 10 | 3.3 |
| 2024-03-31 | 6.7 | 6.9 | 6.2 | 7.1 | 14 | 9 | 10 | 3.4 |
| 2024-04-30 | 6.7 | 6.9 | 6.5 | 7.1 | 16 | 9 | 10 | 3.4 |
| 2024-05-31 | 6.7 | 6.5 | 5.1 | 7.1 | 15 | 11 | 10 | 3 |
| 2024-06-30 | 6.7 | 6.5 | 4.9 | 7 | 17 | 13 | 8 | 3.2 |
| 2024-07-31 | 6.9 | 6.7 | 5 | 7.1 | 16 | 12 | 8 | 3.1 |
| 2024-08-31 | 6.9 | 6.9 | 5.3 | 7.1 | 15 | 12 | 8 | 3.1 |
| 2024-09-30 | 7.4 | 6.8 | 5.3 | 7.2 | 16 | 13 | 9 | 3.1 |
| 2024-10-31 | 7.1 | 7.1 | 5 | 7.1 | 16 | 15 | 7 | 3 |
| 2024-11-30 | 6.8 | 6.7 | 5.3 | 7.1 | 16 | 16 | 7 | 3 |
| 2024-12-31 | 6.6 | 6.7 | 5 | 7.3 | 16 | 16 | 13 | 3 |
| 2025-01-31 | 6.6 | 6.6 | 4.4 | 7.1 | 16 | 14 | 7 | 2.7 |
| 2025-02-28 | 7.2 | 6.4 | 4.4 | 7.3 | 14 | 18 | 8 | 3 |
| 2025-03-31 | 7.7 | 7.2 | 5.8 | 7.1 | 18 | 17 | 8 | 2.7 |
| 2025-04-30 | 7.6 | 7.5 | 5.1 | 7.2 | 18 | 19 | 7 | 2.7 |
| 2025-05-31 | 7.3 | 7.3 | 4.8 | 7.3 | 18 | 17 | 7 | 2.7 |
| 2025-06-30 | 7.2 | 7.3 | 5 | 7.3 | 19 | 17 | 8 | 2.8 |
| 2025-07-31 | 7.6 | 7.3 | 4.5 | 7.4 | 20 | 17 | 6 | 2.8 |
| 2025-08-31 | 7.8 | 7.4 | 4.4 | 7.4 | 18 | 18 | 6 | 2.7 |
| 2025-09-30 | 7.5 | 7.2 | 4.6 | 7.5 | 18 | 20 | 6 | 2.8 |
| 2025-10-31 | 7.7 | 7.3 | 4.2 | 7.3 | 19 | 20 | 5 | 2.5 |
| 2025-11-30 | 7.1 | 7.2 | 4.1 | 7.5 | 17 | 21 | 6 | 2.7 |
| 2025-12-31 | 7.5 | 7.1 | 4.3 | 7.4 | 19 | 21 | 11 | 2.7 |
| 2026-01-31 | 7.3 | 6.9 | 4.1 | 7.5 | 18 | 23 | 7 | 2.4 |
| 2026-02-28 | 7.1 | 6.9 | 4 | 7.5 | 19 | 23 | 5 | 2.6 |
| 2026-03-31 | 7.6 | 7.6 | 5.2 | 7.3 | 19 | 24 | 5 | 2.4 |
| 2026-04-30 | 7.9 | 7.8 | 4.6 | 7.4 | 20 | 22 | 5 | 2.4 |
| 2026-05-31 | 8.1 | 7.6 | 4.1 | 7.4 | 20 | 24 | 4 | 2.5 |
| 2026-06-30 | 8.1 | 7.5 | 4.4 | 7.4 | 21 | 24 | 5 | 2.4 |
| 2026-07-31 | 8 | 8 | 3.9 | 7.5 | 22 | 24 | 5 | 2.2 |
| 2026-08-31 | 7.6 | 7.5 | 4.3 | 7.4 | 20 | 22 | 6 | 2.5 |
| 2026-09-30 | 7.9 | 7.8 | 4 | 7.5 | 21 | 24 | 5 | 2.3 |
`,
  },
  {
    path: 'journal/wheel-of-life.md',
    content: `---
type: Dataset
title: Wheel of life
description: A score out of 10 for each area of life, every quarter.
tags: [journal, review]
dataset:
  key: [date, area]
  columns:
    date: { type: date, required: true }
    area: { type: enum, values: [health, career, money, relationships, growth], required: true }
    score: { type: number, required: true }
---

# Wheel of life

At the end of each quarter, score each area from 1 (needs a lot of work) to 10 (as good as it gets). Half points are fine.

| date | area | score |
| --- | --- | --- |
| 2021-12-31 | health | 4 |
| 2021-12-31 | career | 5 |
| 2021-12-31 | money | 4.5 |
| 2021-12-31 | relationships | 6 |
| 2021-12-31 | growth | 4.5 |
| 2022-03-31 | health | 4 |
| 2022-03-31 | career | 5.5 |
| 2022-03-31 | money | 4.5 |
| 2022-03-31 | relationships | 6 |
| 2022-03-31 | growth | 5 |
| 2022-06-30 | health | 5 |
| 2022-06-30 | career | 5 |
| 2022-06-30 | money | 5 |
| 2022-06-30 | relationships | 6 |
| 2022-06-30 | growth | 4.5 |
| 2022-09-30 | health | 5 |
| 2022-09-30 | career | 5.5 |
| 2022-09-30 | money | 5 |
| 2022-09-30 | relationships | 6.5 |
| 2022-09-30 | growth | 5 |
| 2022-12-31 | health | 5 |
| 2022-12-31 | career | 5.5 |
| 2022-12-31 | money | 4.5 |
| 2022-12-31 | relationships | 7 |
| 2022-12-31 | growth | 5.5 |
| 2023-03-31 | health | 5.5 |
| 2023-03-31 | career | 4.5 |
| 2023-03-31 | money | 5 |
| 2023-03-31 | relationships | 6.5 |
| 2023-03-31 | growth | 5.5 |
| 2023-06-30 | health | 6 |
| 2023-06-30 | career | 4 |
| 2023-06-30 | money | 5.5 |
| 2023-06-30 | relationships | 7 |
| 2023-06-30 | growth | 6 |
| 2023-09-30 | health | 6 |
| 2023-09-30 | career | 6 |
| 2023-09-30 | money | 5.5 |
| 2023-09-30 | relationships | 7.5 |
| 2023-09-30 | growth | 6.5 |
| 2023-12-31 | health | 6 |
| 2023-12-31 | career | 7 |
| 2023-12-31 | money | 5.5 |
| 2023-12-31 | relationships | 7 |
| 2023-12-31 | growth | 5.5 |
| 2024-03-31 | health | 6 |
| 2024-03-31 | career | 7 |
| 2024-03-31 | money | 6.5 |
| 2024-03-31 | relationships | 7 |
| 2024-03-31 | growth | 6 |
| 2024-06-30 | health | 7 |
| 2024-06-30 | career | 7 |
| 2024-06-30 | money | 6.5 |
| 2024-06-30 | relationships | 8 |
| 2024-06-30 | growth | 6.5 |
| 2024-09-30 | health | 7 |
| 2024-09-30 | career | 7 |
| 2024-09-30 | money | 6 |
| 2024-09-30 | relationships | 8 |
| 2024-09-30 | growth | 7 |
| 2024-12-31 | health | 7 |
| 2024-12-31 | career | 7 |
| 2024-12-31 | money | 7 |
| 2024-12-31 | relationships | 7.5 |
| 2024-12-31 | growth | 7.5 |
| 2025-03-31 | health | 8 |
| 2025-03-31 | career | 8 |
| 2025-03-31 | money | 7 |
| 2025-03-31 | relationships | 8.5 |
| 2025-03-31 | growth | 7 |
| 2025-06-30 | health | 8 |
| 2025-06-30 | career | 8 |
| 2025-06-30 | money | 7.5 |
| 2025-06-30 | relationships | 8 |
| 2025-06-30 | growth | 7.5 |
| 2025-09-30 | health | 8 |
| 2025-09-30 | career | 7.5 |
| 2025-09-30 | money | 7.5 |
| 2025-09-30 | relationships | 8 |
| 2025-09-30 | growth | 8 |
| 2025-12-31 | health | 8.5 |
| 2025-12-31 | career | 7.5 |
| 2025-12-31 | money | 7.5 |
| 2025-12-31 | relationships | 8.5 |
| 2025-12-31 | growth | 7 |
| 2026-03-31 | health | 8.5 |
| 2026-03-31 | career | 7 |
| 2026-03-31 | money | 7.5 |
| 2026-03-31 | relationships | 9 |
| 2026-03-31 | growth | 7.5 |
| 2026-06-30 | health | 8 |
| 2026-06-30 | career | 7.5 |
| 2026-06-30 | money | 7.5 |
| 2026-06-30 | relationships | 8.5 |
| 2026-06-30 | growth | 7.5 |
| 2026-09-30 | health | 9 |
| 2026-09-30 | career | 8 |
| 2026-09-30 | money | 8 |
| 2026-09-30 | relationships | 9 |
| 2026-09-30 | growth | 8 |
`,
  },
  {
    path: 'journal/decisions.md',
    content: `---
type: Dataset
title: Decisions
description: Decisions worth remembering, why they were made and when to look at them again.
tags: [journal, decisions]
dataset:
  columns:
    date: { type: date, required: true }
    decision: { type: text, required: true }
    why: { type: text }
    revisit: { type: date }
---

# Decisions

| date | decision | why | revisit |
| --- | --- | --- | --- |
| 2021-10-04 | Start a monthly review | Months were blurring together | 2022-04-01 |
| 2021-11-01 | Take on freelance product work on the side | Want income that is not tied to one employer | 2022-11-01 |
| 2021-11-15 | Cut alcohol to weekends only | Sleep and mood were worse midweek | 2022-02-15 |
| 2022-01-10 | Join a running club | Wanted accountability and friends to train with | 2022-07-10 |
| 2022-05-23 | Take the new job at Northwind | Better team and a clear path to lead | 2023-05-23 |
| 2022-09-05 | Phone stays out of the bedroom | Scrolling until midnight | 2023-03-05 |
| 2023-01-09 | Ten minutes of meditation each morning | Stress from work was carrying into evenings | 2023-07-09 |
| 2023-06-12 | Say no to weekend work | Burnt out in spring | 2024-01-12 |
| 2023-11-20 | Book a holiday every quarter | Kept putting off time away | 2024-11-20 |
| 2024-03-04 | Raise freelance day rate | Booked up three months ahead | 2025-03-04 |
| 2024-08-19 | Weekly call with Dad | Only spoke every few weeks | 2025-08-19 |
| 2025-02-10 | Accept the lead role at Meridian | Bigger scope and better pay | 2026-02-10 |
| 2025-07-07 | Train for a marathon | Running felt easy, wanted a bigger goal | 2026-04-26 |
| 2026-01-05 | Four day week in summer for the side business | Revenue covers it and energy matters more | 2026-10-31 |
| 2026-06-01 | Learn to cook ten new recipes this year | Eating the same things on repeat | 2026-12-31 |
`,
  },
  {
    path: 'journal/daily/template.md',
    content: `---
tags: [journal, daily]
date:
---

# Daily note

## Plan

-

## Notes

## Done

## Follow-up
`,
  },
  {
    path: 'journal/weekly-review.md',
    content: `---
tags: [journal, review]
---

# Weekly review

## Wins

## Open loops

## Decisions

## Next week
`,
  },
  {
    path: 'journal/dashboard.md',
    content: `---
type: Dashboard
title: Life dashboard
description: How life is going month by month, the habits behind it and decisions due another look.
---

# Life dashboard

Reads [Monthly review](monthly-review.md), [Wheel of life](wheel-of-life.md) and [Decisions](decisions.md).

\`\`\`caedora-dashboard
data:
  review: monthly-review.md
  wheel: wheel-of-life.md
  decisions: decisions.md
rows:
  - columns: 4
    items:
      - stat: { label: Mood (out of 10), source: review, latest: date, value: avg(mood), format: number, trend: true, sparkline: true }
      - stat: { label: Stress (out of 10), source: review, latest: date, value: avg(stress), format: number, trend: true, sparkline: true }
      - stat: { label: Sleep (hours), source: review, latest: date, value: avg(sleep_hours), format: number, trend: true, sparkline: true }
      - stat: { label: Life score (out of 10), source: wheel, latest: date, value: avg(score), format: number, trend: true, sparkline: true }
  - columns: 1
    items:
      - line:
          title: Wheel of life
          description: Quarterly score for each area
          source: wheel
          x: date
          y: avg(score)
          series: area
          curve: linear
          format: number
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - line: { title: Mood, source: review, x: month(date), y: avg(mood), format: number, ranges: [12m, 3y, all] }
      - line: { title: Stress, source: review, x: month(date), y: avg(stress), format: number, ranges: [12m, 3y, all] }
  - columns: 2
    items:
      - bar: { title: Exercise days per month, source: review, x: month(date), y: sum(exercise_days), format: integer, ranges: [12m, 3y, all] }
      - bar: { title: Meditation days per month, source: review, x: month(date), y: sum(meditation_days), format: integer, ranges: [12m, 3y, all] }
  - columns: 2
    items:
      - bar: { title: Alcohol units per week, description: Average for each year, source: review, x: year(date), y: avg(alcohol_units_week), format: number }
      - bar: { title: Screen time per day (hours), description: Average for each year, source: review, x: year(date), y: avg(screen_time_hours), format: number }
  - columns: 2
    items:
      - table:
          title: This quarter
          source: wheel
          latest: date
          columns: [area, score]
          sort: -score
      - list: { title: Decisions to revisit, source: decisions, where: revisit >= today(), label: decision, detail: revisit, sort: revisit, limit: 5 }
\`\`\`
`,
  },
  {
    path: 'journal/AGENTS.md',
    content: `# Journal guidance

Help identify patterns across daily notes, preserve uncertainty, and turn repeated open loops into clear next actions.

- monthly-review.md, wheel-of-life.md and decisions.md are Datasets. Add rows rather than editing old ones and keep ISO dates (YYYY-MM-DD).
- Treat mood, stress and sleep as the user's own record. Do not diagnose or give medical advice.
`,
  },
]

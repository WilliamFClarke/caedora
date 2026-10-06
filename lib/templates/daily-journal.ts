import type { TemplateFile } from '../vault-templates'

/**
 * Daily journal template. Check ins, habits and decisions are Datasets that
 * dashboard.md reads. The rows are illustrative examples to replace.
 */

export const DAILY_JOURNAL_FILES: TemplateFile[] = [
  {
    path: 'journal/README.md',
    content: `# Daily journal

Open the [journal dashboard](dashboard.md) for your mood, sleep and habits over time and the decisions due a second look.

Use this folder for daily notes, weekly reviews, decisions and small habit loops. Log a line in [Check ins](check-ins.md) each day and a row in [Habits](habits.md) for each habit you kept. The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'journal/check-ins.md',
    content: `---
type: Dataset
title: Check ins
description: A daily line on mood, energy and sleep.
tags: [journal, habits]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    mood: { type: number }
    energy: { type: number }
    sleep_hours: { type: number }
    notes: { type: text }
---

# Check ins

Score mood and energy from 1 (low) to 5 (great).

| date | mood | energy | sleep_hours | notes |
| --- | --- | --- | --- | --- |
| 2026-09-21 | 3 | 3 | 6.5 | |
| 2026-09-22 | 4 | 3 | 7.5 | |
| 2026-09-23 | 4 | 4 | 7 | |
| 2026-09-24 | 2 | 2 | 5.5 | Late night |
| 2026-09-25 | 3 | 3 | 7 | |
| 2026-09-26 | 5 | 4 | 8 | Walk with friends |
| 2026-09-27 | 4 | 4 | 8.5 | |
| 2026-09-28 | 3 | 3 | 7 | |
| 2026-09-29 | 4 | 4 | 7.5 | |
| 2026-09-30 | 4 | 3 | 6.5 | |
| 2026-10-01 | 3 | 3 | 7 | |
| 2026-10-02 | 4 | 4 | 7.5 | |
| 2026-10-03 | 5 | 5 | 8 | |
| 2026-10-04 | 4 | 4 | 7.5 | |
`,
  },
  {
    path: 'journal/habits.md',
    content: `---
type: Dataset
title: Habits
description: One row for each habit kept on a day.
tags: [journal, habits]
dataset:
  key: [date, habit]
  columns:
    date: { type: date, required: true }
    habit: { type: enum, values: [exercise, reading, meditation, journalling, no-phone-in-bed], required: true }
---

# Habits

Add a row only for the habits you kept. Add your own habits to the list in the frontmatter.

| date | habit |
| --- | --- |
| 2026-09-22 | exercise |
| 2026-09-22 | journalling |
| 2026-09-23 | reading |
| 2026-09-23 | journalling |
| 2026-09-25 | exercise |
| 2026-09-25 | meditation |
| 2026-09-26 | reading |
| 2026-09-27 | exercise |
| 2026-09-27 | no-phone-in-bed |
| 2026-09-28 | journalling |
| 2026-09-29 | exercise |
| 2026-09-29 | meditation |
| 2026-09-30 | reading |
| 2026-10-01 | journalling |
| 2026-10-01 | no-phone-in-bed |
| 2026-10-02 | exercise |
| 2026-10-03 | reading |
| 2026-10-03 | meditation |
| 2026-10-04 | exercise |
| 2026-10-04 | journalling |
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
| 2026-08-14 | Walk to work twice a week | More movement without extra time | 2026-10-14 |
| 2026-09-02 | Stop checking email after 7pm | Evenings felt rushed | 2026-11-02 |
| 2026-09-20 | Read before bed instead of scrolling | Better sleep | 2026-12-20 |
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
title: Journal dashboard
description: Mood, sleep, habits and decisions to revisit from the journal Datasets.
---

# Journal dashboard

Reads [Check ins](check-ins.md), [Habits](habits.md) and [Decisions](decisions.md).

\`\`\`caedora-dashboard
data:
  checkins: check-ins.md
  habits: habits.md
  decisions: decisions.md
rows:
  - columns: 4
    items:
      - stat: { label: Latest mood, source: checkins, latest: date, value: avg(mood), format: number, trend: true, sparkline: true }
      - stat: { label: Average mood, source: checkins, value: avg(mood), format: number }
      - stat: { label: Average sleep (hours), source: checkins, value: avg(sleep_hours), format: number }
      - stat: { label: Habits kept, source: habits, value: count(), format: integer }
  - columns: 2
    items:
      - line: { title: Mood, source: checkins, x: date, y: avg(mood), format: number, ranges: [3m, 12m, all] }
      - bar: { title: Sleep (hours), source: checkins, x: date, y: avg(sleep_hours), format: number, ranges: [3m, 12m, all] }
  - columns: 2
    items:
      - bar: { title: Habits kept, source: habits, x: habit, y: count(), format: integer, horizontal: true }
      - list: { title: Decisions to revisit, source: decisions, label: decision, detail: revisit, sort: revisit, limit: 5 }
\`\`\`
`,
  },
  {
    path: 'journal/AGENTS.md',
    content: `# Journal guidance

Help identify patterns across daily notes, preserve uncertainty, and turn repeated open loops into clear next actions.

- check-ins.md, habits.md and decisions.md are Datasets. Add rows rather than editing old ones and keep ISO dates (YYYY-MM-DD).
- Treat mood and sleep as the user's own record. Do not diagnose or give medical advice.
`,
  },
]

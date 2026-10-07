import type { TemplateFile } from '../vault-templates'

/**
 * Career and job search template. Five years of example pay history and two
 * job searches, read by dashboard.md. Replace the rows with your own.
 */

export const JOB_SEARCH_FILES: TemplateFile[] = [
  {
    path: 'career/README.md',
    content: `# Career and job search

Open the [career dashboard](dashboard.md) for your pay over time and how each job search went.

Add a row to [Salary history](salary-history.md) whenever your pay, title or employer changes. When you look for a new role, log each one in [Applications](applications.md) and each interview in [Interviews](interviews.md). The rows that ship with this template are five years of example data, including two job searches, so replace them with your own.
`,
  },
  {
    path: 'career/salary-history.md',
    content: `---
type: Dataset
title: Salary history
description: Each job and pay change, with base salary and target bonus.
tags: [career, salary]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    company: { type: text, required: true }
    title: { type: text }
    level: { type: enum, values: [associate, mid, senior, lead, principal, director] }
    salary: { type: currency, currency: GBP, required: true }
    bonus: { type: currency, currency: GBP }
---

# Salary history

Add a row whenever your pay, title or employer changes. Salary is the yearly base before tax; bonus is the yearly target.

| date | company | title | level | salary | bonus |
| --- | --- | --- | --- | --- | --- |
| 2021-10-01 | Kestrel | Associate product manager | associate | 42,000.00 | 0.00 |
| 2022-04-01 | Kestrel | Associate product manager | associate | 43,500.00 | 1,000.00 |
| 2022-07-04 | Northwind | Product manager | mid | 52,000.00 | 2,500.00 |
| 2023-04-01 | Northwind | Product manager | mid | 55,000.00 | 3,000.00 |
| 2024-04-01 | Northwind | Senior product manager | senior | 63,000.00 | 4,500.00 |
| 2025-03-03 | Meridian | Lead product manager | lead | 78,000.00 | 7,000.00 |
| 2026-04-01 | Meridian | Lead product manager | lead | 84,000.00 | 8,500.00 |
`,
  },
  {
    path: 'career/applications.md',
    content: `---
type: Dataset
title: Applications
description: Every role applied for, where it came from and how far it got.
tags: [career, applications]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    company: { type: text, required: true }
    role: { type: text }
    search: { type: text }
    applied: { type: date }
    source: { type: enum, values: [job-board, linkedin, website, recruiter, referral] }
    stage_reached: { type: enum, values: [applied, screen, interview, final, offer], required: true }
    status: { type: enum, values: [open, no-reply, rejected, withdrawn, declined, accepted], required: true }
    salary_band: { type: currency, currency: GBP }
---

# Applications

search groups the applications from one job hunt. stage_reached is the furthest step the application got to. status says how it ended, or open while it is still running.

| id | company | role | search | applied | source | stage_reached | status | salary_band |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bluebird-2022 | Bluebird | Product manager | Spring 2022 | 2022-03-09 | website | screen | rejected | 56,000.00 |
| summit-2022 | Summit | Product manager | Spring 2022 | 2022-03-12 | job-board | interview | rejected | 47,000.00 |
| harbour-labs-2022 | Harbour Labs | Product manager | Spring 2022 | 2022-03-13 | website | applied | no-reply | 48,000.00 |
| oakline-2022 | Oakline | Product manager | Spring 2022 | 2022-03-16 | linkedin | applied | rejected | 52,000.00 |
| willow-health-2022 | Willow Health | Product manager | Spring 2022 | 2022-03-19 | website | applied | rejected | 53,000.00 |
| fernway-2022 | Fernway | Product manager | Spring 2022 | 2022-03-21 | job-board | final | rejected | 49,000.00 |
| copperleaf-2022 | Copperleaf | Product manager | Spring 2022 | 2022-03-24 | job-board | final | rejected | 52,000.00 |
| tidal-2022 | Tidal | Product manager | Spring 2022 | 2022-03-28 | job-board | applied | rejected | 46,000.00 |
| brightpath-2022 | Brightpath | Product manager | Spring 2022 | 2022-03-31 | job-board | applied | no-reply | 51,000.00 |
| ashgrove-2022 | Ashgrove | Product manager | Spring 2022 | 2022-04-01 | linkedin | screen | rejected | 46,000.00 |
| northwind-2022 | Northwind | Product manager | Spring 2022 | 2022-04-06 | job-board | offer | accepted | 55,000.00 |
| lumen-2022 | Lumen | Product manager | Spring 2022 | 2022-04-07 | job-board | applied | rejected | 53,000.00 |
| quarry-2022 | Quarry | Product manager | Spring 2022 | 2022-04-10 | linkedin | interview | rejected | 53,000.00 |
| redstart-2022 | Redstart | Product manager | Spring 2022 | 2022-04-13 | job-board | interview | rejected | 51,000.00 |
| silverline-2022 | Silverline | Product manager | Spring 2022 | 2022-04-16 | job-board | screen | rejected | 56,000.00 |
| pebble-2022 | Pebble | Product manager | Spring 2022 | 2022-04-17 | website | screen | rejected | 50,000.00 |
| orchard-2022 | Orchard | Product manager | Spring 2022 | 2022-04-19 | job-board | screen | rejected | 46,000.00 |
| beacon-2022 | Beacon | Product manager | Spring 2022 | 2022-04-24 | website | applied | no-reply | 46,000.00 |
| kite-2022 | Kite | Product manager | Spring 2022 | 2022-04-24 | website | applied | no-reply | 55,000.00 |
| marlow-2022 | Marlow | Product manager | Spring 2022 | 2022-04-28 | linkedin | screen | rejected | 52,000.00 |
| thistle-2022 | Thistle | Product manager | Spring 2022 | 2022-04-30 | website | applied | no-reply | 55,000.00 |
| granite-2022 | Granite | Product manager | Spring 2022 | 2022-05-04 | referral | screen | rejected | 51,000.00 |
| larch-2022 | Larch | Product manager | Spring 2022 | 2022-05-07 | linkedin | interview | rejected | 54,000.00 |
| halcyon-2022 | Halcyon | Product manager | Spring 2022 | 2022-05-09 | job-board | applied | rejected | 54,000.00 |
| juniper-2022 | Juniper | Product manager | Spring 2022 | 2022-05-13 | job-board | screen | rejected | 55,000.00 |
| wren-2022 | Wren | Product manager | Spring 2022 | 2022-05-15 | job-board | screen | rejected | 53,000.00 |
| meridian-2025 | Meridian | Lead product manager | Winter 2024-25 | 2024-12-04 | referral | offer | accepted | 78,000.00 |
| atlas-2025 | Atlas | Senior product manager | Winter 2024-25 | 2024-12-08 | referral | final | rejected | 75,000.00 |
| fathom-2025 | Fathom | Group product manager | Winter 2024-25 | 2024-12-13 | referral | offer | declined | 73,000.00 |
| corvid-2025 | Corvid | Group product manager | Winter 2024-25 | 2024-12-14 | recruiter | offer | declined | 79,000.00 |
| elm-street-2025 | Elm Street | Senior product manager | Winter 2024-25 | 2024-12-20 | recruiter | applied | no-reply | 80,000.00 |
| highland-2025 | Highland | Lead product manager | Winter 2024-25 | 2024-12-23 | linkedin | interview | rejected | 78,000.00 |
| sparrow-2025 | Sparrow | Lead product manager | Winter 2024-25 | 2024-12-26 | linkedin | applied | no-reply | 77,000.00 |
| vantage-2025 | Vantage | Lead product manager | Winter 2024-25 | 2025-01-02 | linkedin | interview | rejected | 74,000.00 |
| ridgeway-2025 | Ridgeway | Group product manager | Winter 2024-25 | 2025-01-06 | referral | offer | declined | 79,000.00 |
| saltmarsh-2025 | Saltmarsh | Senior product manager | Winter 2024-25 | 2025-01-09 | recruiter | interview | rejected | 73,000.00 |
| calder-2025 | Calder | Senior product manager | Winter 2024-25 | 2025-01-13 | recruiter | screen | rejected | 74,000.00 |
| morrow-2025 | Morrow | Lead product manager | Winter 2024-25 | 2025-01-15 | linkedin | final | rejected | 76,000.00 |
| pinecrest-2025 | Pinecrest | Senior product manager | Winter 2024-25 | 2025-01-22 | website | offer | declined | 77,000.00 |
| lattice-2025 | Lattice | Senior product manager | Winter 2024-25 | 2025-01-25 | recruiter | interview | rejected | 78,000.00 |
`,
  },
  {
    path: 'career/interviews.md',
    content: `---
type: Dataset
title: Interviews
description: Each interview, the stage it was and how it went.
tags: [career, interviews]
dataset:
  columns:
    date: { type: date, required: true }
    application: { type: ref, to: applications.md, required: true }
    stage: { type: enum, values: [screen, interview, final], required: true }
    outcome: { type: enum, values: [pending, passed, rejected] }
    confidence: { type: number }
    notes: { type: text }
---

# Interviews

confidence is how well you felt it went, from 1 to 5, written down straight after.

| date | application | stage | outcome | confidence | notes |
| --- | --- | --- | --- | --- | --- |
| 2022-03-19 | bluebird-2022 | screen | rejected | 2 |  |
| 2022-03-22 | summit-2022 | screen | passed | 2 |  |
| 2022-03-28 | summit-2022 | interview | rejected | 4 |  |
| 2022-03-28 | fernway-2022 | screen | passed | 2 |  |
| 2022-04-01 | copperleaf-2022 | screen | passed | 2 |  |
| 2022-04-05 | fernway-2022 | interview | passed | 3 |  |
| 2022-04-09 | copperleaf-2022 | interview | passed | 3 |  |
| 2022-04-12 | fernway-2022 | final | rejected | 4 |  |
| 2022-04-12 | ashgrove-2022 | screen | rejected | 3 |  |
| 2022-04-16 | copperleaf-2022 | final | rejected | 2 |  |
| 2022-04-16 | quarry-2022 | screen | passed | 4 |  |
| 2022-04-18 | northwind-2022 | screen | passed | 2 |  |
| 2022-04-23 | redstart-2022 | screen | passed | 4 |  |
| 2022-04-24 | silverline-2022 | screen | rejected | 3 |  |
| 2022-04-26 | pebble-2022 | screen | rejected | 2 |  |
| 2022-04-26 | orchard-2022 | screen | rejected | 4 |  |
| 2022-04-27 | northwind-2022 | interview | passed | 2 |  |
| 2022-04-27 | quarry-2022 | interview | rejected | 3 |  |
| 2022-05-01 | redstart-2022 | interview | rejected | 2 |  |
| 2022-05-06 | marlow-2022 | screen | rejected | 2 |  |
| 2022-05-08 | northwind-2022 | final | passed | 2 |  |
| 2022-05-13 | granite-2022 | screen | rejected | 3 |  |
| 2022-05-14 | larch-2022 | screen | passed | 4 |  |
| 2022-05-23 | larch-2022 | interview | rejected | 3 |  |
| 2022-05-23 | wren-2022 | screen | rejected | 4 |  |
| 2022-05-24 | juniper-2022 | screen | rejected | 2 |  |
| 2024-12-14 | meridian-2025 | screen | passed | 4 |  |
| 2024-12-19 | atlas-2025 | screen | passed | 4 |  |
| 2024-12-20 | fathom-2025 | screen | passed | 4 |  |
| 2024-12-22 | meridian-2025 | interview | passed | 5 |  |
| 2024-12-25 | corvid-2025 | screen | passed | 4 |  |
| 2024-12-30 | meridian-2025 | final | passed | 4 |  |
| 2024-12-30 | atlas-2025 | interview | passed | 4 |  |
| 2024-12-30 | highland-2025 | screen | passed | 3 |  |
| 2025-01-01 | fathom-2025 | interview | passed | 4 |  |
| 2025-01-02 | corvid-2025 | interview | passed | 5 |  |
| 2025-01-05 | highland-2025 | interview | rejected | 3 |  |
| 2025-01-07 | atlas-2025 | final | rejected | 3 |  |
| 2025-01-09 | fathom-2025 | final | passed | 5 |  |
| 2025-01-12 | corvid-2025 | final | passed | 5 |  |
| 2025-01-13 | vantage-2025 | screen | passed | 4 |  |
| 2025-01-14 | ridgeway-2025 | screen | passed | 3 |  |
| 2025-01-18 | saltmarsh-2025 | screen | passed | 4 |  |
| 2025-01-19 | vantage-2025 | interview | rejected | 4 |  |
| 2025-01-20 | calder-2025 | screen | rejected | 5 |  |
| 2025-01-24 | ridgeway-2025 | interview | passed | 5 |  |
| 2025-01-25 | morrow-2025 | screen | passed | 5 |  |
| 2025-01-30 | saltmarsh-2025 | interview | rejected | 5 |  |
| 2025-01-31 | pinecrest-2025 | screen | passed | 3 |  |
| 2025-02-01 | ridgeway-2025 | final | passed | 3 |  |
| 2025-02-02 | lattice-2025 | screen | passed | 3 |  |
| 2025-02-04 | morrow-2025 | interview | passed | 3 |  |
| 2025-02-10 | pinecrest-2025 | interview | passed | 5 |  |
| 2025-02-11 | lattice-2025 | interview | rejected | 3 |  |
| 2025-02-12 | morrow-2025 | final | rejected | 5 |  |
| 2025-02-18 | pinecrest-2025 | final | passed | 5 |  |
`,
  },
  {
    path: 'career/company-research/template.md',
    content: `---
tags: [career, company]
status: researching
---

# Company

## Role fit

## People

## Questions
`,
  },
  {
    path: 'career/dashboard.md',
    content: `---
type: Dashboard
title: Career dashboard
description: Pay and progression over time, and how each job search went.
---

# Career dashboard

Reads [Salary history](salary-history.md), [Applications](applications.md) and [Interviews](interviews.md).

\`\`\`caedora-dashboard
data:
  salary: salary-history.md
  applications: applications.md
  interviews: interviews.md
rows:
  - columns: 4
    items:
      - stat: { label: Base salary, source: salary, latest: date, value: sum(salary), trend: true, sparkline: true }
      - stat: { label: Salary plus bonus, source: salary, latest: date, value: sum(salary) + sum(bonus), trend: true }
      - stat: { label: Pay rise since 2021, source: salary, value: max(salary) - min(salary) }
      - stat: { label: Offers received, source: applications, where: stage_reached = offer, value: count(), format: integer }
  - columns: 1
    items:
      - line:
          title: Salary and bonus
          source: salary
          x: date
          y: sum(salary) + sum(bonus)
          curve: step
          ranges: [3y, all]
  - columns: 2
    items:
      - bar:
          title: Applications by how far they got
          description: The second search needed fewer applications to land a better role
          source: applications
          x: search
          y: count()
          series: stage_reached
          stacked: true
          format: integer
      - pie: { title: Where offers and finals came from, source: applications, where: "stage_reached in [final, offer]", label: source, value: count(), format: integer }
  - columns: 2
    items:
      - bar: { title: Interviews by stage, source: interviews, x: stage, y: count(), series: outcome, stacked: true, format: integer }
      - bar: { title: Interview confidence, description: Average out of 5 for each search, source: interviews, x: application.search, y: avg(confidence), format: number }
  - columns: 1
    items:
      - table:
          title: Career history
          source: salary
          columns: [date, company, title, level, salary, bonus]
          sort: -date
\`\`\`
`,
  },
  {
    path: 'career/AGENTS.md',
    content: `# Career guidance

Use salary history, applications and interview notes to prepare concise next actions and tailored interview prep.

- salary-history.md, applications.md and interviews.md are Datasets. Keep the enum values and ISO dates (YYYY-MM-DD).
- Interviews point at an application by its id in applications.md.
- Keep salary figures private. Never share them outside the vault.
`,
  },
]

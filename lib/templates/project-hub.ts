import type { TemplateFile } from '../vault-templates'

/**
 * Project hub template. Projects and milestones are Datasets that
 * dashboard.md reads. The rows are illustrative examples to replace.
 */

export const PROJECT_HUB_FILES: TemplateFile[] = [
  {
    path: 'projects/README.md',
    content: `# Project hub

Open the [project dashboard](dashboard.md) for active projects, their progress and the milestones coming up.

Track active projects, specs, decisions, milestones and retrospectives here. Each project gets a row in [Projects](projects.md) and its key dates go in [Milestones](milestones.md). The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'projects/projects.md',
    content: `---
type: Dataset
title: Projects
description: Every project with its status, owner, due date, progress and next step.
tags: [projects, status]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text, required: true }
    status: { type: enum, values: [proposed, active, paused, done], required: true }
    owner: { type: text }
    due: { type: date }
    progress: { type: percent }
    next_step: { type: text }
---

# Projects

Progress is a rough percentage from 0 to 100.

| id | name | status | owner | due | progress | next_step |
| --- | --- | --- | --- | --- | --- | --- |
| website-refresh | Website refresh | active | Sam | 2026-11-30 | 60 | Review new home page copy |
| onboarding-guide | Onboarding guide | active | Priya | 2026-10-31 | 80 | Final proofread |
| pricing-review | Pricing review | active | Alex | 2026-12-15 | 25 | Gather competitor prices |
| office-move | Office move | paused | Sam | 2027-03-01 | 10 | Wait for lease decision |
| customer-survey | Customer survey | done | Priya | 2026-08-29 | 100 | |
| newsletter | Monthly newsletter | proposed | Alex | | 0 | Draft a brief |
`,
  },
  {
    path: 'projects/milestones.md',
    content: `---
type: Dataset
title: Milestones
description: Key dates for each project and whether they have been met.
tags: [projects, milestones]
dataset:
  columns:
    project: { type: ref, to: projects.md, required: true }
    milestone: { type: text, required: true }
    due: { type: date }
    status: { type: enum, values: [planned, in-progress, done], required: true }
---

# Milestones

| project | milestone | due | status |
| --- | --- | --- | --- |
| website-refresh | Wireframes signed off | 2026-09-12 | done |
| website-refresh | Copy written | 2026-10-17 | in-progress |
| website-refresh | Launch | 2026-11-30 | planned |
| onboarding-guide | First draft | 2026-09-26 | done |
| onboarding-guide | Published | 2026-10-31 | in-progress |
| pricing-review | Research complete | 2026-11-06 | planned |
| pricing-review | Recommendation | 2026-12-15 | planned |
| customer-survey | Results shared | 2026-08-29 | done |
`,
  },
  {
    path: 'projects/templates/project-brief.md',
    content: `---
tags: [projects, brief]
status: proposed
---

# Project brief

## Outcome

## Scope

## Milestones

## Risks
`,
  },
  {
    path: 'projects/templates/retro.md',
    content: `---
tags: [projects, retro]
---

# Retrospective

## What changed

## What worked

## What to improve

## Follow-ups
`,
  },
  {
    path: 'projects/dashboard.md',
    content: `---
type: Dashboard
title: Project dashboard
description: Active projects, progress and upcoming milestones from the project Datasets.
---

# Project dashboard

Reads [Projects](projects.md) and [Milestones](milestones.md).

\`\`\`caedora-dashboard
data:
  projects: projects.md
  milestones: milestones.md
rows:
  - columns: 4
    items:
      - stat: { label: Active projects, source: projects, where: status = active, value: count(), format: integer }
      - stat: { label: Average progress, source: projects, where: status = active, value: avg(progress) }
      - stat: { label: Open milestones, source: milestones, where: status != done, value: count(), format: integer }
      - stat: { label: Next deadline, source: milestones, where: status != done, value: min(due), format: date }
  - columns: 2
    items:
      - bar: { title: Progress by project, source: projects, where: status = active, x: name, y: sum(progress), horizontal: true }
      - pie: { title: Projects by status, source: projects, label: status, value: count() }
  - columns: 2
    items:
      - list: { title: Upcoming milestones, source: milestones, where: status != done, label: milestone, detail: due, sort: due, limit: 6 }
      - table:
          title: Active projects
          source: projects
          where: status = active
          columns: [name, owner, due, next_step]
          sort: due
\`\`\`
`,
  },
  {
    path: 'projects/AGENTS.md',
    content: `# Project planning guidance

Use briefs, milestones and retrospectives to keep recommendations grounded in current project state and documented decisions.

- projects.md and milestones.md are Datasets. Keep the status values and ISO dates (YYYY-MM-DD).
- Milestones point at a project by its id in projects.md. Ask before inventing a new project.
`,
  },
]

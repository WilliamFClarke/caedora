import type { TemplateFile } from '../vault-templates'

/**
 * Project hub template. Five years of example projects and sprints for a
 * product team, read by dashboard.md. Replace the rows with your own.
 */

export const PROJECT_HUB_FILES: TemplateFile[] = [
  {
    path: 'projects/README.md',
    content: `# Project hub

Open the [delivery dashboard](dashboard.md) for velocity, predictability, quality and the projects in flight.

Track active projects, specs, decisions, milestones and retrospectives here. Each project gets a row in [Projects](projects.md), each sprint a row in [Sprints](sprints.md), and the key dates of live projects go in [Milestones](milestones.md). The rows that ship with this template are five years of example data for a product team, so replace them with your own.
`,
  },
  {
    path: 'projects/projects.md',
    content: `---
type: Dataset
title: Projects
description: Every project with its type, team size, dates, how late it shipped and how happy stakeholders were.
tags: [projects, status]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text, required: true }
    type: { type: enum, values: [feature, platform, research, internal] }
    status: { type: enum, values: [planned, active, paused, done], required: true }
    team: { type: number }
    start: { type: date }
    due: { type: date }
    delivered: { type: date }
    days_late: { type: number }
    satisfaction: { type: number }
---

# Projects

days_late is negative when a project shipped early. satisfaction is the average stakeholder score out of 10 from the project retro.

| id | name | type | status | team | start | due | delivered | days_late | satisfaction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| checkout-redesign | Checkout redesign | feature | done | 3 | 2021-10-04 | 2021-12-27 | 2022-01-21 | 25 | 5.8 |
| search-relaunch | Search relaunch | feature | done | 5 | 2021-12-15 | 2022-03-23 | 2022-04-14 | 22 | 6.9 |
| billing-migration | Billing migration | platform | done | 3 | 2022-02-28 | 2022-04-25 | 2022-05-13 | 18 | 6.9 |
| mobile-onboarding | Mobile onboarding | feature | done | 3 | 2022-04-15 | 2022-07-08 | 2022-08-02 | 25 | 7.2 |
| design-system-v1 | Design system v1 | platform | done | 3 | 2022-06-08 | 2022-08-31 | 2022-09-17 | 17 | 6.5 |
| customer-interviews | Customer interviews | research | done | 2 | 2022-08-11 | 2022-11-10 | 2022-11-20 | 10 | 7.3 |
| reporting-api | Reporting API | feature | done | 4 | 2022-09-25 | 2023-01-01 | 2023-01-11 | 10 | 6.7 |
| incident-process | Incident process | internal | done | 1 | 2022-11-18 | 2022-12-30 | 2023-01-12 | 13 | 7.5 |
| data-warehouse-move | Data warehouse move | platform | done | 4 | 2023-01-07 | 2023-04-01 | 2023-04-18 | 17 | 7 |
| referral-scheme | Referral scheme | feature | done | 4 | 2023-02-19 | 2023-05-28 | 2023-06-03 | 6 | 6.8 |
| accessibility-audit | Accessibility audit | internal | done | 1 | 2023-04-07 | 2023-05-19 | 2023-06-01 | 13 | 7.2 |
| notifications-centre | Notifications centre | feature | done | 5 | 2023-05-23 | 2023-09-12 | 2023-09-22 | 10 | 7.5 |
| pricing-experiment | Pricing experiment | research | done | 2 | 2023-07-15 | 2023-10-14 | 2023-10-30 | 16 | 7.3 |
| single-sign-on | Single sign on | platform | done | 3 | 2023-08-22 | 2023-12-05 | 2023-12-22 | 17 | 7.1 |
| team-handbook | Team handbook | internal | done | 2 | 2023-10-09 | 2023-12-04 | 2023-12-11 | 7 | 7.1 |
| dashboard-builder | Dashboard builder | feature | done | 3 | 2023-11-16 | 2024-02-01 | 2024-02-16 | 15 | 7.9 |
| performance-budget | Performance budget | platform | done | 3 | 2024-01-08 | 2024-03-25 | 2024-04-11 | 17 | 7.6 |
| churn-deep-dive | Churn deep dive | research | done | 6 | 2024-02-11 | 2024-05-12 | 2024-05-28 | 16 | 7.2 |
| offline-mode | Offline mode | feature | done | 3 | 2024-03-30 | 2024-06-29 | 2024-07-11 | 12 | 8.1 |
| hiring-loop-refresh | Hiring loop refresh | internal | done | 1 | 2024-05-13 | 2024-07-08 | 2024-07-16 | 8 | 7.6 |
| audit-log | Audit log | platform | done | 5 | 2024-06-22 | 2024-10-05 | 2024-10-12 | 7 | 8.5 |
| integrations-marketplace | Integrations marketplace | feature | done | 3 | 2024-08-05 | 2024-09-30 | 2024-10-09 | 9 | 7.4 |
| usage-based-billing | Usage based billing | platform | done | 3 | 2024-09-13 | 2024-12-13 | 2024-12-20 | 7 | 8.1 |
| self-serve-upgrades | Self serve upgrades | feature | done | 4 | 2024-10-29 | 2025-01-14 | 2025-01-17 | 3 | 8.6 |
| ai-assistant-pilot | AI assistant pilot | research | done | 5 | 2024-12-03 | 2025-01-28 | 2025-02-07 | 10 | 8.4 |
| design-system-v2 | Design system v2 | platform | done | 5 | 2025-01-14 | 2025-03-11 | 2025-03-18 | 7 | 8.2 |
| admin-console | Admin console | feature | done | 5 | 2025-02-25 | 2025-05-27 | 2025-06-02 | 6 | 8 |
| status-page | Status page | internal | done | 2 | 2025-04-10 | 2025-05-15 | 2025-05-20 | 5 | 8 |
| public-api-v2 | Public API v2 | platform | done | 4 | 2025-05-21 | 2025-08-27 | 2025-08-30 | 3 | 8.1 |
| workflow-automation | Workflow automation | feature | done | 4 | 2025-06-29 | 2025-09-14 | 2025-09-18 | 4 | 8.1 |
| partner-portal | Partner portal | feature | done | 3 | 2025-08-02 | 2025-10-25 | 2025-10-29 | 4 | 8.4 |
| search-ranking | Search ranking | research | done | 3 | 2025-09-15 | 2025-11-24 | 2025-11-30 | 6 | 8 |
| cost-reduction | Cost reduction | platform | done | 6 | 2025-10-25 | 2025-12-27 | 2026-01-01 | 5 | 8.8 |
| customer-health-score | Customer health score | feature | done | 4 | 2025-12-11 | 2026-02-05 | 2026-02-08 | 3 | 8.5 |
| on-call-rota | On call rota | internal | done | 1 | 2026-01-13 | 2026-02-17 | 2026-02-22 | 5 | 8.5 |
| bulk-import | Bulk import | feature | done | 6 | 2026-02-25 | 2026-06-10 | 2026-06-11 | 1 | 8.5 |
| webhooks | Webhooks | platform | done | 3 | 2026-03-31 | 2026-07-21 | 2026-07-24 | 3 | 8.6 |
| template-gallery | Template gallery | feature | done | 2 | 2026-05-09 | 2026-08-22 | 2026-08-27 | 5 | 9.2 |
| enterprise-permissions | Enterprise permissions | feature | active | 3 | 2026-06-15 | 2026-10-23 |  |  |  |
| data-residency | Data residency | platform | active | 3 | 2026-07-23 | 2026-11-13 |  |  |  |
| usage-alerts | Usage alerts | feature | active | 3 | 2026-09-01 | 2026-12-15 |  |  |  |
| mobile-app-v3 | Mobile app v3 | feature | planned | 5 | 2026-11-02 | 2027-02-26 |  |  |  |
| soc2 | SOC 2 readiness | internal | planned | 2 | 2026-10-19 | 2027-01-29 |  |  |  |
`,
  },
  {
    path: 'projects/sprints.md',
    content: `---
type: Dataset
title: Sprints
description: Points committed and completed each fortnight, with bugs that reached customers and cycle time.
tags: [projects, sprints]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    team: { type: number }
    committed: { type: number }
    completed: { type: number }
    escaped_bugs: { type: number }
    cycle_days: { type: number }
---

# Sprints

Add a row on the last day of each sprint. escaped_bugs counts bugs customers found, cycle_days is the average days from starting a ticket to shipping it.

| date | team | committed | completed | escaped_bugs | cycle_days |
| --- | --- | --- | --- | --- | --- |
| 2021-10-15 | 4 | 26 | 18 | 9 | 6.3 |
| 2021-10-29 | 4 | 26 | 20 | 8 | 6.2 |
| 2021-11-12 | 4 | 25 | 20 | 7 | 6.5 |
| 2021-11-26 | 4 | 28 | 21 | 10 | 6.7 |
| 2021-12-10 | 4 | 27 | 19 | 9 | 6 |
| 2021-12-24 | 4 | 27 | 17 | 10 | 5.9 |
| 2022-01-07 | 4 | 25 | 20 | 10 | 6.1 |
| 2022-01-21 | 4 | 26 | 18 | 10 | 6.2 |
| 2022-02-04 | 4 | 26 | 21 | 8 | 6.4 |
| 2022-02-18 | 4 | 28 | 21 | 7 | 6.5 |
| 2022-03-04 | 4 | 28 | 21 | 10 | 6 |
| 2022-03-18 | 4 | 28 | 21 | 9 | 6.4 |
| 2022-04-01 | 4 | 28 | 22 | 8 | 5.7 |
| 2022-04-15 | 4 | 27 | 20 | 7 | 6.2 |
| 2022-04-29 | 4 | 27 | 21 | 7 | 6.4 |
| 2022-05-13 | 4 | 26 | 19 | 9 | 5.6 |
| 2022-05-27 | 4 | 26 | 21 | 8 | 5.9 |
| 2022-06-10 | 4 | 28 | 21 | 7 | 5.7 |
| 2022-06-24 | 4 | 27 | 22 | 6 | 5.5 |
| 2022-07-08 | 4 | 29 | 22 | 9 | 6 |
| 2022-07-22 | 4 | 28 | 23 | 8 | 5.7 |
| 2022-08-05 | 4 | 28 | 21 | 7 | 5.8 |
| 2022-08-19 | 4 | 30 | 23 | 7 | 5.8 |
| 2022-09-02 | 4 | 29 | 23 | 7 | 6 |
| 2022-09-16 | 4 | 27 | 22 | 8 | 5.9 |
| 2022-09-30 | 4 | 27 | 21 | 9 | 5.5 |
| 2022-10-14 | 4 | 28 | 21 | 9 | 5.7 |
| 2022-10-28 | 4 | 28 | 23 | 6 | 5.4 |
| 2022-11-11 | 4 | 29 | 22 | 6 | 5.9 |
| 2022-11-25 | 4 | 29 | 24 | 5 | 5.8 |
| 2022-12-09 | 4 | 30 | 23 | 7 | 5.7 |
| 2022-12-23 | 4 | 27 | 20 | 8 | 5.7 |
| 2023-01-06 | 5 | 36 | 30 | 6 | 5.4 |
| 2023-01-20 | 5 | 34 | 27 | 8 | 5.4 |
| 2023-02-03 | 5 | 35 | 28 | 8 | 5.3 |
| 2023-02-17 | 5 | 37 | 29 | 6 | 5.3 |
| 2023-03-03 | 5 | 34 | 29 | 6 | 5.3 |
| 2023-03-17 | 5 | 37 | 29 | 6 | 4.8 |
| 2023-03-31 | 5 | 35 | 28 | 8 | 5.3 |
| 2023-04-14 | 5 | 35 | 29 | 8 | 5.3 |
| 2023-04-28 | 5 | 35 | 29 | 6 | 5.2 |
| 2023-05-12 | 5 | 34 | 29 | 5 | 4.8 |
| 2023-05-26 | 5 | 34 | 27 | 7 | 5.1 |
| 2023-06-09 | 5 | 37 | 30 | 4 | 4.8 |
| 2023-06-23 | 5 | 37 | 29 | 8 | 4.6 |
| 2023-07-07 | 5 | 35 | 30 | 7 | 5 |
| 2023-07-21 | 5 | 37 | 29 | 5 | 4.8 |
| 2023-08-04 | 5 | 34 | 29 | 4 | 4.8 |
| 2023-08-18 | 5 | 34 | 29 | 5 | 4.8 |
| 2023-09-01 | 5 | 35 | 28 | 6 | 4.7 |
| 2023-09-15 | 5 | 35 | 30 | 6 | 4.8 |
| 2023-09-29 | 5 | 35 | 29 | 4 | 4.4 |
| 2023-10-13 | 5 | 39 | 32 | 6 | 4.6 |
| 2023-10-27 | 5 | 38 | 30 | 4 | 4.8 |
| 2023-11-10 | 5 | 34 | 27 | 4 | 5 |
| 2023-11-24 | 5 | 37 | 32 | 5 | 4.8 |
| 2023-12-08 | 5 | 38 | 33 | 6 | 4.5 |
| 2023-12-22 | 5 | 35 | 27 | 4 | 4.6 |
| 2024-01-05 | 5 | 39 | 32 | 7 | 4.8 |
| 2024-01-19 | 5 | 37 | 32 | 7 | 4.3 |
| 2024-02-02 | 5 | 37 | 32 | 6 | 4.7 |
| 2024-02-16 | 5 | 37 | 33 | 6 | 4.1 |
| 2024-03-01 | 5 | 36 | 30 | 3 | 4.8 |
| 2024-03-15 | 5 | 35 | 29 | 5 | 4.8 |
| 2024-03-29 | 5 | 39 | 32 | 3 | 4.4 |
| 2024-04-12 | 5 | 39 | 34 | 3 | 4.5 |
| 2024-04-26 | 5 | 37 | 32 | 3 | 4.1 |
| 2024-05-10 | 5 | 38 | 34 | 6 | 4.5 |
| 2024-05-24 | 5 | 35 | 29 | 4 | 4.6 |
| 2024-06-07 | 5 | 40 | 36 | 3 | 4.4 |
| 2024-06-21 | 5 | 36 | 30 | 6 | 4.1 |
| 2024-07-05 | 6 | 48 | 43 | 5 | 4.1 |
| 2024-07-19 | 6 | 43 | 37 | 3 | 4.1 |
| 2024-08-02 | 6 | 45 | 39 | 4 | 3.9 |
| 2024-08-16 | 6 | 46 | 39 | 3 | 4.1 |
| 2024-08-30 | 6 | 45 | 41 | 4 | 4.4 |
| 2024-09-13 | 6 | 48 | 44 | 4 | 4.2 |
| 2024-09-27 | 6 | 44 | 37 | 3 | 3.9 |
| 2024-10-11 | 6 | 46 | 41 | 5 | 4 |
| 2024-10-25 | 6 | 44 | 40 | 5 | 4 |
| 2024-11-08 | 6 | 47 | 43 | 3 | 3.7 |
| 2024-11-22 | 6 | 47 | 43 | 5 | 3.5 |
| 2024-12-06 | 6 | 46 | 39 | 2 | 3.9 |
| 2024-12-20 | 6 | 43 | 36 | 3 | 4.1 |
| 2025-01-03 | 6 | 46 | 39 | 5 | 3.9 |
| 2025-01-17 | 6 | 49 | 45 | 5 | 4 |
| 2025-01-31 | 6 | 48 | 43 | 3 | 3.8 |
| 2025-02-14 | 6 | 47 | 43 | 5 | 4 |
| 2025-02-28 | 6 | 49 | 42 | 5 | 3.3 |
| 2025-03-14 | 6 | 44 | 38 | 5 | 4 |
| 2025-03-28 | 6 | 48 | 42 | 5 | 3.8 |
| 2025-04-11 | 6 | 46 | 43 | 5 | 3.5 |
| 2025-04-25 | 6 | 47 | 42 | 3 | 3.5 |
| 2025-05-09 | 6 | 46 | 39 | 5 | 3.3 |
| 2025-05-23 | 6 | 46 | 40 | 3 | 3.8 |
| 2025-06-06 | 6 | 50 | 46 | 3 | 3.5 |
| 2025-06-20 | 6 | 44 | 38 | 5 | 3.2 |
| 2025-07-04 | 6 | 47 | 40 | 2 | 3.3 |
| 2025-07-18 | 6 | 48 | 43 | 3 | 3.8 |
| 2025-08-01 | 6 | 50 | 47 | 4 | 3.1 |
| 2025-08-15 | 6 | 50 | 46 | 2 | 3 |
| 2025-08-29 | 6 | 49 | 44 | 4 | 3.7 |
| 2025-09-12 | 6 | 49 | 43 | 2 | 3.4 |
| 2025-09-26 | 6 | 45 | 39 | 2 | 3.4 |
| 2025-10-10 | 7 | 52 | 49 | 2 | 3.1 |
| 2025-10-24 | 7 | 52 | 48 | 2 | 3 |
| 2025-11-07 | 7 | 56 | 52 | 1 | 3.3 |
| 2025-11-21 | 7 | 53 | 50 | 3 | 3.1 |
| 2025-12-05 | 7 | 57 | 55 | 4 | 3.3 |
| 2025-12-19 | 7 | 56 | 46 | 3 | 3.5 |
| 2026-01-02 | 7 | 52 | 46 | 3 | 3.4 |
| 2026-01-16 | 7 | 56 | 53 | 1 | 3.2 |
| 2026-01-30 | 7 | 53 | 47 | 3 | 2.8 |
| 2026-02-13 | 7 | 58 | 54 | 2 | 3.4 |
| 2026-02-27 | 7 | 57 | 50 | 4 | 2.8 |
| 2026-03-13 | 7 | 53 | 50 | 2 | 3.3 |
| 2026-03-27 | 7 | 54 | 51 | 3 | 3 |
| 2026-04-10 | 7 | 58 | 51 | 1 | 3.3 |
| 2026-04-24 | 7 | 53 | 48 | 3 | 3.3 |
| 2026-05-08 | 7 | 55 | 50 | 3 | 3.2 |
| 2026-05-22 | 7 | 59 | 52 | 1 | 3.1 |
| 2026-06-05 | 7 | 54 | 49 | 3 | 3.1 |
| 2026-06-19 | 7 | 53 | 47 | 4 | 3.3 |
| 2026-07-03 | 7 | 57 | 53 | 0 | 2.9 |
| 2026-07-17 | 7 | 55 | 50 | 1 | 3 |
| 2026-07-31 | 7 | 53 | 47 | 1 | 3.2 |
| 2026-08-14 | 7 | 60 | 59 | 2 | 2.8 |
| 2026-08-28 | 7 | 58 | 52 | 2 | 2.9 |
| 2026-09-11 | 7 | 58 | 55 | 0 | 2.4 |
| 2026-09-25 | 7 | 62 | 61 | 1 | 2.3 |
`,
  },
  {
    path: 'projects/milestones.md',
    content: `---
type: Dataset
title: Milestones
description: Key dates for the projects in flight.
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
| enterprise-permissions | Enterprise permissions discovery done | 2026-07-17 | done |
| enterprise-permissions | Enterprise permissions design signed off | 2026-08-19 | done |
| enterprise-permissions | Enterprise permissions beta with customers | 2026-09-20 | done |
| enterprise-permissions | Enterprise permissions launch | 2026-10-23 | planned |
| data-residency | Data residency discovery done | 2026-08-20 | done |
| data-residency | Data residency design signed off | 2026-09-17 | done |
| data-residency | Data residency beta with customers | 2026-10-15 | planned |
| data-residency | Data residency launch | 2026-11-13 | planned |
| usage-alerts | Usage alerts discovery done | 2026-09-27 | done |
| usage-alerts | Usage alerts design signed off | 2026-10-23 | planned |
| usage-alerts | Usage alerts beta with customers | 2026-11-18 | planned |
| usage-alerts | Usage alerts launch | 2026-12-15 | planned |
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
title: Delivery dashboard
description: "How the team is delivering: velocity, predictability, quality and the projects in flight."
---

# Delivery dashboard

Reads [Projects](projects.md), [Sprints](sprints.md) and [Milestones](milestones.md). Sprint cards compare the latest sprint with the one before.

\`\`\`caedora-dashboard
data:
  projects: projects.md
  sprints: sprints.md
  milestones: milestones.md
rows:
  - columns: 4
    items:
      - stat: { label: Velocity (points), source: sprints, latest: date, value: sum(completed), format: integer, trend: true, sparkline: true }
      - stat: { label: Sprint completion, source: sprints, latest: date, value: sum(completed) / sum(committed), format: percent, trend: true }
      - stat: { label: Cycle time (days), source: sprints, latest: date, value: avg(cycle_days), format: number, trend: true, sparkline: true }
      - stat: { label: Projects shipped this year, source: projects, where: status = done and year(delivered) = year(today()), value: count(), format: integer }
  - columns: 2
    items:
      - bar: { title: Points completed per sprint, description: Average for each month, source: sprints, x: month(date), y: avg(completed), format: integer, ranges: [12m, 3y, all] }
      - line: { title: Sprint completion rate, description: Average for each year, source: sprints, x: year(date), y: sum(completed) / sum(committed), format: percent }
  - columns: 2
    items:
      - line: { title: Days late on delivery, description: Average for projects shipped each year, source: projects, where: status = done, x: year(delivered), y: avg(days_late), format: number }
      - bar: { title: Bugs reaching customers, description: Average per sprint for each year, source: sprints, x: year(date), y: avg(escaped_bugs), format: number }
  - columns: 2
    items:
      - bar: { title: Projects shipped per year, source: projects, where: status = done, x: year(delivered), y: count(), series: type, stacked: true, format: integer }
      - line: { title: Stakeholder satisfaction, description: Average retro score out of 10, source: projects, where: status = done, x: year(delivered), y: avg(satisfaction), format: number }
  - columns: 2
    items:
      - table:
          title: In flight
          source: projects
          where: "status in [active, planned]"
          columns: [name, type, team, start, due]
          sort: due
      - list: { title: Next milestones, source: milestones, where: status != done, label: milestone, detail: due, sort: due, limit: 6 }
\`\`\`
`,
  },
  {
    path: 'projects/AGENTS.md',
    content: `# Project planning guidance

Use briefs, milestones and retrospectives to keep recommendations grounded in current project state and documented decisions.

- projects.md, sprints.md and milestones.md are Datasets. Keep the status values and ISO dates (YYYY-MM-DD).
- When a project ships, fill in delivered, days_late and satisfaction on its row.
- Milestones point at a project by its id in projects.md. Ask before inventing a new project.
`,
  },
]

import type { TemplateFile } from '../vault-templates'

/**
 * Job search tracker template. Applications and interviews are Datasets that
 * dashboard.md reads. The rows are illustrative examples to replace.
 */

export const JOB_SEARCH_FILES: TemplateFile[] = [
  {
    path: 'career/job-search/README.md',
    content: `# Job search tracker

Open the [job search dashboard](dashboard.md) for your pipeline, interviews and next steps.

Track opportunities, company research, interviews and follow-ups here. Add each role to [Applications](applications.md) and each interview to [Interviews](interviews.md). The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'career/job-search/applications.md',
    content: `---
type: Dataset
title: Applications
description: Every role you are considering or have applied for, with its status and next step.
tags: [career, applications]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    company: { type: text, required: true }
    role: { type: text }
    status: { type: enum, values: [researching, applied, interviewing, offer, rejected, withdrawn], required: true }
    applied: { type: date }
    source: { type: text }
    next_step: { type: text }
    next_date: { type: date }
---

# Applications

| id | company | role | status | applied | source | next_step | next_date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| northwind-pm | Northwind | Product manager | interviewing | 2026-09-02 | Referral | Final interview | 2026-10-09 |
| bluebird-analyst | Bluebird | Data analyst | applied | 2026-09-10 | Job board | Chase recruiter | 2026-10-08 |
| harbour-lead | Harbour Labs | Team lead | interviewing | 2026-09-12 | LinkedIn | Technical task | 2026-10-12 |
| kestrel-ops | Kestrel | Operations manager | rejected | 2026-08-20 | Job board | | |
| meridian-pm | Meridian | Senior product manager | offer | 2026-08-25 | Recruiter | Reply to offer | 2026-10-10 |
| oakline-consult | Oakline | Consultant | withdrawn | 2026-08-28 | Website | | |
| summit-analyst | Summit | Business analyst | applied | 2026-09-24 | Website | Wait for reply | 2026-10-15 |
| willow-pm | Willow Health | Product owner | researching | | Friend | Ask about the team | 2026-10-07 |
`,
  },
  {
    path: 'career/job-search/interviews.md',
    content: `---
type: Dataset
title: Interviews
description: Each interview stage, when it happened and how it went.
tags: [career, interviews]
dataset:
  columns:
    date: { type: date, required: true }
    application: { type: ref, to: applications.md, required: true }
    stage: { type: enum, values: [screen, technical, panel, final], required: true }
    outcome: { type: enum, values: [pending, passed, rejected] }
    notes: { type: text }
---

# Interviews

| date | application | stage | outcome | notes |
| --- | --- | --- | --- | --- |
| 2026-09-08 | meridian-pm | screen | passed | |
| 2026-09-15 | northwind-pm | screen | passed | |
| 2026-09-16 | meridian-pm | panel | passed | Case study went well |
| 2026-09-22 | kestrel-ops | screen | rejected | |
| 2026-09-25 | meridian-pm | final | passed | |
| 2026-09-29 | northwind-pm | technical | passed | |
| 2026-10-01 | harbour-lead | screen | pending | |
`,
  },
  {
    path: 'career/job-search/company-research/template.md',
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
    path: 'career/job-search/dashboard.md',
    content: `---
type: Dashboard
title: Job search dashboard
description: Pipeline, interviews and next steps from the job search Datasets.
---

# Job search dashboard

Reads [Applications](applications.md) and [Interviews](interviews.md).

\`\`\`caedora-dashboard
data:
  applications: applications.md
  interviews: interviews.md
rows:
  - columns: 4
    items:
      - stat: { label: Applications sent, source: applications, where: status != researching, value: count(), format: integer }
      - stat: { label: Interviewing, source: applications, where: status = interviewing, value: count(), format: integer }
      - stat: { label: Offers, source: applications, where: status = offer, value: count(), format: integer }
      - stat: { label: Interviews done, source: interviews, value: count(), format: integer }
  - columns: 2
    items:
      - pie: { title: Pipeline, source: applications, label: status, value: count() }
      - bar: { title: Interviews by stage, source: interviews, x: stage, y: count(), series: outcome, stacked: true, format: integer }
  - columns: 2
    items:
      - list:
          title: Next steps
          source: applications
          where: "status in [researching, applied, interviewing, offer]"
          label: company
          detail: next_date
          sort: next_date
      - table:
          title: Recent interviews
          source: interviews
          columns: [date, application.company, stage, outcome]
          sort: -date
          limit: 5
\`\`\`
`,
  },
  {
    path: 'career/job-search/AGENTS.md',
    content: `# Job search guidance

Use application status, company notes and interview history to prepare concise next actions and tailored interview prep.

- applications.md and interviews.md are Datasets. Keep the status values and ISO dates (YYYY-MM-DD).
- Interviews point at an application by its id in applications.md.
`,
  },
]

import type { TemplateFile } from '../vault-templates'

/**
 * Personal CRM template. People and follow-ups are Datasets that
 * dashboard.md reads. The rows are illustrative examples to replace.
 */

export const PERSONAL_CRM_FILES: TemplateFile[] = [
  {
    path: 'people/README.md',
    content: `# Personal CRM

Open the [people dashboard](dashboard.md) to see who you are due to catch up with and which follow-ups are open.

Keep people notes, conversations, follow-ups and useful context here. Add each person to [People](people.md) with how often you would like to be in touch, and update the last contact date when you speak. The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'people/people.md',
    content: `---
type: Dataset
title: People
description: The people you keep in touch with, when you last spoke and how often you would like to.
tags: [people]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text, required: true }
    circle: { type: enum, values: [family, friends, work, community] }
    last_contact: { type: date }
    contact_every: { type: number }
    notes: { type: text }
---

# People

contact_every is how many days you would like between catch ups.

| id | name | circle | last_contact | contact_every | notes |
| --- | --- | --- | --- | --- | --- |
| example-parent | Example parent | family | 2026-10-01 | 7 | |
| example-sibling | Example sibling | family | 2026-09-12 | 14 | |
| example-friend | Example friend | friends | 2026-08-20 | 30 | |
| example-old-friend | Example old friend | friends | 2026-06-02 | 90 | Moved abroad |
| example-mentor | Example mentor | work | 2026-07-15 | 60 | |
| example-colleague | Example colleague | work | 2026-09-30 | 30 | |
| example-neighbour | Example neighbour | community | 2026-09-05 | 60 | |
`,
  },
  {
    path: 'people/follow-ups.md',
    content: `---
type: Dataset
title: Follow-ups
description: Things you said you would do for or with someone, and when.
tags: [people, follow-up]
dataset:
  columns:
    person: { type: ref, to: people.md, required: true }
    topic: { type: text, required: true }
    due: { type: date }
    status: { type: enum, values: [open, done], required: true }
---

# Follow-ups

| person | topic | due | status |
| --- | --- | --- | --- |
| example-friend | Send the book recommendation | 2026-10-03 | open |
| example-mentor | Share the project update | 2026-10-10 | open |
| example-sibling | Plan the birthday dinner | 2026-10-20 | open |
| example-colleague | Introduce to the design team | 2026-09-28 | done |
| example-neighbour | Return the ladder | 2026-09-15 | done |
`,
  },
  {
    path: 'people/templates/person.md',
    content: `---
tags: [people]
status: active
---

# Person name

## Context

## Conversations

## Follow-ups

## Notes
`,
  },
  {
    path: 'people/dashboard.md',
    content: `---
type: Dashboard
title: People dashboard
description: Who is due a catch up and which follow-ups are open, from the people Datasets.
---

# People dashboard

Reads [People](people.md) and [Follow-ups](follow-ups.md).

\`\`\`caedora-dashboard
data:
  people: people.md
  followups: follow-ups.md
rows:
  - columns: 3
    items:
      - stat: { label: People, source: people, value: count(), format: integer }
      - stat: { label: Due a catch up, source: people, where: days_until(last_contact) + contact_every <= 0, value: count(), format: integer }
      - stat: { label: Open follow-ups, source: followups, where: status = open, value: count(), format: integer }
  - columns: 2
    items:
      - list:
          title: Due a catch up
          description: Longer than you planned since you last spoke
          source: people
          where: days_until(last_contact) + contact_every <= 0
          label: name
          detail: last_contact
          sort: last_contact
      - table:
          title: Open follow-ups
          source: followups
          where: status = open
          columns: [person.name, topic, due]
          sort: due
  - columns: 1
    items:
      - pie: { title: People by circle, source: people, label: circle, value: count() }
\`\`\`
`,
  },
  {
    path: 'people/AGENTS.md',
    content: `# Relationship context guidance

Use people notes respectfully, avoid inventing personal details, and surface follow-ups only from documented context.

- people.md and follow-ups.md are Datasets. Keep ISO dates (YYYY-MM-DD) and update last_contact rather than adding a second row for the same person.
- Follow-ups point at a person by their id in people.md.
`,
  },
]

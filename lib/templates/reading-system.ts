import type { TemplateFile } from '../vault-templates'

/**
 * Reading system template. Books is a Dataset that dashboard.md reads. The
 * rows are illustrative examples to replace.
 */

export const READING_SYSTEM_FILES: TemplateFile[] = [
  {
    path: 'reading/README.md',
    content: `# Reading system

Open the [reading dashboard](dashboard.md) to see what you are reading now, your yearly goal and how you rated what you finished.

Track books, articles, source notes and review queues here. Add each book to [Books](books.md) when you start it or want to read it, and update its status as you go. The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'reading/books.md',
    content: `---
type: Dataset
title: Books
description: Every book you want to read, are reading or have finished, with dates and ratings.
tags: [reading, books]
dataset:
  columns:
    title: { type: text, required: true }
    author: { type: text }
    status: { type: enum, values: [want-to-read, reading, finished, abandoned], required: true }
    format: { type: enum, values: [book, ebook, audiobook] }
    pages: { type: number }
    started: { type: date }
    finished: { type: date }
    rating: { type: number }
    notes: { type: text }
---

# Books

Rate finished books from 1 to 5.

| title | author | status | format | pages | started | finished | rating | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Example Garden | A. Writer | finished | book | 320 | 2026-01-04 | 2026-01-28 | 4 | |
| Notes on Attention | B. Author | finished | ebook | 248 | 2026-02-02 | 2026-02-19 | 5 | Reread chapter 3 |
| A Short History of Maps | C. Historian | finished | audiobook | 410 | 2026-03-01 | 2026-04-02 | 3 | |
| Quiet Systems | D. Engineer | finished | book | 290 | 2026-05-10 | 2026-06-01 | 4 | |
| The Long Coast | E. Novelist | finished | book | 384 | 2026-06-15 | 2026-07-20 | 5 | |
| Small Habits, Big Days | F. Coach | abandoned | ebook | 220 | 2026-08-01 | | | Not for me |
| Field Notes on Cities | G. Planner | finished | book | 256 | 2026-08-05 | 2026-09-02 | 4 | |
| The Patient Reader | H. Critic | reading | book | 300 | 2026-09-10 | | | |
| Weather and Words | I. Poet | reading | audiobook | 180 | 2026-09-28 | | | |
| Building Second Brains | J. Thinker | want-to-read | book | 270 | | | | Recommended by a friend |
| An Atlas of Rivers | K. Explorer | want-to-read | book | 350 | | | | |
`,
  },
  {
    path: 'reading/source-notes/template.md',
    content: `---
tags: [reading, source]
status: queued
---

# Source title

## Key ideas

## Useful quotes

## Follow-up
`,
  },
  {
    path: 'reading/dashboard.md',
    content: `---
type: Dashboard
title: Reading dashboard
description: Books in progress, the yearly reading goal and ratings from the Books Dataset.
---

# Reading dashboard

Reads [Books](books.md). Change max on the yearly goal to your own target.

\`\`\`caedora-dashboard
data:
  books: books.md
rows:
  - columns: 4
    items:
      - stat: { label: Books finished, source: books, where: status = finished, value: count(), format: integer }
      - stat: { label: Reading now, source: books, where: status = reading, value: count(), format: integer }
      - stat: { label: Pages read, source: books, where: status = finished, value: sum(pages), format: integer }
      - stat: { label: Average rating, source: books, where: status = finished, value: avg(rating), format: number }
  - columns: 3
    items:
      - progress:
          label: Yearly reading goal
          description: Books finished this calendar year
          source: books
          where: status = finished and year(finished) = year(today())
          value: count()
          max: 12
          format: integer
          gauge: true
      - list: { title: Reading now, source: books, where: status = reading, label: title, detail: author, sort: started }
      - list: { title: Up next, source: books, where: status = want-to-read, label: title, detail: author, limit: 5 }
  - columns: 2
    items:
      - pie: { title: Finished by format, source: books, where: status = finished, label: format, value: count() }
      - bar: { title: Pages per finished book, source: books, where: status = finished, x: finished, y: sum(pages), format: integer }
  - columns: 1
    items:
      - table:
          title: Finished books
          source: books
          where: status = finished
          columns: [title, author, finished, rating]
          sort: -finished
\`\`\`
`,
  },
  {
    path: 'reading/AGENTS.md',
    content: `# Reading synthesis guidance

Summarise sources into durable notes, preserve citations, and separate direct quotes from interpretation.

- books.md is a Dataset. Add a row per book and keep the status values and ISO dates (YYYY-MM-DD).
- When a book is finished, set its status, finished date and rating rather than adding a new row.
`,
  },
]

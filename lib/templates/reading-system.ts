import type { TemplateFile } from '../vault-templates'

/**
 * Reading system template. Five years of example reading, read by
 * dashboard.md. Replace the rows with your own.
 */

export const READING_SYSTEM_FILES: TemplateFile[] = [
  {
    path: 'reading/README.md',
    content: `# Reading system

Open the [reading dashboard](dashboard.md) for your reading pace, this year's goal and your favourite books.

Track books, articles, source notes and review queues here. Add each book to [Books](books.md) when you start it or want to read it, and update its status, finish date and rating as you go. The rows that ship with this template are five years of example reading, so replace them with your own.
`,
  },
  {
    path: 'reading/books.md',
    content: `---
type: Dataset
title: Books
description: Every book read, being read or on the list, with dates, format, genre and rating.
tags: [reading, books]
dataset:
  columns:
    title: { type: text, required: true }
    author: { type: text }
    genre: { type: enum, values: [fiction, sci-fi, history, science, psychology, business, biography, self-help, philosophy] }
    status: { type: enum, values: [want-to-read, reading, finished, abandoned], required: true }
    format: { type: enum, values: [book, ebook, audiobook] }
    pages: { type: number }
    started: { type: date }
    finished: { type: date }
    rating: { type: number }
    notes: { type: text }
---

# Books

Rate finished books from 1 to 5. Audiobooks count their printed page length.

| title | author | genre | status | format | pages | started | finished | rating | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atomic Habits | James Clear | self-help | finished | audiobook | 320 | 2021-08-26 | 2021-10-03 | 2 | Changed how I plan my week |
| The Midnight Library | Matt Haig | fiction | finished | ebook | 304 | 2021-09-19 | 2021-10-25 | 4 |  |
| Sapiens | Yuval Noah Harari | history | finished | ebook | 512 | 2021-10-19 | 2021-11-20 | 4 |  |
| Thinking, Fast and Slow | Daniel Kahneman | psychology | finished | book | 512 | 2021-11-14 | 2021-12-13 | 4 |  |
| The Psychology of Money | Morgan Housel | business | finished | book | 256 | 2021-12-15 | 2022-01-19 | 3 |  |
| Project Hail Mary | Andy Weir | sci-fi | finished | book | 496 | 2022-01-21 | 2022-02-12 | 3 |  |
| Educated | Tara Westover | biography | finished | audiobook | 400 | 2022-02-10 | 2022-03-08 | 4 |  |
| Deep Work | Cal Newport | self-help | finished | book | 304 | 2022-03-12 | 2022-04-05 | 3 |  |
| Klara and the Sun | Kazuo Ishiguro | fiction | finished | audiobook | 320 | 2022-03-29 | 2022-04-25 | 4 |  |
| The Body | Bill Bryson | science | finished | ebook | 464 | 2022-04-14 | 2022-05-16 | 4 |  |
| Born to Run | Christopher McDougall | biography | finished | ebook | 304 | 2022-05-18 | 2022-06-17 | 3 |  |
| Why We Sleep | Matthew Walker | science | finished | book | 368 | 2022-06-17 | 2022-07-19 | 4 |  |
| Shoe Dog | Phil Knight | biography | finished | ebook | 400 | 2022-07-22 | 2022-08-16 | 4 |  |
| The Martian | Andy Weir | sci-fi | finished | ebook | 384 | 2022-08-21 | 2022-09-15 | 3 |  |
| Range | David Epstein | psychology | finished | book | 352 | 2022-09-15 | 2022-10-14 | 4 |  |
| Normal People | Sally Rooney | fiction | finished | book | 288 | 2022-10-16 | 2022-11-12 | 3 |  |
| The Lean Startup | Eric Ries | business | finished | book | 336 | 2022-11-06 | 2022-12-02 | 5 |  |
| Rule of Wolves | Leigh Bardugo | fiction | finished | book | 592 | 2022-11-23 | 2022-12-21 | 5 |  |
| Meditations | Marcus Aurelius | philosophy | finished | ebook | 256 | 2022-12-23 | 2023-01-15 | 4 |  |
| The Seven Husbands of Evelyn Hugo | Taylor Jenkins Reid | fiction | finished | book | 400 | 2023-01-17 | 2023-02-07 | 4 |  |
| Outlive | Peter Attia | science | finished | book | 496 | 2023-02-11 | 2023-03-07 | 4 |  |
| Four Thousand Weeks | Oliver Burkeman | philosophy | finished | book | 288 | 2023-03-04 | 2023-03-31 | 4 |  |
| The Ministry for the Future | Kim Stanley Robinson | sci-fi | finished | book | 576 | 2023-03-22 | 2023-04-15 | 3 |  |
| The Making of the Atomic Bomb | Richard Rhodes | history | finished | ebook | 896 | 2023-04-23 | 2023-05-11 | 5 |  |
| Good to Great | Jim Collins | business | finished | audiobook | 320 | 2023-05-10 | 2023-05-29 | 4 |  |
| Tomorrow, and Tomorrow, and Tomorrow | Gabrielle Zevin | fiction | finished | book | 416 | 2023-06-04 | 2023-06-21 | 3 |  |
| The Anthropocene Reviewed | John Green | philosophy | finished | audiobook | 304 | 2023-06-27 | 2023-07-14 | 3 |  |
| Endure | Alex Hutchinson | science | finished | book | 320 | 2023-07-21 | 2023-08-06 | 4 |  |
| The Three-Body Problem | Cixin Liu | sci-fi | finished | ebook | 416 | 2023-08-04 | 2023-08-22 | 4 |  |
| Inspired | Marty Cagan | business | finished | book | 368 | 2023-08-10 | 2023-09-05 | 3 |  |
| The Shortest History of England | James Hawes | history | finished | ebook | 288 | 2023-09-01 | 2023-09-23 | 3 |  |
| Never Split the Difference | Chris Voss | business | finished | book | 288 | 2023-09-25 | 2023-10-11 | 4 |  |
| Lessons in Chemistry | Bonnie Garmus | fiction | finished | ebook | 400 | 2023-10-09 | 2023-11-02 | 5 |  |
| Stolen Focus | Johann Hari | psychology | finished | book | 368 | 2023-11-04 | 2023-11-24 | 4 |  |
| The Dark Forest | Cixin Liu | sci-fi | finished | book | 512 | 2023-11-25 | 2023-12-11 | 5 |  |
| SPQR | Mary Beard | history | finished | book | 608 | 2023-12-05 | 2023-12-25 | 4 |  |
| The Obstacle Is the Way | Ryan Holiday | philosophy | finished | book | 224 | 2023-12-16 | 2024-01-09 | 4 |  |
| High Output Management | Andrew Grove | business | finished | ebook | 272 | 2024-01-12 | 2024-01-27 | 3 |  |
| Demon Copperhead | Barbara Kingsolver | fiction | finished | book | 560 | 2024-01-25 | 2024-02-09 | 3 |  |
| Steve Jobs | Walter Isaacson | biography | finished | audiobook | 656 | 2024-02-10 | 2024-02-29 | 5 |  |
| Hidden Potential | Adam Grant | psychology | finished | book | 304 | 2024-03-08 | 2024-03-24 | 3 |  |
| Children of Time | Adrian Tchaikovsky | sci-fi | finished | audiobook | 608 | 2024-03-23 | 2024-04-12 | 4 |  |
| The Silk Roads | Peter Frankopan | history | finished | ebook | 656 | 2024-04-09 | 2024-04-27 | 3 |  |
| Same as Ever | Morgan Housel | business | finished | book | 240 | 2024-04-22 | 2024-05-10 | 4 |  |
| The Thursday Murder Club | Richard Osman | fiction | finished | book | 400 | 2024-05-10 | 2024-05-25 | 3 |  |
| Can't Hurt Me | David Goggins | biography | finished | book | 364 | 2024-05-20 | 2024-06-08 | 4 |  |
| Dune | Frank Herbert | sci-fi | finished | audiobook | 688 | 2024-06-11 | 2024-06-27 | 5 |  |
| Thinking in Systems | Donella Meadows | science | finished | ebook | 240 | 2024-06-30 | 2024-07-17 | 4 |  |
| The Courage to Be Disliked | Ichiro Kishimi | philosophy | finished | ebook | 288 | 2024-07-12 | 2024-07-29 | 3 |  |
| The Hard Thing About Hard Things | Ben Horowitz | business | finished | book | 304 | 2024-07-21 | 2024-08-11 | 4 |  |
| Pachinko | Min Jin Lee | fiction | finished | book | 512 | 2024-08-13 | 2024-09-01 | 5 |  |
| The Code Breaker | Walter Isaacson | biography | finished | ebook | 560 | 2024-09-04 | 2024-09-17 | 3 |  |
| Leviathan Wakes | James S. A. Corey | sci-fi | finished | ebook | 592 | 2024-09-12 | 2024-10-02 | 3 |  |
| A Short History of Nearly Everything | Bill Bryson | science | finished | ebook | 672 | 2024-10-01 | 2024-10-18 | 3 |  |
| The Mom Test | Rob Fitzpatrick | business | finished | book | 136 | 2024-10-21 | 2024-11-04 | 4 |  |
| Shuggie Bain | Douglas Stuart | fiction | finished | audiobook | 448 | 2024-11-11 | 2024-11-25 | 3 |  |
| Mindset | Carol Dweck | psychology | finished | ebook | 320 | 2024-11-26 | 2024-12-12 | 5 |  |
| The Rest Is History | Tom Holland and Dominic Sandbrook | history | finished | book | 384 | 2024-12-13 | 2024-12-27 | 3 |  |
| Hyperion | Dan Simmons | sci-fi | finished | audiobook | 496 | 2024-12-29 | 2025-01-16 | 4 |  |
| Essentialism | Greg McKeown | self-help | finished | audiobook | 272 | 2025-01-09 | 2025-01-27 | 5 |  |
| Bomber Mafia | Malcolm Gladwell | history | finished | ebook | 256 | 2025-01-27 | 2025-02-12 | 5 |  |
| Station Eleven | Emily St. John Mandel | fiction | finished | ebook | 352 | 2025-02-09 | 2025-02-26 | 5 |  |
| Elon Musk | Walter Isaacson | biography | finished | audiobook | 688 | 2025-02-25 | 2025-03-17 | 4 |  |
| Super Agers | Eric Topol | science | finished | book | 336 | 2025-03-14 | 2025-03-30 | 4 |  |
| Slow Productivity | Cal Newport | self-help | finished | ebook | 256 | 2025-03-27 | 2025-04-16 | 5 |  |
| The Ministry of Time | Kaliane Bradley | fiction | finished | audiobook | 352 | 2025-04-13 | 2025-04-28 | 3 |  |
| Leading | Alex Ferguson | biography | finished | book | 400 | 2025-04-30 | 2025-05-13 | 5 |  |
| Seveneves | Neal Stephenson | sci-fi | finished | book | 880 | 2025-05-16 | 2025-06-02 | 4 |  |
| How Big Things Get Done | Bent Flyvbjerg | business | finished | ebook | 304 | 2025-05-29 | 2025-06-15 | 4 |  |
| The Anxious Generation | Jonathan Haidt | psychology | finished | ebook | 400 | 2025-06-17 | 2025-06-30 | 5 |  |
| Orbital | Samantha Harvey | fiction | finished | ebook | 144 | 2025-07-05 | 2025-07-18 | 5 |  |
| Prisoners of Geography | Tim Marshall | history | finished | ebook | 304 | 2025-07-12 | 2025-07-31 | 5 |  |
| The Daily Stoic | Ryan Holiday | philosophy | finished | audiobook | 416 | 2025-07-25 | 2025-08-14 | 4 |  |
| Atomic Awakening | James Mahaffey | history | finished | book | 368 | 2025-08-11 | 2025-08-26 | 4 |  |
| Intermezzo | Sally Rooney | fiction | finished | ebook | 448 | 2025-08-31 | 2025-09-13 | 4 |  |
| Build | Tony Fadell | business | finished | audiobook | 400 | 2025-09-10 | 2025-09-27 | 5 |  |
| The Wager | David Grann | history | finished | book | 352 | 2025-09-23 | 2025-10-12 | 5 |  |
| Red Rising | Pierce Brown | sci-fi | finished | audiobook | 400 | 2025-10-11 | 2025-10-28 | 4 |  |
| The Comfort Crisis | Michael Easter | science | finished | ebook | 304 | 2025-10-29 | 2025-11-13 | 5 |  |
| James | Percival Everett | fiction | finished | ebook | 320 | 2025-11-17 | 2025-11-29 | 5 |  |
| Abundance | Ezra Klein and Derek Thompson | business | finished | audiobook | 304 | 2025-12-01 | 2025-12-17 | 3 |  |
| Original Sins | Matt Rowland Hill | biography | finished | ebook | 320 | 2025-12-18 | 2026-01-04 | 5 |  |
| Nexus | Yuval Noah Harari | history | finished | audiobook | 528 | 2026-01-10 | 2026-01-22 | 5 |  |
| The Wide Wide Sea | Hampton Sides | history | finished | ebook | 432 | 2026-01-17 | 2026-02-03 | 4 |  |
| Wind and Truth | Brandon Sanderson | sci-fi | finished | ebook | 1344 | 2026-02-08 | 2026-02-20 | 4 |  |
| Careless People | Sarah Wynn-Williams | biography | finished | ebook | 400 | 2026-02-17 | 2026-03-04 | 4 |  |
| The Let Them Theory | Mel Robbins | self-help | finished | book | 320 | 2026-03-10 | 2026-03-22 | 4 |  |
| Playground | Richard Powers | fiction | finished | audiobook | 400 | 2026-03-23 | 2026-04-08 | 4 |  |
| Empire of AI | Karen Hao | business | finished | book | 496 | 2026-04-10 | 2026-04-24 | 4 |  |
| Flesh | David Szalay | fiction | finished | audiobook | 368 | 2026-04-22 | 2026-05-04 | 4 |  |
| Every Body Should Know This | Federica Amati | science | finished | book | 336 | 2026-05-03 | 2026-05-20 | 5 |  |
| The Mountain in the Sea | Ray Nayler | sci-fi | finished | book | 464 | 2026-05-19 | 2026-06-05 | 4 |  |
| Rebecca | Daphne du Maurier | fiction | finished | book | 448 | 2026-06-04 | 2026-06-18 | 3 |  |
| The Price of Time | Edward Chancellor | history | finished | book | 400 | 2026-06-14 | 2026-07-02 | 4 |  |
| Burn | Herman Pontzer | science | finished | audiobook | 384 | 2026-07-01 | 2026-07-15 | 4 |  |
| Project Management for the Unofficial Project Manager | Kory Kogon | business | finished | ebook | 240 | 2026-07-16 | 2026-07-30 | 5 |  |
| Piranesi | Susanna Clarke | fiction | finished | book | 272 | 2026-07-23 | 2026-08-09 | 5 |  |
| Into Thin Air | Jon Krakauer | biography | finished | book | 368 | 2026-08-10 | 2026-08-25 | 5 |  |
| The Way of Kings | Brandon Sanderson | sci-fi | finished | book | 1008 | 2026-08-20 | 2026-09-04 | 4 |  |
| Determined | Robert Sapolsky | science | reading | book | 528 | 2026-09-14 |  |  |  |
| Doppelganger | Naomi Klein | psychology | reading | book | 432 | 2026-09-26 |  |  |  |
| Small Things Like These | Claire Keegan | fiction | want-to-read |  | 128 |  |  |  |  |
| The Infinite Game | Simon Sinek | business | want-to-read |  | 272 |  |  |  |  |
| Endurance | Alfred Lansing | history | want-to-read |  | 352 |  |  |  |  |
| The Shards | Bret Easton Ellis | fiction | want-to-read |  | 608 |  |  |  |  |
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
description: Reading pace, this year's goal, what you read and what you thought of it.
---

# Reading dashboard

Reads [Books](books.md). Change max on the yearly goal to your own target.

\`\`\`caedora-dashboard
data:
  books: books.md
rows:
  - columns: 4
    items:
      - stat: { label: Books this year, source: books, where: status = finished and year(finished) = year(today()), value: count(), format: integer }
      - stat: { label: Pages this year, source: books, where: status = finished and year(finished) = year(today()), value: sum(pages), format: integer }
      - stat: { label: Books read in total, source: books, where: status = finished, value: count(), format: integer }
      - stat: { label: Average rating this year, source: books, where: status = finished and year(finished) = year(today()), value: avg(rating), format: number }
  - columns: 3
    items:
      - progress:
          label: Reading goal this year
          description: Books finished this calendar year
          source: books
          where: status = finished and year(finished) = year(today())
          value: count()
          max: 26
          format: integer
          gauge: true
      - list: { title: Reading now, source: books, where: status = reading, label: title, detail: author, sort: started }
      - list: { title: Up next, source: books, where: status = want-to-read, label: title, detail: author, limit: 5 }
  - columns: 2
    items:
      - bar: { title: Books per year, source: books, where: status = finished, x: year(finished), y: count(), series: format, stacked: true, format: integer }
      - bar: { title: Pages per month, source: books, where: status = finished, x: month(finished), y: sum(pages), format: integer, ranges: [12m, 3y, all] }
  - columns: 2
    items:
      - bar: { title: What I read, source: books, where: status = finished, x: genre, y: count(), horizontal: true, format: integer }
      - line: { title: Average rating by year, source: books, where: status = finished, x: year(finished), y: avg(rating), format: number }
  - columns: 1
    items:
      - table:
          title: Five star books
          source: books
          where: status = finished and rating = 5
          columns: [title, author, genre, finished]
          sort: -finished
          limit: 8
\`\`\`
`,
  },
  {
    path: 'reading/AGENTS.md',
    content: `# Reading synthesis guidance

Summarise sources into durable notes, preserve citations, and separate direct quotes from interpretation.

- books.md is a Dataset. Add a row per book and keep the status, genre and format values and ISO dates (YYYY-MM-DD).
- When a book is finished, set its status, finished date and rating on its existing row.
`,
  },
]

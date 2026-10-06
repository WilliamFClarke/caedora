import type { TemplateFile } from '../vault-templates'

/**
 * Travel planner template. Trips and trip spending are Datasets that
 * dashboard.md reads. The rows are illustrative examples to replace.
 */

export const TRAVEL_PLANNER_FILES: TemplateFile[] = [
  {
    path: 'travel/README.md',
    content: `# Travel planner

Open the [travel dashboard](dashboard.md) for your next trip, what is booked and how spending compares with each budget.

Plan trips, itineraries, reservations, packing and post-trip notes here. Add each trip to [Trips](trips.md) with a budget, and log costs against it in [Trip spending](spending.md). The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'travel/trips.md',
    content: `---
type: Dataset
title: Trips
description: Trips you are dreaming of, planning, have booked or have taken, with dates and budgets.
tags: [travel, trips]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    trip: { type: text, required: true }
    destination: { type: text }
    start: { type: date }
    end: { type: date }
    status: { type: enum, values: [idea, planning, booked, done], required: true }
    budget: { type: currency, currency: GBP }
    notes: { type: text }
---

# Trips

| id | trip | destination | start | end | status | budget | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lisbon-2026 | Lisbon long weekend | Lisbon | 2026-05-14 | 2026-05-18 | done | 900.00 | |
| lakes-2026 | Lake District | Keswick | 2026-08-08 | 2026-08-15 | done | 1,200.00 | |
| edinburgh-2026 | Edinburgh | Edinburgh | 2026-11-20 | 2026-11-23 | booked | 600.00 | Train booked |
| japan-2027 | Japan | Tokyo and Kyoto | 2027-04-02 | 2027-04-18 | planning | 4,500.00 | |
| iceland | Iceland | Reykjavik | | | idea | | Northern lights |
`,
  },
  {
    path: 'travel/spending.md',
    content: `---
type: Dataset
title: Trip spending
description: What each trip cost, by category.
tags: [travel, spending]
dataset:
  columns:
    date: { type: date, required: true }
    trip: { type: ref, to: trips.md, required: true }
    category: { type: enum, values: [transport, accommodation, food, activities, other], required: true }
    amount: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# Trip spending

| date | trip | category | amount | notes |
| --- | --- | --- | --- | --- |
| 2026-03-02 | lisbon-2026 | transport | 180.00 | Flights |
| 2026-03-02 | lisbon-2026 | accommodation | 360.00 | |
| 2026-05-16 | lisbon-2026 | food | 210.00 | |
| 2026-05-17 | lisbon-2026 | activities | 65.00 | |
| 2026-06-10 | lakes-2026 | accommodation | 620.00 | Cottage |
| 2026-08-08 | lakes-2026 | transport | 140.00 | Fuel |
| 2026-08-12 | lakes-2026 | food | 290.00 | |
| 2026-08-13 | lakes-2026 | activities | 85.00 | Boat trip |
| 2026-09-18 | edinburgh-2026 | transport | 120.00 | Trains |
| 2026-09-18 | edinburgh-2026 | accommodation | 270.00 | |
| 2026-09-30 | japan-2027 | transport | 980.00 | Flights |
`,
  },
  {
    path: 'travel/templates/trip-plan.md',
    content: `---
tags: [travel, trip]
status: planning
---

# Trip name

## Itinerary

## Reservations

## Packing

## Notes
`,
  },
  {
    path: 'travel/packing-list.md',
    content: `---
tags: [travel, packing]
---

# Packing list

- Documents
- Clothes
- Electronics
- Health
`,
  },
  {
    path: 'travel/dashboard.md',
    content: `---
type: Dashboard
title: Travel dashboard
description: The next trip, bookings and spending against budget from the travel Datasets.
---

# Travel dashboard

Reads [Trips](trips.md) and [Trip spending](spending.md).

\`\`\`caedora-dashboard
data:
  trips: trips.md
  spending: spending.md
rows:
  - columns: 3
    items:
      - stat: { label: Next trip, source: trips, where: start >= today(), value: min(start), format: date }
      - stat: { label: Trips this year, source: trips, where: year(start) = year(today()), value: count(), format: integer }
      - stat: { label: Spent this year, source: spending, where: year(date) = year(today()), value: sum(amount) }
  - columns: 2
    items:
      - bar:
          title: Spending by trip
          source: spending
          x: trip.trip
          y: sum(amount)
          series: category
          stacked: true
          horizontal: true
      - pie: { title: Where the money goes, source: spending, label: category, value: sum(amount) }
  - columns: 2
    items:
      - progress:
          label: Booked trips spending
          description: Spent so far against the budget for every booked trip
          source: spending
          where: trip.status = booked
          value: sum(amount)
          max: { source: trips, where: status = booked, value: sum(budget) }
      - table:
          title: Upcoming trips
          source: trips
          where: "status in [planning, booked]"
          columns: [trip, start, end, status, budget]
          sort: start
\`\`\`
`,
  },
  {
    path: 'travel/AGENTS.md',
    content: `# Travel planning guidance

Use documented dates, preferences, reservations and constraints before suggesting plans. Do not assume private travel details that are not recorded.

- trips.md and spending.md are Datasets. Keep ISO dates (YYYY-MM-DD) and plain numbers for money.
- Spending points at a trip by its id in trips.md. Ask before inventing a new trip.
`,
  },
]

import type { TemplateFile } from '../vault-templates'

/**
 * Travel planner template. Five years of example trips and spending, read
 * by dashboard.md. Replace the rows with your own.
 */

export const TRAVEL_PLANNER_FILES: TemplateFile[] = [
  {
    path: 'travel/README.md',
    content: `# Travel planner

Open the [travel dashboard](dashboard.md) for where you have been, how much time away you take and what is coming up.

Plan trips, itineraries, reservations, packing and post-trip notes here. Add each trip to [Trips](trips.md) with a budget, log costs in [Trip spending](spending.md) and rate the trip when you get home. The rows that ship with this template are five years of example travel, so replace them with your own.
`,
  },
  {
    path: 'travel/trips.md',
    content: `---
type: Dataset
title: Trips
description: Every trip taken, booked or being planned, with where, how long, the budget and how good it was.
tags: [travel, trips]
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    trip: { type: text, required: true }
    country: { type: text }
    region: { type: enum, values: [uk, europe, long-haul] }
    kind: { type: enum, values: [city, beach, outdoors, family, work] }
    start: { type: date }
    end: { type: date }
    nights: { type: number }
    status: { type: enum, values: [idea, planning, booked, done], required: true }
    budget: { type: currency, currency: GBP }
    rating: { type: number }
---

# Trips

Rate each trip from 1 to 5 when you get home.

| id | trip | country | region | kind | start | end | nights | status | budget | rating |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cornwall-21 | Cornwall | United Kingdom | uk | beach | 2021-10-22 | 2021-10-26 | 4 | done | 600.00 | 3 |
| edinburgh-22 | Edinburgh | United Kingdom | uk | city | 2022-02-18 | 2022-02-21 | 3 | done | 450.00 | 4 |
| lakes-22 | Lake District | United Kingdom | uk | outdoors | 2022-05-27 | 2022-06-01 | 5 | done | 700.00 | 4 |
| mallorca-22 | Mallorca | Spain | europe | beach | 2022-08-13 | 2022-08-20 | 7 | done | 1,400.00 | 4 |
| copenhagen-22 | Copenhagen | Denmark | europe | city | 2022-11-10 | 2022-11-13 | 3 | done | 750.00 | 3 |
| snowdonia-23 | Snowdonia | United Kingdom | uk | outdoors | 2023-04-07 | 2023-04-10 | 3 | done | 400.00 | 4 |
| lisbon-23 | Lisbon | Portugal | europe | city | 2023-05-25 | 2023-05-29 | 4 | done | 900.00 | 4 |
| croatia-23 | Split and Hvar | Croatia | europe | beach | 2023-08-19 | 2023-08-28 | 9 | done | 1,900.00 | 4 |
| york-23 | York with family | United Kingdom | uk | family | 2023-10-27 | 2023-10-29 | 2 | done | 350.00 | 4 |
| alps-24 | Chamonix | France | europe | outdoors | 2024-02-10 | 2024-02-16 | 6 | done | 1,700.00 | 4 |
| berlin-24 | Berlin | Germany | europe | city | 2024-04-18 | 2024-04-22 | 4 | done | 850.00 | 4 |
| norway-24 | Norwegian fjords | Norway | europe | outdoors | 2024-06-22 | 2024-06-29 | 7 | done | 2,100.00 | 4 |
| canada-24 | Vancouver and the Rockies | Canada | long-haul | outdoors | 2024-09-07 | 2024-09-21 | 14 | done | 4,600.00 | 5 |
| valencia-25 | Valencia marathon trip | Spain | europe | city | 2025-02-27 | 2025-03-03 | 4 | done | 950.00 | 4 |
| skye-25 | Isle of Skye | United Kingdom | uk | outdoors | 2025-05-23 | 2025-05-28 | 5 | done | 900.00 | 5 |
| greece-25 | Naxos and Paros | Greece | europe | beach | 2025-07-26 | 2025-08-05 | 10 | done | 2,400.00 | 5 |
| rome-25 | Rome | Italy | europe | city | 2025-10-16 | 2025-10-20 | 4 | done | 1,000.00 | 5 |
| japan-26 | Tokyo and Kyoto | Japan | long-haul | city | 2026-04-02 | 2026-04-18 | 16 | done | 5,200.00 | 4 |
| pembrokeshire-26 | Pembrokeshire | United Kingdom | uk | family | 2026-06-12 | 2026-06-16 | 4 | done | 650.00 | 5 |
| dolomites-26 | Dolomites | Italy | europe | outdoors | 2026-08-29 | 2026-09-06 | 8 | done | 2,300.00 | 5 |
| vienna-26 | Vienna Christmas markets | Austria | europe | city | 2026-12-04 | 2026-12-07 | 3 | booked | 800.00 |  |
| iceland-27 | Iceland ring road | Iceland | europe | outdoors | 2027-03-12 | 2027-03-21 | 9 | planning | 3,200.00 |  |
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

Log bookings when you pay for them and a total per category when you get home.

| date | trip | category | amount | notes |
| --- | --- | --- | --- | --- |
| 2021-08-31 | cornwall-21 | accommodation | 230.00 |  |
| 2021-09-04 | cornwall-21 | transport | 180.00 |  |
| 2021-10-23 | cornwall-21 | activities | 70.00 |  |
| 2021-10-23 | cornwall-21 | food | 120.00 |  |
| 2021-12-08 | edinburgh-22 | accommodation | 150.00 |  |
| 2021-12-25 | edinburgh-22 | transport | 120.00 |  |
| 2022-02-19 | edinburgh-22 | activities | 50.00 |  |
| 2022-02-19 | edinburgh-22 | food | 80.00 |  |
| 2022-03-17 | lakes-22 | accommodation | 260.00 |  |
| 2022-03-19 | lakes-22 | transport | 200.00 |  |
| 2022-05-28 | lakes-22 | activities | 80.00 |  |
| 2022-05-28 | lakes-22 | food | 130.00 |  |
| 2022-06-09 | mallorca-22 | accommodation | 500.00 |  |
| 2022-06-22 | mallorca-22 | transport | 390.00 |  |
| 2022-08-14 | mallorca-22 | activities | 160.00 |  |
| 2022-08-14 | mallorca-22 | food | 260.00 |  |
| 2022-08-18 | copenhagen-22 | accommodation | 250.00 |  |
| 2022-09-30 | copenhagen-22 | transport | 200.00 |  |
| 2022-11-11 | copenhagen-22 | activities | 80.00 |  |
| 2022-11-11 | copenhagen-22 | food | 130.00 |  |
| 2023-01-11 | snowdonia-23 | accommodation | 140.00 |  |
| 2023-02-02 | snowdonia-23 | transport | 110.00 |  |
| 2023-03-22 | lisbon-23 | accommodation | 310.00 |  |
| 2023-04-08 | snowdonia-23 | activities | 40.00 |  |
| 2023-04-08 | snowdonia-23 | food | 70.00 |  |
| 2023-04-11 | lisbon-23 | transport | 240.00 |  |
| 2023-05-26 | lisbon-23 | activities | 100.00 |  |
| 2023-05-26 | lisbon-23 | food | 160.00 |  |
| 2023-05-29 | croatia-23 | transport | 520.00 |  |
| 2023-07-07 | croatia-23 | accommodation | 660.00 |  |
| 2023-08-07 | york-23 | accommodation | 130.00 |  |
| 2023-08-17 | york-23 | transport | 100.00 |  |
| 2023-08-20 | croatia-23 | activities | 210.00 |  |
| 2023-08-20 | croatia-23 | food | 350.00 |  |
| 2023-10-28 | york-23 | activities | 40.00 |  |
| 2023-10-28 | york-23 | food | 70.00 |  |
| 2023-11-24 | alps-24 | accommodation | 570.00 |  |
| 2023-12-23 | alps-24 | transport | 450.00 |  |
| 2024-01-25 | berlin-24 | accommodation | 330.00 |  |
| 2024-02-07 | berlin-24 | transport | 260.00 |  |
| 2024-02-11 | alps-24 | activities | 180.00 |  |
| 2024-02-11 | alps-24 | food | 300.00 |  |
| 2024-04-06 | norway-24 | transport | 640.00 |  |
| 2024-04-14 | norway-24 | accommodation | 810.00 |  |
| 2024-04-19 | berlin-24 | activities | 100.00 |  |
| 2024-04-19 | berlin-24 | food | 170.00 |  |
| 2024-06-23 | norway-24 | activities | 250.00 |  |
| 2024-06-23 | norway-24 | food | 420.00 |  |
| 2024-06-24 | canada-24 | accommodation | 1,750.00 |  |
| 2024-07-11 | canada-24 | transport | 1,380.00 |  |
| 2024-09-08 | canada-24 | activities | 550.00 |  |
| 2024-09-08 | canada-24 | food | 920.00 |  |
| 2025-01-08 | valencia-25 | accommodation | 360.00 |  |
| 2025-01-10 | valencia-25 | transport | 280.00 |  |
| 2025-02-28 | skye-25 | transport | 230.00 |  |
| 2025-02-28 | valencia-25 | activities | 110.00 |  |
| 2025-02-28 | valencia-25 | food | 190.00 |  |
| 2025-03-24 | skye-25 | accommodation | 300.00 |  |
| 2025-05-15 | greece-25 | accommodation | 920.00 |  |
| 2025-05-16 | greece-25 | transport | 730.00 |  |
| 2025-05-24 | skye-25 | activities | 90.00 |  |
| 2025-05-24 | skye-25 | food | 160.00 |  |
| 2025-07-27 | greece-25 | activities | 290.00 |  |
| 2025-07-27 | greece-25 | food | 490.00 |  |
| 2025-08-04 | rome-25 | accommodation | 340.00 |  |
| 2025-08-15 | rome-25 | transport | 270.00 |  |
| 2025-10-17 | rome-25 | activities | 110.00 |  |
| 2025-10-17 | rome-25 | food | 180.00 |  |
| 2026-01-08 | japan-26 | accommodation | 1,900.00 |  |
| 2026-01-20 | japan-26 | transport | 1,500.00 |  |
| 2026-04-03 | japan-26 | activities | 600.00 |  |
| 2026-04-03 | japan-26 | food | 1,000.00 |  |
| 2026-04-15 | pembrokeshire-26 | accommodation | 220.00 |  |
| 2026-05-03 | pembrokeshire-26 | transport | 180.00 |  |
| 2026-06-13 | pembrokeshire-26 | activities | 70.00 |  |
| 2026-06-13 | pembrokeshire-26 | food | 120.00 |  |
| 2026-06-23 | dolomites-26 | transport | 620.00 |  |
| 2026-07-04 | dolomites-26 | accommodation | 780.00 |  |
| 2026-08-30 | dolomites-26 | activities | 250.00 |  |
| 2026-08-30 | dolomites-26 | food | 410.00 |  |
| 2026-09-10 | vienna-26 | accommodation | 300.00 |  |
| 2026-10-01 | vienna-26 | transport | 220.00 |  |
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
description: Where you have been, how much time away you take, what it costs and what is coming up.
---

# Travel dashboard

Reads [Trips](trips.md) and [Trip spending](spending.md).

\`\`\`caedora-dashboard
data:
  trips: trips.md
  spending: spending.md
rows:
  - columns: 4
    items:
      - stat: { label: Next trip, source: trips, where: start > today(), value: min(start), format: date }
      - stat: { label: Nights away this year, source: trips, where: year(start) = year(today()), value: sum(nights), format: integer }
      - stat: { label: Trips taken, source: trips, where: status = done, value: count(), format: integer }
      - stat: { label: Average trip rating, source: trips, where: status = done, value: avg(rating), format: number }
  - columns: 2
    items:
      - bar: { title: Nights away per year, source: trips, x: year(start), y: sum(nights), series: region, stacked: true, format: integer }
      - bar: { title: Spending per year, source: spending, x: year(trip.start), y: sum(amount), series: category, stacked: true }
  - columns: 2
    items:
      - pie: { title: Nights by kind of trip, source: trips, where: status = done, label: kind, value: sum(nights), format: integer }
      - line: { title: Trip rating, description: Average out of 5 for each year, source: trips, where: status = done, x: year(start), y: avg(rating), format: number }
  - columns: 2
    items:
      - progress:
          label: Booked trips paid so far
          description: Against the budget for every booked trip
          source: spending
          where: trip.status = booked
          value: sum(amount)
          max: { source: trips, where: status = booked, value: sum(budget) }
      - table:
          title: Coming up
          source: trips
          where: "status in [booked, planning]"
          columns: [trip, start, nights, status, budget]
          sort: start
  - columns: 1
    items:
      - table:
          title: Best trips
          source: trips
          where: rating = 5
          columns: [trip, country, start, nights, rating]
          sort: -start
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

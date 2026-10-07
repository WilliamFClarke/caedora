import type { TemplateFile } from '../vault-templates'

/**
 * Home operations template. Five years of example energy bills, upgrades and
 * upkeep, read by dashboard.md. Replace the rows with your own.
 */

export const HOME_OPERATIONS_FILES: TemplateFile[] = [
  {
    path: 'home/README.md',
    content: `# Home operations

Open the [home dashboard](dashboard.md) for your energy bills, what upgrades have saved and what needs doing next.

Track maintenance, household documents, inventory, chores and vendors here. Copy each month's meter readings and bills into [Energy](energy.md), log improvements in [Upgrades](upgrades.md) and jobs in [Maintenance](maintenance.md), and record anything under warranty in [Inventory](inventory.md). The rows that ship with this template are five years of example data, so replace them with your own.
`,
  },
  {
    path: 'home/energy.md',
    content: `---
type: Dataset
title: Energy
description: Monthly energy use and cost from each meter. Solar shows generation, with export earnings as a negative cost.
tags: [home, energy]
dataset:
  key: [date, meter]
  columns:
    date: { type: date, required: true }
    meter: { type: enum, values: [electricity, gas, solar], required: true }
    kwh: { type: number, required: true }
    cost: { type: currency, currency: GBP }
---

# Energy

Copy these from your bills or supplier app at the end of each month. Cost includes the standing charge.

| date | meter | kwh | cost |
| --- | --- | --- | --- |
| 2021-10-31 | electricity | 280 | 74.77 |
| 2021-10-31 | gas | 832 | 42.28 |
| 2021-11-30 | electricity | 306 | 80.33 |
| 2021-11-30 | gas | 1196 | 56.85 |
| 2021-12-31 | electricity | 337 | 86.85 |
| 2021-12-31 | gas | 1419 | 65.76 |
| 2022-01-31 | electricity | 350 | 89.55 |
| 2022-01-31 | gas | 1420 | 65.82 |
| 2022-02-28 | electricity | 340 | 87.34 |
| 2022-02-28 | gas | 1334 | 62.38 |
| 2022-03-31 | electricity | 307 | 80.45 |
| 2022-03-31 | gas | 1114 | 53.57 |
| 2022-04-30 | electricity | 299 | 99.85 |
| 2022-04-30 | gas | 842 | 67.96 |
| 2022-05-31 | electricity | 253 | 86.79 |
| 2022-05-31 | gas | 501 | 44.09 |
| 2022-06-30 | electricity | 249 | 85.63 |
| 2022-06-30 | gas | 291 | 29.40 |
| 2022-07-31 | electricity | 228 | 79.73 |
| 2022-07-31 | gas | 202 | 23.13 |
| 2022-08-31 | electricity | 227 | 79.63 |
| 2022-08-31 | gas | 303 | 30.24 |
| 2022-09-30 | electricity | 255 | 87.27 |
| 2022-09-30 | gas | 548 | 47.33 |
| 2022-10-31 | electricity | 279 | 110.83 |
| 2022-10-31 | gas | 814 | 90.37 |
| 2022-11-30 | electricity | 330 | 128.24 |
| 2022-11-30 | gas | 895 | 98.54 |
| 2022-12-31 | electricity | 345 | 133.22 |
| 2022-12-31 | gas | 1060 | 114.99 |
| 2023-01-31 | electricity | 346 | 133.48 |
| 2023-01-31 | gas | 1190 | 127.95 |
| 2023-02-28 | electricity | 327 | 127.18 |
| 2023-02-28 | gas | 998 | 108.76 |
| 2023-03-31 | electricity | 311 | 121.60 |
| 2023-03-31 | gas | 781 | 87.13 |
| 2023-04-30 | electricity | 288 | 113.89 |
| 2023-04-30 | gas | 610 | 69.96 |
| 2023-05-31 | electricity | 262 | 105.16 |
| 2023-05-31 | gas | 360 | 45.03 |
| 2023-06-30 | electricity | 233 | 95.31 |
| 2023-06-30 | gas | 200 | 29.04 |
| 2023-07-31 | electricity | 235 | 81.68 |
| 2023-07-31 | gas | 145 | 19.18 |
| 2023-08-31 | electricity | 240 | 83.15 |
| 2023-08-31 | gas | 195 | 22.67 |
| 2023-09-30 | electricity | 251 | 86.24 |
| 2023-09-30 | gas | 370 | 34.88 |
| 2023-10-31 | electricity | 264 | 89.91 |
| 2023-10-31 | gas | 613 | 51.92 |
| 2023-11-30 | electricity | 286 | 96.15 |
| 2023-11-30 | gas | 872 | 70.07 |
| 2023-12-31 | electricity | 326 | 107.34 |
| 2023-12-31 | gas | 982 | 77.75 |
| 2024-01-31 | electricity | 325 | 107.04 |
| 2024-01-31 | gas | 1009 | 79.63 |
| 2024-02-29 | electricity | 323 | 106.54 |
| 2024-02-29 | gas | 937 | 74.59 |
| 2024-03-31 | electricity | 300 | 99.94 |
| 2024-03-31 | gas | 851 | 68.57 |
| 2024-04-30 | electricity | 106 | 45.81 |
| 2024-04-30 | gas | 624 | 52.65 |
| 2024-04-30 | solar | 306 | -18.38 |
| 2024-05-31 | electricity | 60 | 32.80 |
| 2024-05-31 | gas | 373 | 35.09 |
| 2024-05-31 | solar | 443 | -26.57 |
| 2024-06-30 | electricity | 60 | 32.80 |
| 2024-06-30 | gas | 210 | 23.68 |
| 2024-06-30 | solar | 575 | -34.49 |
| 2024-07-31 | electricity | 60 | 32.80 |
| 2024-07-31 | gas | 143 | 19.02 |
| 2024-07-31 | solar | 484 | -29.07 |
| 2024-08-31 | electricity | 60 | 32.80 |
| 2024-08-31 | gas | 205 | 23.36 |
| 2024-08-31 | solar | 581 | -34.87 |
| 2024-09-30 | electricity | 60 | 32.80 |
| 2024-09-30 | gas | 359 | 34.13 |
| 2024-09-30 | solar | 421 | -25.27 |
| 2024-10-31 | electricity | 86 | 39.95 |
| 2024-10-31 | gas | 563 | 48.38 |
| 2024-10-31 | solar | 319 | -19.12 |
| 2024-11-30 | electricity | 203 | 72.93 |
| 2024-11-30 | gas | 787 | 64.09 |
| 2024-11-30 | solar | 186 | -11.16 |
| 2024-12-31 | electricity | 249 | 85.71 |
| 2024-12-31 | gas | 948 | 75.34 |
| 2024-12-31 | solar | 119 | -7.16 |
| 2025-01-31 | electricity | 276 | 93.28 |
| 2025-01-31 | gas | 1100 | 86.00 |
| 2025-01-31 | solar | 87 | -5.22 |
| 2025-02-28 | electricity | 251 | 86.32 |
| 2025-02-28 | gas | 998 | 78.84 |
| 2025-02-28 | solar | 140 | -8.40 |
| 2025-03-31 | electricity | 186 | 68.17 |
| 2025-03-31 | gas | 861 | 69.26 |
| 2025-03-31 | solar | 198 | -11.86 |
| 2025-04-30 | electricity | 88 | 40.54 |
| 2025-04-30 | gas | 587 | 50.06 |
| 2025-04-30 | solar | 353 | -21.21 |
| 2025-05-31 | electricity | 60 | 29.20 |
| 2025-05-31 | gas | 353 | 31.95 |
| 2025-05-31 | solar | 398 | -23.87 |
| 2025-06-30 | electricity | 60 | 29.20 |
| 2025-06-30 | gas | 195 | 21.68 |
| 2025-06-30 | solar | 514 | -30.84 |
| 2025-07-31 | electricity | 60 | 29.20 |
| 2025-07-31 | gas | 136 | 17.87 |
| 2025-07-31 | solar | 477 | -28.59 |
| 2025-08-31 | electricity | 60 | 29.20 |
| 2025-08-31 | gas | 198 | 21.89 |
| 2025-08-31 | solar | 525 | -31.48 |
| 2025-09-30 | electricity | 60 | 29.20 |
| 2025-09-30 | gas | 377 | 33.50 |
| 2025-09-30 | solar | 436 | -26.14 |
| 2025-10-31 | electricity | 124 | 43.23 |
| 2025-10-31 | gas | 609 | 48.61 |
| 2025-10-31 | solar | 285 | -17.10 |
| 2025-11-30 | electricity | 180 | 55.62 |
| 2025-11-30 | gas | 750 | 57.77 |
| 2025-11-30 | solar | 230 | -13.79 |
| 2025-12-31 | electricity | 237 | 68.16 |
| 2025-12-31 | gas | 862 | 65.00 |
| 2025-12-31 | solar | 124 | -7.45 |
| 2026-01-31 | electricity | 264 | 74.04 |
| 2026-01-31 | gas | 942 | 70.20 |
| 2026-01-31 | solar | 87 | -5.19 |
| 2026-02-28 | electricity | 249 | 70.75 |
| 2026-02-28 | gas | 842 | 63.75 |
| 2026-02-28 | solar | 116 | -6.99 |
| 2026-03-31 | electricity | 187 | 57.07 |
| 2026-03-31 | gas | 687 | 53.65 |
| 2026-03-31 | solar | 183 | -10.97 |
| 2026-04-30 | electricity | 86 | 34.95 |
| 2026-04-30 | gas | 500 | 41.50 |
| 2026-04-30 | solar | 310 | -18.63 |
| 2026-05-31 | electricity | 60 | 29.20 |
| 2026-05-31 | gas | 339 | 31.03 |
| 2026-05-31 | solar | 447 | -26.79 |
| 2026-06-30 | electricity | 60 | 29.20 |
| 2026-06-30 | gas | 172 | 20.18 |
| 2026-06-30 | solar | 496 | -29.75 |
| 2026-07-31 | electricity | 60 | 29.20 |
| 2026-07-31 | gas | 118 | 16.67 |
| 2026-07-31 | solar | 595 | -35.69 |
| 2026-08-31 | electricity | 60 | 29.20 |
| 2026-08-31 | gas | 177 | 20.48 |
| 2026-08-31 | solar | 514 | -30.83 |
| 2026-09-30 | electricity | 60 | 29.20 |
| 2026-09-30 | gas | 309 | 29.07 |
| 2026-09-30 | solar | 416 | -24.98 |
`,
  },
  {
    path: 'home/upgrades.md',
    content: `---
type: Dataset
title: Upgrades
description: Improvements to the house, what they cost and roughly what they save each year.
tags: [home, upgrades]
dataset:
  columns:
    date: { type: date, required: true }
    upgrade: { type: text, required: true }
    area: { type: text }
    cost: { type: currency, currency: GBP }
    yearly_saving: { type: currency, currency: GBP }
---

# Upgrades

| date | upgrade | area | cost | yearly_saving |
| --- | --- | --- | --- | --- |
| 2022-11-14 | Loft insulation topped up to 270mm | insulation | 650.00 | 240.00 |
| 2023-02-06 | Smart thermostat and radiator valves | heating | 420.00 | 150.00 |
| 2023-09-18 | LED bulbs throughout | electrics | 120.00 | 60.00 |
| 2024-04-22 | Solar panels (4.2kW) and battery | solar | 9,800.00 | 820.00 |
| 2024-10-07 | Draught proofing doors and windows | insulation | 280.00 | 90.00 |
| 2025-05-12 | Switched to a time of use tariff | tariff | 0.00 | 210.00 |
| 2025-11-03 | Cavity wall insulation | insulation | 1,900.00 | 310.00 |
| 2026-06-15 | Heat pump hot water cylinder | heating | 2,400.00 | 260.00 |
`,
  },
  {
    path: 'home/maintenance.md',
    content: `---
type: Dataset
title: Maintenance
description: Work done around the home, what it cost and when it next needs doing.
tags: [home, maintenance]
dataset:
  columns:
    date: { type: date, required: true }
    area: { type: enum, values: [heating, plumbing, electrics, roof, garden, exterior, appliances, decorating, solar, other], required: true }
    work: { type: text, required: true }
    cost: { type: currency, currency: GBP }
    next_check: { type: date }
---

# Maintenance

| date | area | work | cost | next_check |
| --- | --- | --- | --- | --- |
| 2021-10-12 | electrics | Extra sockets in the study | 274.00 |  |
| 2021-11-10 | plumbing | Fixed dripping tap | 87.00 |  |
| 2021-12-31 | garden | Hedge cut | 69.00 | 2022-06-29 |
| 2022-01-29 | exterior | Patio jet washed | 0.00 | 2023-01-29 |
| 2022-03-03 | exterior | Windows cleaned | 30.00 | 2022-05-02 |
| 2022-04-23 | garden | Hedge cut | 62.00 | 2022-10-20 |
| 2022-06-04 | plumbing | Bathroom resealed | 100.00 | 2024-06-03 |
| 2022-08-03 | appliances | Washing machine repair | 138.00 |  |
| 2022-09-12 | exterior | Patio jet washed | 0.00 | 2023-09-12 |
| 2022-11-04 | exterior | Windows cleaned | 30.00 | 2023-01-03 |
| 2022-12-14 | plumbing | Bathroom resealed | 100.00 | 2024-12-13 |
| 2023-01-12 | heating | Boiler service | 116.00 | 2024-01-12 |
| 2023-03-11 | electrics | Smoke alarms tested | 0.00 | 2023-09-07 |
| 2023-04-30 | garden | Fence panel replaced | 174.00 |  |
| 2023-06-19 | appliances | Washing machine repair | 117.00 |  |
| 2023-07-23 | plumbing | Fixed dripping tap | 79.00 |  |
| 2023-09-10 | plumbing | Fixed dripping tap | 79.00 |  |
| 2023-10-08 | garden | Fence panel replaced | 181.00 |  |
| 2023-11-27 | exterior | Patio jet washed | 0.00 | 2024-11-26 |
| 2024-01-01 | decorating | Painted a room | 201.00 |  |
| 2024-02-10 | garden | Fence panel replaced | 182.00 |  |
| 2024-04-05 | exterior | Patio jet washed | 0.00 | 2025-04-05 |
| 2024-05-08 | exterior | Patio jet washed | 0.00 | 2025-05-08 |
| 2024-06-30 | garden | Fence panel replaced | 158.00 |  |
| 2024-08-02 | exterior | Windows cleaned | 26.00 | 2024-10-01 |
| 2024-09-07 | heating | Boiler service | 99.00 | 2025-09-07 |
| 2024-11-03 | exterior | Patio jet washed | 0.00 | 2025-11-03 |
| 2024-12-31 | heating | Radiators bled | 0.00 | 2025-12-31 |
| 2025-02-06 | plumbing | Bathroom resealed | 109.00 |  |
| 2025-03-07 | heating | Boiler service | 124.00 | 2026-03-07 |
| 2025-04-10 | plumbing | Bathroom resealed | 116.00 |  |
| 2025-05-16 | decorating | Painted a room | 222.00 |  |
| 2025-06-25 | electrics | Extra sockets in the study | 323.00 |  |
| 2025-07-24 | electrics | Smoke alarms tested | 0.00 | 2026-01-20 |
| 2025-09-22 | plumbing | Fixed dripping tap | 92.00 |  |
| 2025-11-09 | electrics | Smoke alarms tested | 0.00 | 2026-05-08 |
| 2025-12-15 | heating | Boiler service | 131.00 |  |
| 2026-02-03 | solar | Panels cleaned | 109.00 |  |
| 2026-03-29 | electrics | Extra sockets in the study | 335.00 |  |
| 2026-05-14 | solar | Panels cleaned | 95.00 | 2027-05-14 |
| 2026-05-28 | garden | Hedge cut | 75.00 |  |
| 2026-06-20 | garden | Hedge cut | 70.00 | 2026-12-20 |
| 2026-07-27 | heating | Boiler service | 132.00 |  |
| 2026-08-30 | electrics | Smoke alarms tested | 0.00 | 2027-02-28 |
| 2026-09-02 | exterior | Windows cleaned | 25.00 | 2026-11-01 |
| 2026-09-04 | roof | Loose tiles fixed | 188.00 |  |
| 2026-09-08 | heating | Boiler service | 118.00 | 2027-09-08 |
| 2026-09-21 | roof | Gutters cleared | 95.00 | 2027-09-21 |
`,
  },
  {
    path: 'home/inventory.md',
    content: `---
type: Dataset
title: Inventory
description: Things worth tracking at home, where they are and when their warranty ends.
tags: [home, inventory]
dataset:
  columns:
    item: { type: text, required: true }
    location: { type: text }
    purchased: { type: date }
    cost: { type: currency, currency: GBP }
    warranty_until: { type: date }
    notes: { type: text }
---

# Inventory

| item | location | purchased | cost | warranty_until | notes |
| --- | --- | --- | --- | --- | --- |
| Boiler | Utility room | 2021-09-15 | 2,300.00 | 2031-09-15 | Needs a yearly service to keep the warranty |
| Fridge freezer | Kitchen | 2022-06-01 | 599.00 | 2027-06-01 |  |
| Washing machine | Kitchen | 2024-02-10 | 449.00 | 2029-02-10 |  |
| Dishwasher | Kitchen | 2023-08-19 | 399.00 | 2026-08-19 |  |
| Laptop | Study | 2025-11-20 | 1,099.00 | 2026-11-20 |  |
| Television | Living room | 2023-12-01 | 650.00 | 2026-12-01 |  |
| Solar inverter | Loft | 2024-04-22 | 1,200.00 | 2034-04-22 |  |
| Home battery | Garage | 2024-04-22 | 3,400.00 | 2034-04-22 |  |
| Lawn mower | Shed | 2022-04-09 | 229.00 | 2025-04-09 |  |
| Sofa | Living room | 2025-07-01 | 1,350.00 | 2027-07-01 |  |
| Heat pump cylinder | Airing cupboard | 2026-06-15 | 2,400.00 | 2033-06-15 |  |
`,
  },
  {
    path: 'home/vendors.md',
    content: `---
type: Dataset
title: Vendors
description: Tradespeople and services you have used, and how to reach them.
tags: [home, vendors]
---

# Vendors

| Vendor | Service | Contact | Notes |
| --- | --- | --- | --- |
| Example Heating | Boiler service | | Booked each September |
| Example Roofing | Gutters and roof | | |
| Example Solar | Panels and battery | | Ten year warranty |
`,
  },
  {
    path: 'home/dashboard.md',
    content: `---
type: Dashboard
title: Home dashboard
description: Energy use and bills, what upgrades have saved, upkeep spending and what needs doing next.
---

# Home dashboard

Reads [Energy](energy.md), [Upgrades](upgrades.md), [Maintenance](maintenance.md) and [Inventory](inventory.md).

\`\`\`caedora-dashboard
data:
  energy: energy.md
  upgrades: upgrades.md
  maintenance: maintenance.md
  inventory: inventory.md
rows:
  - columns: 4
    items:
      - stat: { label: Energy bill last month, source: energy, latest: date, value: sum(cost), sparkline: true }
      - stat: { label: Energy spend this year, source: energy, where: year(date) = year(today()), value: sum(cost) }
      - stat: { label: Upgrades save each year, source: upgrades, value: sum(yearly_saving) }
      - stat: { label: Solar generated this year (kWh), source: energy, where: meter = solar and year(date) = year(today()), value: sum(kwh), format: integer }
  - columns: 1
    items:
      - bar:
          title: Energy cost per month
          description: Solar export earnings show below zero
          source: energy
          x: month(date)
          y: sum(cost)
          series: meter
          stacked: true
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - line: { title: Gas used per month (kWh), source: energy, where: meter = gas, x: month(date), y: sum(kwh), format: integer, ranges: [12m, 3y, all] }
      - bar: { title: Average monthly bill by year, source: energy, x: year(date), y: avg(cost), series: meter, stacked: true }
  - columns: 2
    items:
      - table:
          title: Upgrades
          source: upgrades
          columns: [date, upgrade, cost, yearly_saving]
          sort: -date
      - bar: { title: Upkeep spending by area, source: maintenance, x: area, y: sum(cost), horizontal: true }
  - columns: 2
    items:
      - list:
          title: Coming up
          source: maintenance
          where: next_check >= today()
          label: work
          detail: next_check
          sort: next_check
          limit: 6
      - table:
          title: Warranties still running
          source: inventory
          where: warranty_until >= today()
          columns: [item, location, warranty_until]
          sort: warranty_until
\`\`\`
`,
  },
  {
    path: 'home/AGENTS.md',
    content: `# Household operations guidance

Help summarise maintenance history, prepare checklists, and keep household recommendations grounded in recorded facts.

- energy.md, upgrades.md, maintenance.md and inventory.md are Datasets. Add rows rather than editing old ones, keep ISO dates (YYYY-MM-DD) and plain numbers for money.
- Suggest a next_check date when a job usually recurs, such as a yearly boiler service.
`,
  },
]

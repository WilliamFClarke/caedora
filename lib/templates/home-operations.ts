import type { TemplateFile } from '../vault-templates'

/**
 * Home operations template. Maintenance, inventory and vendors are Datasets
 * that dashboard.md reads. The rows are illustrative examples to replace.
 */

export const HOME_OPERATIONS_FILES: TemplateFile[] = [
  {
    path: 'home/README.md',
    content: `# Home operations

Open the [home dashboard](dashboard.md) for upcoming checks, maintenance spending and warranties about to run out.

Track maintenance, household documents, inventory, chores and vendors here. Log each job in [Maintenance](maintenance.md) with when it next needs checking, and record anything under warranty in [Inventory](inventory.md). The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'home/maintenance.md',
    content: `---
type: Dataset
title: Maintenance
description: Work done around the home, what it cost and when it next needs checking.
tags: [home, maintenance]
dataset:
  columns:
    date: { type: date, required: true }
    area: { type: enum, values: [heating, plumbing, electrics, roof, garden, appliances, decorating, other], required: true }
    work: { type: text, required: true }
    cost: { type: currency, currency: GBP }
    vendor: { type: text }
    next_check: { type: date }
---

# Maintenance

| date | area | work | cost | vendor | next_check |
| --- | --- | --- | --- | --- | --- |
| 2025-11-12 | heating | Boiler service | 95.00 | Example Heating | 2026-11-12 |
| 2026-01-20 | plumbing | Fixed dripping kitchen tap | 60.00 | Example Plumbing | |
| 2026-03-08 | garden | Fence panel replaced | 140.00 | | |
| 2026-04-15 | roof | Gutters cleared | 80.00 | Example Roofing | 2026-10-15 |
| 2026-05-02 | decorating | Painted spare room | 120.00 | | |
| 2026-06-18 | appliances | Washing machine repair | 110.00 | Example Repairs | |
| 2026-08-30 | electrics | Smoke alarms tested | 0.00 | | 2026-11-30 |
| 2026-09-14 | garden | Hedge trimmed | 45.00 | | 2027-03-14 |
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
| Washing machine | Kitchen | 2024-02-10 | 449.00 | 2027-02-10 | Receipt in documents |
| Fridge freezer | Kitchen | 2022-06-01 | 599.00 | 2024-06-01 | |
| Laptop | Study | 2025-11-20 | 1,099.00 | 2026-11-20 | |
| Boiler | Utility room | 2021-09-15 | 2,300.00 | 2031-09-15 | Needs a yearly service to keep the warranty |
| Television | Living room | 2023-12-01 | 650.00 | 2026-12-01 | |
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
| Example Heating | Boiler service | | Booked each autumn |
| Example Plumbing | Plumbing | | |
| Example Roofing | Gutters and roof | | |
`,
  },
  {
    path: 'home/dashboard.md',
    content: `---
type: Dashboard
title: Home dashboard
description: Upcoming checks, maintenance spending and warranties from the home Datasets.
---

# Home dashboard

Reads [Maintenance](maintenance.md) and [Inventory](inventory.md).

\`\`\`caedora-dashboard
data:
  maintenance: maintenance.md
  inventory: inventory.md
rows:
  - columns: 3
    items:
      - stat: { label: Spent this year, source: maintenance, where: year(date) = year(today()), value: sum(cost) }
      - stat: { label: Next check due, source: maintenance, where: next_check >= today(), value: min(next_check), format: date }
      - stat: { label: Items under warranty, source: inventory, where: warranty_until >= today(), value: count(), format: integer }
  - columns: 2
    items:
      - list:
          title: Upcoming checks
          source: maintenance
          where: next_check >= today()
          label: work
          detail: next_check
          sort: next_check
          limit: 5
      - bar: { title: Spending by area, source: maintenance, x: area, y: sum(cost), horizontal: true }
  - columns: 1
    items:
      - table:
          title: Warranties
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

- maintenance.md and inventory.md are Datasets. Add a row per job or item, keep ISO dates (YYYY-MM-DD) and plain numbers for costs.
- Suggest a next_check date when a job usually recurs, such as a yearly boiler service.
`,
  },
]

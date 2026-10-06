import type { TemplateFile } from '../vault-templates'

/**
 * Investment tracker template. Portfolio snapshots, contributions and the
 * watchlist are Datasets that dashboard.md reads. The rows are illustrative
 * examples to replace.
 */

export const INVESTMENT_TRACKER_FILES: TemplateFile[] = [
  {
    path: 'finance/investments/README.md',
    content: `# Investment tracker

Open the [investment dashboard](dashboard.md) for portfolio value, allocation and contributions this tax year.

Track portfolio snapshots, contributions, allocation reviews, watchlists and investment notes here. Add a row per holding to [Portfolio](portfolio.md) whenever you check values, for example at the end of each month, and record new money in [Contributions](contributions.md). The rows that ship with this template are examples, so replace them with your own.
`,
  },
  {
    path: 'finance/investments/portfolio.md',
    content: `---
type: Dataset
title: Portfolio
description: Dated value snapshots for each holding.
tags: [finance, investments, portfolio]
dataset:
  key: [date, account, asset]
  columns:
    date: { type: date, required: true }
    account: { type: text, required: true }
    asset: { type: text, required: true }
    asset_class: { type: enum, values: [equities, bonds, property, cash, other] }
    units: { type: number }
    value: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# Portfolio

| date | account | asset | asset_class | units | value | notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-31 | ISA | Global equity index | equities | 112.4 | 18,200.00 | |
| 2026-07-31 | ISA | UK gilts fund | bonds | 40.1 | 4,050.00 | |
| 2026-07-31 | SIPP | Global equity index | equities | 85.0 | 13,760.00 | |
| 2026-07-31 | SIPP | Property fund | property | 210.0 | 2,310.00 | |
| 2026-07-31 | ISA | Cash | cash | | 1,200.00 | |
| 2026-08-31 | ISA | Global equity index | equities | 115.0 | 18,860.00 | |
| 2026-08-31 | ISA | UK gilts fund | bonds | 41.0 | 4,120.00 | |
| 2026-08-31 | SIPP | Global equity index | equities | 86.2 | 14,140.00 | |
| 2026-08-31 | SIPP | Property fund | property | 210.0 | 2,290.00 | |
| 2026-08-31 | ISA | Cash | cash | | 950.00 | |
| 2026-09-30 | ISA | Global equity index | equities | 118.1 | 19,480.00 | |
| 2026-09-30 | ISA | UK gilts fund | bonds | 42.0 | 4,210.00 | |
| 2026-09-30 | SIPP | Global equity index | equities | 87.4 | 14,420.00 | |
| 2026-09-30 | SIPP | Property fund | property | 210.0 | 2,335.00 | |
| 2026-09-30 | ISA | Cash | cash | | 700.00 | |
`,
  },
  {
    path: 'finance/investments/contributions.md',
    content: `---
type: Dataset
title: Contributions
description: New money paid into each investment account.
tags: [finance, investments, contributions]
dataset:
  columns:
    date: { type: date, required: true }
    account: { type: text, required: true }
    amount: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# Contributions

| date | account | amount | notes |
| --- | --- | --- | --- |
| 2026-04-10 | ISA | 500.00 | |
| 2026-04-28 | SIPP | 250.00 | |
| 2026-05-10 | ISA | 500.00 | |
| 2026-05-28 | SIPP | 250.00 | |
| 2026-06-10 | ISA | 500.00 | |
| 2026-06-28 | SIPP | 250.00 | |
| 2026-07-10 | ISA | 500.00 | |
| 2026-07-28 | SIPP | 250.00 | |
| 2026-08-10 | ISA | 500.00 | |
| 2026-08-28 | SIPP | 250.00 | |
| 2026-09-10 | ISA | 500.00 | |
| 2026-09-28 | SIPP | 250.00 | |
`,
  },
  {
    path: 'finance/investments/watchlist.md',
    content: `---
type: Dataset
title: Watchlist
description: Assets you are watching, why, and what would prompt a review.
tags: [finance, investments, watchlist]
---

# Watchlist

| Asset | Reason watching | Trigger to review | Notes |
| --- | --- | --- | --- |
`,
  },
  {
    path: 'finance/investments/templates/investment-thesis.md',
    content: `---
tags: [finance, investments, thesis]
status: draft
---

# Investment thesis

## What it is

## Why it may be attractive

## Risks

## Review triggers

## Decision log
`,
  },
  {
    path: 'finance/investments/allocation-review.md',
    content: `---
tags: [finance, investments, allocation]
---

# Allocation review

## Current allocation

| Asset class | Target | Current | Action |
| --- | --- | --- | --- |

## Notes

## Follow-ups
`,
  },
  {
    path: 'finance/investments/dashboard.md',
    content: `---
type: Dashboard
title: Investment dashboard
description: Portfolio value, allocation and contributions from the investment Datasets.
---

# Investment dashboard

Reads [Portfolio](portfolio.md) and [Contributions](contributions.md).

\`\`\`caedora-dashboard
data:
  portfolio: portfolio.md
  contributions: contributions.md
rows:
  - columns: 3
    items:
      - stat: { label: Portfolio value, source: portfolio, latest: date, value: sum(value), trend: true, sparkline: true }
      - stat: { label: Contributed this tax year, source: contributions, where: tax_year(date) = current_tax_year(), value: sum(amount) }
      - stat: { label: Equities, source: portfolio, latest: date, where: asset_class = equities, value: sum(value), trend: true }
  - columns: 1
    items:
      - area:
          title: Value by asset class
          source: portfolio
          x: date
          y: sum(value)
          series: asset_class
          stacked: true
          snapshots: true
          ranges: [3m, 12m, all]
  - columns: 2
    items:
      - pie: { title: Allocation, source: portfolio, latest: date, label: asset_class, value: sum(value) }
      - bar: { title: Contributions, source: contributions, x: date, y: sum(amount), series: account, stacked: true, ranges: [12m, all] }
  - columns: 1
    items:
      - table:
          title: Latest holdings
          source: portfolio
          latest: date
          columns: [account, asset, asset_class, units, value]
          sort: -value
\`\`\`
`,
  },
  {
    path: 'finance/investments/AGENTS.md',
    content: `# Investment tracking guidance

Help organise recorded portfolio notes, contribution history and review prompts. Do not provide regulated financial advice, price predictions, or personalised buy or sell recommendations.

- portfolio.md and contributions.md are Datasets. Add one row per holding for each snapshot date rather than editing old rows, and keep ISO dates (YYYY-MM-DD) and plain numbers for money.
`,
  },
]

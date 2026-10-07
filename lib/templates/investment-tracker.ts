import type { TemplateFile } from '../vault-templates'

/**
 * Investment tracker template. Five years of example portfolio values,
 * contributions and dividends, read by dashboard.md. Replace the rows with your own.
 */

export const INVESTMENT_TRACKER_FILES: TemplateFile[] = [
  {
    path: 'finance/investments/README.md',
    content: `# Investment tracker

Open the [investment dashboard](dashboard.md) for portfolio growth, allocation, money paid in and dividends.

At the end of each quarter add a row per asset class to [Portfolio](portfolio.md). Record new money in [Contributions](contributions.md) and income in [Dividends](dividends.md), and keep your [target allocation](target-allocation.md) up to date. The rows that ship with this template are five years of example data, so replace them with your own.
`,
  },
  {
    path: 'finance/investments/portfolio.md',
    content: `---
type: Dataset
title: Portfolio
description: Value of each asset class at the end of every quarter, across ISA and pension.
tags: [finance, investments, portfolio]
dataset:
  key: [date, asset_class]
  columns:
    date: { type: date, required: true }
    asset_class: { type: enum, values: [global-equities, uk-equities, bonds, property, cash], required: true }
    value: { type: currency, currency: GBP, required: true }
---

# Portfolio

Add a row per asset class at the end of each quarter using the values in your ISA and pension accounts.

| date | asset_class | value |
| --- | --- | --- |
| 2021-12-31 | global-equities | 11,670.00 |
| 2021-12-31 | uk-equities | 1,940.00 |
| 2021-12-31 | bonds | 2,920.00 |
| 2021-12-31 | property | 970.00 |
| 2021-12-31 | cash | 1,940.00 |
| 2022-03-31 | global-equities | 12,800.00 |
| 2022-03-31 | uk-equities | 2,250.00 |
| 2022-03-31 | bonds | 3,190.00 |
| 2022-03-31 | property | 1,130.00 |
| 2022-03-31 | cash | 2,240.00 |
| 2022-06-30 | global-equities | 12,420.00 |
| 2022-06-30 | uk-equities | 2,300.00 |
| 2022-06-30 | bonds | 3,120.00 |
| 2022-06-30 | property | 1,140.00 |
| 2022-06-30 | cash | 2,370.00 |
| 2022-09-30 | global-equities | 13,360.00 |
| 2022-09-30 | uk-equities | 2,390.00 |
| 2022-09-30 | bonds | 3,180.00 |
| 2022-09-30 | property | 1,120.00 |
| 2022-09-30 | cash | 2,520.00 |
| 2022-12-31 | global-equities | 14,540.00 |
| 2022-12-31 | uk-equities | 2,690.00 |
| 2022-12-31 | bonds | 3,510.00 |
| 2022-12-31 | property | 1,200.00 |
| 2022-12-31 | cash | 2,710.00 |
| 2023-03-31 | global-equities | 17,900.00 |
| 2023-03-31 | uk-equities | 3,210.00 |
| 2023-03-31 | bonds | 4,260.00 |
| 2023-03-31 | property | 1,440.00 |
| 2023-03-31 | cash | 3,190.00 |
| 2023-06-30 | global-equities | 19,930.00 |
| 2023-06-30 | uk-equities | 3,380.00 |
| 2023-06-30 | bonds | 4,480.00 |
| 2023-06-30 | property | 1,510.00 |
| 2023-06-30 | cash | 3,390.00 |
| 2023-09-30 | global-equities | 21,140.00 |
| 2023-09-30 | uk-equities | 3,610.00 |
| 2023-09-30 | bonds | 4,740.00 |
| 2023-09-30 | property | 1,610.00 |
| 2023-09-30 | cash | 3,620.00 |
| 2023-12-31 | global-equities | 23,840.00 |
| 2023-12-31 | uk-equities | 3,920.00 |
| 2023-12-31 | bonds | 5,340.00 |
| 2023-12-31 | property | 1,800.00 |
| 2023-12-31 | cash | 3,870.00 |
| 2024-03-31 | global-equities | 29,290.00 |
| 2024-03-31 | uk-equities | 4,690.00 |
| 2024-03-31 | bonds | 6,220.00 |
| 2024-03-31 | property | 2,110.00 |
| 2024-03-31 | cash | 4,520.00 |
| 2024-06-30 | global-equities | 31,590.00 |
| 2024-06-30 | uk-equities | 5,090.00 |
| 2024-06-30 | bonds | 6,630.00 |
| 2024-06-30 | property | 2,230.00 |
| 2024-06-30 | cash | 4,790.00 |
| 2024-09-30 | global-equities | 34,660.00 |
| 2024-09-30 | uk-equities | 5,410.00 |
| 2024-09-30 | bonds | 7,270.00 |
| 2024-09-30 | property | 2,430.00 |
| 2024-09-30 | cash | 5,090.00 |
| 2024-12-31 | global-equities | 37,900.00 |
| 2024-12-31 | uk-equities | 5,850.00 |
| 2024-12-31 | bonds | 7,620.00 |
| 2024-12-31 | property | 2,620.00 |
| 2024-12-31 | cash | 5,400.00 |
| 2025-03-31 | global-equities | 41,350.00 |
| 2025-03-31 | uk-equities | 6,710.00 |
| 2025-03-31 | bonds | 8,840.00 |
| 2025-03-31 | property | 3,010.00 |
| 2025-03-31 | cash | 6,180.00 |
| 2025-06-30 | global-equities | 45,330.00 |
| 2025-06-30 | uk-equities | 7,370.00 |
| 2025-06-30 | bonds | 9,370.00 |
| 2025-06-30 | property | 3,220.00 |
| 2025-06-30 | cash | 6,570.00 |
| 2025-09-30 | global-equities | 50,260.00 |
| 2025-09-30 | uk-equities | 7,890.00 |
| 2025-09-30 | bonds | 10,070.00 |
| 2025-09-30 | property | 3,470.00 |
| 2025-09-30 | cash | 6,940.00 |
| 2025-12-31 | global-equities | 54,370.00 |
| 2025-12-31 | uk-equities | 8,430.00 |
| 2025-12-31 | bonds | 10,670.00 |
| 2025-12-31 | property | 3,710.00 |
| 2025-12-31 | cash | 7,340.00 |
| 2026-03-31 | global-equities | 61,550.00 |
| 2026-03-31 | uk-equities | 9,470.00 |
| 2026-03-31 | bonds | 12,110.00 |
| 2026-03-31 | property | 4,210.00 |
| 2026-03-31 | cash | 8,310.00 |
| 2026-06-30 | global-equities | 66,750.00 |
| 2026-06-30 | uk-equities | 10,200.00 |
| 2026-06-30 | bonds | 12,950.00 |
| 2026-06-30 | property | 4,480.00 |
| 2026-06-30 | cash | 8,690.00 |
| 2026-09-30 | global-equities | 71,870.00 |
| 2026-09-30 | uk-equities | 10,860.00 |
| 2026-09-30 | bonds | 13,640.00 |
| 2026-09-30 | property | 4,750.00 |
| 2026-09-30 | cash | 9,130.00 |
`,
  },
  {
    path: 'finance/investments/target-allocation.md',
    content: `---
type: Dataset
title: Target allocation
description: The share of the portfolio you aim to hold in each asset class.
tags: [finance, investments, allocation]
dataset:
  key: [asset_class]
  columns:
    asset_class: { type: enum, values: [global-equities, uk-equities, bonds, property, cash], required: true }
    target: { type: percent, required: true }
---

# Target allocation

| asset_class | target |
| --- | --- |
| global-equities | 60 |
| uk-equities | 10 |
| bonds | 15 |
| property | 5 |
| cash | 10 |
`,
  },
  {
    path: 'finance/investments/contributions.md',
    content: `---
type: Dataset
title: Contributions
description: New money paid into the ISA and pension.
tags: [finance, investments, contributions]
dataset:
  columns:
    date: { type: date, required: true }
    account: { type: enum, values: [isa, sipp, lisa, gia], required: true }
    amount: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# Contributions

Record only new money, not transfers between accounts.

| date | account | amount | notes |
| --- | --- | --- | --- |
| 2021-10-10 | isa | 300.00 |  |
| 2021-11-10 | isa | 300.00 |  |
| 2021-12-10 | isa | 350.00 |  |
| 2022-01-10 | isa | 350.00 |  |
| 2022-02-10 | isa | 400.00 |  |
| 2022-03-10 | isa | 400.00 |  |
| 2022-03-28 | sipp | 1,900.00 | Bonus into pension |
| 2022-04-10 | isa | 400.00 |  |
| 2022-05-10 | isa | 450.00 |  |
| 2022-06-10 | isa | 450.00 |  |
| 2022-07-10 | isa | 450.00 |  |
| 2022-08-10 | isa | 500.00 |  |
| 2022-09-10 | isa | 500.00 |  |
| 2022-10-10 | isa | 500.00 |  |
| 2022-11-10 | isa | 550.00 |  |
| 2022-12-10 | isa | 550.00 |  |
| 2023-01-10 | isa | 600.00 |  |
| 2023-02-10 | isa | 600.00 |  |
| 2023-03-10 | isa | 600.00 |  |
| 2023-03-28 | sipp | 2,800.00 | Bonus into pension |
| 2023-04-10 | isa | 650.00 |  |
| 2023-05-10 | isa | 650.00 |  |
| 2023-06-10 | isa | 650.00 |  |
| 2023-07-10 | isa | 700.00 |  |
| 2023-08-10 | isa | 700.00 |  |
| 2023-09-10 | isa | 700.00 |  |
| 2023-10-10 | isa | 750.00 |  |
| 2023-11-10 | isa | 750.00 |  |
| 2023-12-10 | isa | 750.00 |  |
| 2024-01-10 | isa | 800.00 |  |
| 2024-02-10 | isa | 800.00 |  |
| 2024-03-10 | isa | 800.00 |  |
| 2024-03-28 | sipp | 3,700.00 | Bonus into pension |
| 2024-04-10 | isa | 850.00 |  |
| 2024-05-10 | isa | 850.00 |  |
| 2024-06-10 | isa | 850.00 |  |
| 2024-07-10 | isa | 900.00 |  |
| 2024-08-10 | isa | 900.00 |  |
| 2024-09-10 | isa | 900.00 |  |
| 2024-10-10 | isa | 950.00 |  |
| 2024-11-10 | isa | 950.00 |  |
| 2024-12-10 | isa | 950.00 |  |
| 2025-01-10 | isa | 1,000.00 |  |
| 2025-02-10 | isa | 1,000.00 |  |
| 2025-03-10 | isa | 1,000.00 |  |
| 2025-03-28 | sipp | 4,600.00 | Bonus into pension |
| 2025-04-10 | isa | 1,050.00 |  |
| 2025-05-10 | isa | 1,050.00 |  |
| 2025-06-10 | isa | 1,050.00 |  |
| 2025-07-10 | isa | 1,100.00 |  |
| 2025-08-10 | isa | 1,100.00 |  |
| 2025-09-10 | isa | 1,100.00 |  |
| 2025-10-10 | isa | 1,100.00 |  |
| 2025-11-10 | isa | 1,150.00 |  |
| 2025-12-10 | isa | 1,150.00 |  |
| 2026-01-10 | isa | 1,150.00 |  |
| 2026-02-10 | isa | 1,150.00 |  |
| 2026-03-10 | isa | 1,200.00 |  |
| 2026-03-28 | sipp | 5,500.00 | Bonus into pension |
| 2026-04-10 | isa | 1,200.00 |  |
| 2026-05-10 | isa | 1,200.00 |  |
| 2026-06-10 | isa | 1,200.00 |  |
| 2026-07-10 | isa | 1,250.00 |  |
| 2026-08-10 | isa | 1,250.00 |  |
| 2026-09-10 | isa | 1,250.00 |  |
`,
  },
  {
    path: 'finance/investments/dividends.md',
    content: `---
type: Dataset
title: Dividends
description: Dividends and interest received each quarter, reinvested.
tags: [finance, investments, income]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    amount: { type: currency, currency: GBP, required: true }
---

# Dividends

| date | amount |
| --- | --- |
| 2021-12-31 | 102.11 |
| 2022-03-31 | 113.48 |
| 2022-06-30 | 111.75 |
| 2022-09-30 | 117.20 |
| 2022-12-31 | 128.50 |
| 2023-03-31 | 188.39 |
| 2023-06-30 | 203.45 |
| 2023-09-30 | 216.22 |
| 2023-12-31 | 240.23 |
| 2024-03-31 | 288.00 |
| 2024-06-30 | 308.97 |
| 2024-09-30 | 335.61 |
| 2024-12-31 | 361.76 |
| 2025-03-31 | 406.14 |
| 2025-06-30 | 440.06 |
| 2025-09-30 | 478.40 |
| 2025-12-31 | 512.74 |
| 2026-03-31 | 580.04 |
| 2026-06-30 | 623.04 |
| 2026-09-30 | 664.29 |
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
| Global small cap fund | Diversify away from the largest companies | Next allocation review | |
| Short dated gilts | Lower risk home for cash | If savings rates fall below 3% | |
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
type: Reference
tags: [finance, investments, allocation]
---

# Allocation review

Compare the allocation on the [investment dashboard](dashboard.md) with your [target allocation](target-allocation.md) once a year.

## Notes

## Follow-ups
`,
  },
  {
    path: 'finance/investments/dashboard.md',
    content: `---
type: Dashboard
title: Investment dashboard
description: Portfolio growth, where the money is, how much goes in and the income it pays.
---

# Investment dashboard

Reads [Portfolio](portfolio.md), [Target allocation](target-allocation.md), [Contributions](contributions.md) and [Dividends](dividends.md).

\`\`\`caedora-dashboard
data:
  portfolio: portfolio.md
  targets: target-allocation.md
  contributions: contributions.md
  dividends: dividends.md
rows:
  - columns: 4
    items:
      - stat: { label: Portfolio value, source: portfolio, latest: date, value: sum(value), trend: true, sparkline: true }
      - stat: { label: Paid in this tax year, source: contributions, where: tax_year(date) = current_tax_year(), value: sum(amount) }
      - stat: { label: Paid in since 2021, source: contributions, value: sum(amount) }
      - stat: { label: Dividends last quarter, source: dividends, latest: date, value: sum(amount), trend: true, sparkline: true }
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
          ranges: [12m, 3y, all]
  - columns: 2
    items:
      - bar: { title: Paid in each tax year, description: Completed tax years, source: contributions, where: tax_year(date) != current_tax_year(), x: tax_year(date), y: sum(amount), series: account, stacked: true }
      - bar: { title: Dividends each quarter, source: dividends, x: date, y: sum(amount), ranges: [3y, all] }
  - columns: 2
    items:
      - pie: { title: Allocation now, source: portfolio, latest: date, label: asset_class, value: sum(value) }
      - table:
          title: Target allocation
          source: targets
          columns: [asset_class, target]
          sort: -target
\`\`\`
`,
  },
  {
    path: 'finance/investments/AGENTS.md',
    content: `# Investment tracking guidance

Help organise recorded portfolio notes, contribution history and review prompts. Do not provide regulated financial advice, price predictions, or personalised buy or sell recommendations.

- portfolio.md, target-allocation.md, contributions.md and dividends.md are Datasets. Add rows rather than editing old ones, keep ISO dates (YYYY-MM-DD) and plain numbers for money.
`,
  },
]

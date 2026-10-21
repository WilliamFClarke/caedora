/**
 * A small ISA vault for the portfolio dashboard features: monthly account
 * snapshots with a dip, holdings, and target weights to join them with.
 */

export const ACCOUNT = `---
type: Dataset
title: Account snapshots
description: Value of the ISA and money paid in, at each month end.
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    total_value: { type: currency, label: Total value }
    paid_in: { type: currency, label: Paid in }
generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }
---

# Account snapshots

| date | total_value | paid_in |
| --- | --- | --- |
| 2025-12-31 | 1000.00 | 1000.00 |
| 2026-01-31 | 1100.00 | 1000.00 |
| 2026-02-28 | 1250.00 | 1100.00 |
| 2026-03-31 | 1000.00 | 1100.00 |
| 2026-04-30 | 1300.00 | 1200.00 |
| 2026-05-31 | 1500.00 | 1300.00 |
| 2026-06-30 | 1600.00 | 1300.00 |
| 2026-07-31 | 1700.00 | 1400.00 |
| 2026-08-31 | 2000.00 | 1500.00 |
| 2026-09-30 | 1900.00 | 1500.00 |
| 2026-10-19 | 1800.00 | 1500.00 |
`

export const HOLDINGS = `---
type: Dataset
title: Holdings
description: Positions in the ISA.
dataset:
  key: [ticker]
  columns:
    ticker: { type: text, required: true }
    kind: { type: enum, values: [fund, company] }
    value: { type: currency }
    unrealised_pl: { type: currency, label: Unrealised P/L }
    weight: { type: percent }
generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }
---

# Holdings

| ticker | kind | value | unrealised_pl | weight |
| --- | --- | --- | --- | --- |
| VWRP | fund | 900.00 | 150.00 | 50.0 |
| GOOGL | company | 360.00 | 80.00 | 20.0 |
| TSM | company | 360.00 | -30.00 | 20.0 |
| AMD | company | 180.00 | 10.00 | 10.0 |
`

export const TARGETS = `---
type: Dataset
title: Targets
description: Target weights and caps.
dataset:
  key: [ticker]
  columns:
    ticker: { type: text, required: true }
    target_weight: { type: percent, label: Target weight }
    cap: { type: percent }
---

# Targets

| ticker | target_weight | cap |
| --- | --- | --- |
| VWRP | 25.0 | 60.0 |
| GOOGL | 15.0 | 15.0 |
| TSM | 15.0 | 15.0 |
`

export const PORTFOLIO_DASHBOARD = `---
type: Dashboard
title: Portfolio
description: How the ISA is doing.
---

# Portfolio

\`\`\`caedora-dashboard
data:
  account: account.md
  holdings: holdings.md
  targets: ../strategy/targets.md
  positions: { join: [holdings, targets], on: ticker }
rows:
  - columns: 4
    items:
      - stat: { label: Change this month, source: account, latest: date, value: 'change(total_value, 1m)' }
      - stat: { label: Change this year, source: account, latest: date, value: 'change_pct(total_value, ytd)' }
      - stat: { label: Drop from peak, source: account, latest: date, value: drawdown(total_value) }
      - stat: { label: Funds share, source: holdings, where: kind = fund, value: share(value) }
  - columns: 1
    items:
      - line: { title: Value against paid in, source: account, x: date, y: [{ value: sum(total_value), label: Value }, sum(paid_in)], rules: [{ y: 2000, label: Goal }] }
  - columns: 2
    items:
      - line: { title: Growth from 100, source: account, x: date, y: sum(total_value), rebase: true }
      - area: { title: Drawdown, source: account, x: date, y: drawdown(total_value) }
  - columns: 2
    items:
      - bar: { title: Profit or loss by holding, source: holdings, x: ticker, y: sum(unrealised_pl), highlight: "weight > 40", rules: [{ from: -20, to: 20, label: Noise }] }
      - treemap: { title: Holdings map, source: holdings, label: ticker, value: sum(value), group: kind }
  - columns: 2
    items:
      - waterfall: { title: Where the profit came from, source: holdings, x: ticker, y: sum(unrealised_pl), sort: -unrealised_pl }
      - progress: { label: Paid in this year, source: account, latest: date, value: sum(paid_in), max: 20000, target: 15000 }
  - columns: 1
    items:
      - table: { title: Against target, source: positions, columns: [ticker, value, unrealised_pl, weight, target_weight], sort: -value, highlight: weight > (cap) }
\`\`\`
`

export const PORTFOLIO_FILES: Record<string, string> = {
  'isa/account.md': ACCOUNT,
  'isa/holdings.md': HOLDINGS,
  'strategy/targets.md': TARGETS,
  'isa/portfolio.md': PORTFOLIO_DASHBOARD,
}

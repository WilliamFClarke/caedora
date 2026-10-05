import type { TemplateFile } from '../vault-templates'

/**
 * UK personal finance template. Every table is a Dataset and dashboard.md
 * reads them. The rows are illustrative examples for the user to replace.
 */

const ACCOUNT_KINDS = [
  'current',
  'savings',
  'fixed-term',
  'cash-isa',
  'stocks-shares-isa',
  'lifetime-isa',
  'junior-isa',
  'premium-bonds',
  'workplace-pension',
  'sipp',
  'property',
  'mortgage',
  'credit-card',
  'loan',
  'student-loan',
]

export const UK_PERSONAL_FINANCE_FILES: TemplateFile[] = [
  {
    path: 'finance/README.md',
    content: `---
type: Overview
title: UK personal finance
description: Where your accounts, balances, ISAs, mortgage and pensions are tracked, and how the finance dashboard reads them.
---

# UK personal finance

Open the [finance dashboard](dashboard.md) for your net worth, ISA allowance and mortgage position.

Each file below is a Dataset: a Markdown table Caedora can read as data. The rows that ship with this template are examples, so replace them with your own.

1. List every account once in [Accounts](accounts.md), including your home and any debts.
2. Add a row per account to [Balances](balances.md) whenever you check them, for example at the end of each month. Write debts as negative numbers.
3. Record each payment into an ISA in [ISA contributions](isa-contributions.md).
4. Keep your mortgage deal in [Mortgages](mortgages.md).
5. Check [Allowances](allowances.md) against GOV.UK each April.

Nothing here leaves your vault.
`,
  },
  {
    path: 'finance/accounts.md',
    content: `---
type: Dataset
title: Accounts
description: Every account, property and debt tracked in the finance dashboard.
dataset:
  key: [id]
  columns:
    id: { type: text, required: true }
    name: { type: text }
    provider: { type: text }
    kind: { type: enum, values: [${ACCOUNT_KINDS.join(', ')}] }
    category: { type: enum, values: [cash, investments, pensions, property, debt] }
    opened: { type: date }
    rate: { type: percent }
    notes: { type: text }
---

# Accounts

| id | name | provider | kind | category | opened | rate | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| monzo-current | Current account | Monzo | current | cash | 2019-03-01 | 0 | Salary paid in |
| marcus-savings | Easy access saver | Marcus | savings | cash | 2021-06-14 | 4.1 | Emergency fund |
| t212-cash-isa | Cash ISA | Trading 212 | cash-isa | cash | 2024-04-06 | 4.4 | |
| vanguard-ss-isa | Stocks and shares ISA | Vanguard | stocks-shares-isa | investments | 2020-04-10 | | Global index fund |
| moneybox-lisa | Lifetime ISA | Moneybox | lifetime-isa | investments | 2022-01-05 | | Retirement |
| nest-pension | Workplace pension | Nest | workplace-pension | pensions | 2018-09-01 | | |
| home | Home | | property | property | 2023-07-21 | | Estimated value |
| nationwide-mortgage | Mortgage | Nationwide | mortgage | debt | 2023-07-21 | 4.39 | |
| amex-credit | Credit card | American Express | credit-card | debt | 2022-02-01 | | Cleared monthly |
`,
  },
  {
    path: 'finance/balances.md',
    content: `---
type: Dataset
title: Balances
description: Dated balance snapshots for each account. Debts are negative so net worth is a simple sum.
dataset:
  key: [date, account]
  columns:
    date: { type: date, required: true }
    account: { type: ref, to: accounts.md, required: true }
    balance: { type: currency, currency: GBP, required: true }
---

# Balances

| date | account | balance |
| --- | --- | --- |
| 2026-04-30 | monzo-current | 1,850.00 |
| 2026-04-30 | marcus-savings | 6,200.00 |
| 2026-04-30 | t212-cash-isa | 4,000.00 |
| 2026-04-30 | vanguard-ss-isa | 17,250.00 |
| 2026-04-30 | moneybox-lisa | 9,100.00 |
| 2026-04-30 | nest-pension | 24,600.00 |
| 2026-04-30 | home | 325,000.00 |
| 2026-04-30 | nationwide-mortgage | -214,900.00 |
| 2026-04-30 | amex-credit | -640.00 |
| 2026-05-31 | monzo-current | 1,540.00 |
| 2026-05-31 | marcus-savings | 6,350.00 |
| 2026-05-31 | t212-cash-isa | 4,515.00 |
| 2026-05-31 | vanguard-ss-isa | 17,890.00 |
| 2026-05-31 | moneybox-lisa | 9,445.00 |
| 2026-05-31 | nest-pension | 25,120.00 |
| 2026-05-31 | home | 325,000.00 |
| 2026-05-31 | nationwide-mortgage | -214,380.00 |
| 2026-05-31 | amex-credit | -760.00 |
| 2026-06-30 | monzo-current | 1,960.00 |
| 2026-06-30 | marcus-savings | 6,500.00 |
| 2026-06-30 | t212-cash-isa | 5,030.00 |
| 2026-06-30 | vanguard-ss-isa | 17,680.00 |
| 2026-06-30 | moneybox-lisa | 9,790.00 |
| 2026-06-30 | nest-pension | 25,500.00 |
| 2026-06-30 | home | 325,000.00 |
| 2026-06-30 | nationwide-mortgage | -213,858.00 |
| 2026-06-30 | amex-credit | -450.00 |
| 2026-07-31 | monzo-current | 1,780.00 |
| 2026-07-31 | marcus-savings | 6,650.00 |
| 2026-07-31 | t212-cash-isa | 5,545.00 |
| 2026-07-31 | vanguard-ss-isa | 18,560.00 |
| 2026-07-31 | moneybox-lisa | 10,135.00 |
| 2026-07-31 | nest-pension | 26,110.00 |
| 2026-07-31 | home | 326,500.00 |
| 2026-07-31 | nationwide-mortgage | -213,334.00 |
| 2026-07-31 | amex-credit | -710.00 |
| 2026-08-31 | monzo-current | 2,040.00 |
| 2026-08-31 | marcus-savings | 6,800.00 |
| 2026-08-31 | t212-cash-isa | 6,060.00 |
| 2026-08-31 | vanguard-ss-isa | 18,970.00 |
| 2026-08-31 | moneybox-lisa | 10,480.00 |
| 2026-08-31 | nest-pension | 26,565.00 |
| 2026-08-31 | home | 326,500.00 |
| 2026-08-31 | nationwide-mortgage | -212,808.00 |
| 2026-08-31 | amex-credit | -570.00 |
| 2026-09-30 | monzo-current | 1,945.00 |
| 2026-09-30 | marcus-savings | 6,950.00 |
| 2026-09-30 | t212-cash-isa | 6,575.00 |
| 2026-09-30 | vanguard-ss-isa | 19,695.00 |
| 2026-09-30 | moneybox-lisa | 10,825.00 |
| 2026-09-30 | nest-pension | 27,155.00 |
| 2026-09-30 | home | 326,500.00 |
| 2026-09-30 | nationwide-mortgage | -212,280.00 |
| 2026-09-30 | amex-credit | -660.00 |
`,
  },
  {
    path: 'finance/isa-contributions.md',
    content: `---
type: Dataset
title: ISA contributions
description: Money paid into each ISA, used to track the allowance for the current tax year.
dataset:
  columns:
    date: { type: date, required: true }
    account: { type: ref, to: accounts.md, required: true }
    amount: { type: currency, currency: GBP, required: true }
    notes: { type: text }
---

# ISA contributions

Tax years run from 6 April to 5 April. Record only new money paid in, not transfers between ISAs.

| date | account | amount | notes |
| --- | --- | --- | --- |
| 2026-04-08 | t212-cash-isa | 1,000.00 |
| 2026-04-08 | moneybox-lisa | 1,000.00 |
| 2026-05-01 | t212-cash-isa | 500.00 |
| 2026-05-01 | vanguard-ss-isa | 400.00 |
| 2026-05-01 | moneybox-lisa | 333.00 |
| 2026-06-01 | t212-cash-isa | 500.00 |
| 2026-06-01 | vanguard-ss-isa | 400.00 |
| 2026-06-01 | moneybox-lisa | 333.00 |
| 2026-07-01 | t212-cash-isa | 500.00 |
| 2026-07-01 | vanguard-ss-isa | 400.00 |
| 2026-07-01 | moneybox-lisa | 333.00 |
| 2026-08-01 | t212-cash-isa | 500.00 |
| 2026-08-01 | vanguard-ss-isa | 400.00 |
| 2026-08-01 | moneybox-lisa | 333.00 |
| 2026-09-01 | t212-cash-isa | 500.00 |
| 2026-09-01 | vanguard-ss-isa | 400.00 |
| 2026-09-01 | moneybox-lisa | 333.00 |
`,
  },
  {
    path: 'finance/mortgages.md',
    content: `---
type: Dataset
title: Mortgages
description: Mortgage deals with property value, outstanding balance, rate and when the fixed rate ends.
dataset:
  key: [date, account]
  columns:
    date: { type: date, required: true }
    account: { type: ref, to: accounts.md, required: true }
    property_value: { type: currency, currency: GBP }
    outstanding: { type: currency, currency: GBP }
    rate: { type: percent }
    fixed_until: { type: date }
    term_end: { type: date }
    monthly_payment: { type: currency, currency: GBP }
---

# Mortgages

Add a new row when you remortgage or revalue the property.

| date | account | property_value | outstanding | rate | fixed_until | term_end | monthly_payment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2023-07-21 | nationwide-mortgage | 315,000.00 | 220,000.00 | 5.29 | 2025-07-31 | 2053-07-31 | 1,318.00 |
| 2025-08-01 | nationwide-mortgage | 325,000.00 | 214,900.00 | 4.39 | 2028-07-31 | 2053-07-31 | 1,179.00 |
`,
  },
  {
    path: 'finance/allowances.md',
    content: `---
type: Dataset
title: Allowances
description: Yearly tax free limits used by the finance dashboard, each with where it was checked.
dataset:
  key: [tax_year, allowance]
  columns:
    tax_year: { type: text, required: true }
    allowance: { type: enum, values: [isa, lifetime-isa, junior-isa, pension-annual] }
    limit: { type: currency, currency: GBP }
    source: { type: text }
    checked: { type: date }
---

# Allowances

Limits change, so check each one on GOV.UK at the start of every tax year and add a new row.

| tax_year | allowance | limit | source | checked |
| --- | --- | --- | --- | --- |
| 2026-27 | isa | 20,000.00 | https://www.gov.uk/individual-savings-accounts | 2026-10-05 |
| 2026-27 | lifetime-isa | 4,000.00 | https://www.gov.uk/lifetime-isa | 2026-10-05 |
| 2026-27 | junior-isa | 9,000.00 | https://www.gov.uk/junior-individual-savings-accounts | 2026-10-05 |
| 2026-27 | pension-annual | 60,000.00 | https://www.gov.uk/tax-on-your-private-pension/annual-allowance | 2026-10-05 |
`,
  },
  {
    path: 'finance/dashboard.md',
    content: `---
type: Dashboard
title: Finance dashboard
description: Net worth, cash, investments, ISA allowance and mortgage position from the finance Datasets.
---

# Finance dashboard

Reads [Accounts](accounts.md), [Balances](balances.md), [ISA contributions](isa-contributions.md), [Mortgages](mortgages.md) and [Allowances](allowances.md).

\`\`\`caedora-dashboard
data:
  accounts: accounts.md
  balances: balances.md
  isa: isa-contributions.md
  mortgages: mortgages.md
  allowances: allowances.md
rows:
  - columns: 4
    items:
      - stat: { label: Net worth, source: balances, latest: date, value: sum(balance), trend: true }
      - stat: { label: Cash, source: balances, latest: date, where: account.category = cash, value: sum(balance), trend: true }
      - stat: { label: Investments and pensions, source: balances, latest: date, where: "account.category in [investments, pensions]", value: sum(balance), trend: true }
      - stat: { label: Debt, source: balances, latest: date, where: account.category = debt, value: sum(balance), trend: true }
  - columns: 1
    items:
      - area:
          title: Net worth over time
          description: Total of every account at each snapshot
          source: balances
          x: date
          y: sum(balance)
          snapshots: true
          ranges: [3m, 6m, 12m, all]
  - columns: 1
    items:
      - area:
          title: Assets by category
          source: balances
          where: account.category != debt
          x: date
          y: sum(balance)
          series: account.category
          stacked: true
          snapshots: true
          ranges: [3m, 6m, 12m, all]
  - columns: 4
    items:
      - progress:
          label: ISA allowance used
          description: All ISAs this tax year
          source: isa
          where: tax_year(date) = current_tax_year()
          value: sum(amount)
          max: { source: allowances, where: "allowance = isa and tax_year = current_tax_year()", value: sum(limit) }
      - progress:
          label: Lifetime ISA allowance used
          description: Also counts towards the ISA allowance
          source: isa
          where: tax_year(date) = current_tax_year() and account.kind = lifetime-isa
          value: sum(amount)
          max: { source: allowances, where: "allowance = lifetime-isa and tax_year = current_tax_year()", value: sum(limit) }
      - stat: { label: Mortgage loan to value, source: mortgages, latest: date, value: sum(outstanding) / sum(property_value), format: percent }
      - stat: { label: Fixed rate ends, source: mortgages, latest: date, value: min(fixed_until), format: date }
  - columns: 1
    items:
      - table:
          title: Latest balances
          source: balances
          latest: date
          columns: [account.name, account.provider, account.category, balance, date]
          sort: -balance
\`\`\`
`,
  },
  {
    path: 'finance/AGENTS.md',
    content: `---
type: Agent Instructions
title: UK personal finance guidance
description: How assistants should read and update the finance Datasets without giving regulated advice.
---

# UK personal finance guidance

- Treat accounts.md, balances.md, isa-contributions.md, mortgages.md and allowances.md as Datasets. Add rows to the table and keep the column order and formats: ISO dates (YYYY-MM-DD), plain numbers for money and negative numbers for debts.
- When asked to record balances, add one row per account for the same date rather than editing old rows, so the history stays intact.
- Use account ids from accounts.md. Ask before inventing a new account.
- Tax years run from 6 April to 5 April. Never assume allowance limits; use allowances.md and ask the user to confirm them against GOV.UK.
- Do not give regulated financial advice or personalised product recommendations.
`,
  },
]

import type { TemplateFile } from '../vault-templates'

/**
 * UK student loan tracker template. Five years of example Plan 1 balances,
 * statements and repayments, read by dashboard.md. Replace the rows with your own.
 */

export const UK_STUDENT_LOAN_FILES: TemplateFile[] = [
  {
    path: 'finance/uk-student-loan/README.md',
    content: `# UK student loan tracker

Open the [student loan dashboard](dashboard.md) to watch the balance come down and see what you have repaid.

Track plan details, statements, repayments and annual reviews here. Note the balance in [Balance](balance.md) each month, copy each yearly statement into [Statements](statements.md) and each payslip deduction or overpayment into [Repayments](repayments.md). The rows that ship with this template are five years of example data for a Plan 1 loan, so replace them with your own. Verify current rules with official Student Loans Company or GOV.UK sources before acting.
`,
  },
  {
    path: 'finance/uk-student-loan/plan-details.md',
    content: `---
tags: [finance, student-loan, uk]
---

# Plan details

| Field | Value | Source/date checked |
| --- | --- | --- |
| Plan type | Plan 1 (example) |  |
| Repayment status | Repaying through PAYE |  |
| Original balance | 24,800 (October 2021) |  |
| Interest rate | Check GOV.UK |  |
| Repayment threshold | Check GOV.UK |  |
| Write-off date estimate |  |  |
`,
  },
  {
    path: 'finance/uk-student-loan/balance.md',
    content: `---
type: Dataset
title: Balance
description: The loan balance at the end of each month, from the online account.
tags: [finance, student-loan, balance]
dataset:
  key: [date]
  columns:
    date: { type: date, required: true }
    balance: { type: currency, currency: GBP, required: true }
---

# Balance

| date | balance |
| --- | --- |
| 2021-10-31 | 24,667.00 |
| 2021-11-30 | 24,533.83 |
| 2021-12-31 | 24,400.50 |
| 2022-01-31 | 24,267.00 |
| 2022-02-28 | 24,133.34 |
| 2022-03-31 | 23,999.50 |
| 2022-04-30 | 23,854.50 |
| 2022-05-31 | 23,709.32 |
| 2022-06-30 | 23,563.96 |
| 2022-07-31 | 23,354.41 |
| 2022-08-31 | 23,144.60 |
| 2022-09-30 | 22,934.53 |
| 2022-10-31 | 22,724.20 |
| 2022-11-30 | 22,513.61 |
| 2022-12-31 | 22,302.75 |
| 2023-01-31 | 22,091.63 |
| 2023-02-28 | 21,880.24 |
| 2023-03-31 | 21,668.59 |
| 2023-04-30 | 21,534.45 |
| 2023-05-31 | 21,399.61 |
| 2023-06-30 | 21,264.07 |
| 2023-07-31 | 21,127.82 |
| 2023-08-31 | 20,990.86 |
| 2023-09-30 | 20,853.18 |
| 2023-10-31 | 20,714.79 |
| 2023-11-30 | 20,575.68 |
| 2023-12-31 | 20,435.85 |
| 2024-01-31 | 20,295.29 |
| 2024-02-29 | 20,153.99 |
| 2024-03-31 | 20,011.96 |
| 2024-04-30 | 19,798.67 |
| 2024-05-31 | 19,584.61 |
| 2024-06-30 | 19,369.79 |
| 2024-07-31 | 19,154.20 |
| 2024-08-31 | 18,937.84 |
| 2024-09-30 | 18,720.70 |
| 2024-10-31 | 18,502.78 |
| 2024-11-30 | 18,284.08 |
| 2024-12-31 | 17,064.60 |
| 2025-01-31 | 16,840.75 |
| 2025-02-28 | 16,616.09 |
| 2025-03-31 | 16,277.63 |
| 2025-04-30 | 15,931.72 |
| 2025-05-31 | 15,584.87 |
| 2025-06-30 | 13,737.08 |
| 2025-07-31 | 13,384.28 |
| 2025-08-31 | 13,030.53 |
| 2025-09-30 | 12,675.82 |
| 2025-10-31 | 12,320.15 |
| 2025-11-30 | 11,963.52 |
| 2025-12-31 | 11,605.92 |
| 2026-01-31 | 9,247.35 |
| 2026-02-28 | 8,882.40 |
| 2026-03-31 | 8,516.45 |
| 2026-04-30 | 8,111.16 |
| 2026-05-31 | 7,704.79 |
| 2026-06-30 | 7,297.34 |
| 2026-07-31 | 5,388.80 |
| 2026-08-31 | 4,975.17 |
| 2026-09-30 | 4,560.44 |
`,
  },
  {
    path: 'finance/uk-student-loan/statements.md',
    content: `---
type: Dataset
title: Statements
description: Yearly statement figures from the Student Loans Company.
tags: [finance, student-loan, statements]
dataset:
  key: [statement_date]
  columns:
    statement_date: { type: date, required: true }
    opening_balance: { type: currency, currency: GBP }
    repayments: { type: currency, currency: GBP }
    interest: { type: currency, currency: GBP }
    closing_balance: { type: currency, currency: GBP, required: true }
---

# Statements

One row per yearly statement, each to 5 April.

| statement_date | opening_balance | repayments | interest | closing_balance |
| --- | --- | --- | --- | --- |
| 2022-04-05 | 24,800.00 | 984.00 | 183.50 | 23,999.50 |
| 2023-04-05 | 23,999.50 | 2,676.00 | 345.09 | 21,668.59 |
| 2024-04-05 | 21,668.59 | 2,964.00 | 1,307.37 | 20,011.96 |
| 2025-04-05 | 20,011.96 | 4,533.00 | 798.68 | 16,277.63 |
| 2026-04-05 | 16,277.63 | 8,180.00 | 418.82 | 8,516.45 |
`,
  },
  {
    path: 'finance/uk-student-loan/repayments.md',
    content: `---
type: Dataset
title: Repayments
description: Each repayment from payroll or a voluntary overpayment.
tags: [finance, student-loan, repayments]
dataset:
  columns:
    date: { type: date, required: true }
    source: { type: enum, values: [payroll, self-assessment, voluntary], required: true }
    amount: { type: currency, currency: GBP, required: true }
    tax_year: { type: text }
    notes: { type: text }
---

# Repayments

Payroll repayments come from your payslips. Voluntary overpayments are made through the Student Loans Company website.

| date | source | amount | tax_year | notes |
| --- | --- | --- | --- | --- |
| 2021-10-31 | payroll | 164.00 | 2021-22 |  |
| 2021-11-30 | payroll | 164.00 | 2021-22 |  |
| 2021-12-31 | payroll | 164.00 | 2021-22 |  |
| 2022-01-31 | payroll | 164.00 | 2021-22 |  |
| 2022-02-28 | payroll | 164.00 | 2021-22 |  |
| 2022-03-31 | payroll | 164.00 | 2021-22 |  |
| 2022-04-30 | payroll | 175.00 | 2022-23 |  |
| 2022-05-31 | payroll | 175.00 | 2022-23 |  |
| 2022-06-30 | payroll | 175.00 | 2022-23 |  |
| 2022-07-31 | payroll | 239.00 | 2022-23 |  |
| 2022-08-31 | payroll | 239.00 | 2022-23 |  |
| 2022-09-30 | payroll | 239.00 | 2022-23 |  |
| 2022-10-31 | payroll | 239.00 | 2022-23 |  |
| 2022-11-30 | payroll | 239.00 | 2022-23 |  |
| 2022-12-31 | payroll | 239.00 | 2022-23 |  |
| 2023-01-31 | payroll | 239.00 | 2022-23 |  |
| 2023-02-28 | payroll | 239.00 | 2022-23 |  |
| 2023-03-31 | payroll | 239.00 | 2022-23 |  |
| 2023-04-30 | payroll | 247.00 | 2023-24 |  |
| 2023-05-31 | payroll | 247.00 | 2023-24 |  |
| 2023-06-30 | payroll | 247.00 | 2023-24 |  |
| 2023-07-31 | payroll | 247.00 | 2023-24 |  |
| 2023-08-31 | payroll | 247.00 | 2023-24 |  |
| 2023-09-30 | payroll | 247.00 | 2023-24 |  |
| 2023-10-31 | payroll | 247.00 | 2023-24 |  |
| 2023-11-30 | payroll | 247.00 | 2023-24 |  |
| 2023-12-31 | payroll | 247.00 | 2023-24 |  |
| 2024-01-31 | payroll | 247.00 | 2023-24 |  |
| 2024-02-29 | payroll | 247.00 | 2023-24 |  |
| 2024-03-31 | payroll | 247.00 | 2023-24 |  |
| 2024-04-30 | payroll | 285.00 | 2024-25 |  |
| 2024-05-31 | payroll | 285.00 | 2024-25 |  |
| 2024-06-30 | payroll | 285.00 | 2024-25 |  |
| 2024-07-31 | payroll | 285.00 | 2024-25 |  |
| 2024-08-31 | payroll | 285.00 | 2024-25 |  |
| 2024-09-30 | payroll | 285.00 | 2024-25 |  |
| 2024-10-31 | payroll | 285.00 | 2024-25 |  |
| 2024-11-30 | payroll | 285.00 | 2024-25 |  |
| 2024-12-31 | payroll | 285.00 | 2024-25 |  |
| 2024-12-31 | voluntary | 1,000.00 | 2024-25 | Overpayment from savings |
| 2025-01-31 | payroll | 285.00 | 2024-25 |  |
| 2025-02-28 | payroll | 285.00 | 2024-25 |  |
| 2025-03-31 | payroll | 398.00 | 2024-25 |  |
| 2025-04-30 | payroll | 390.00 | 2025-26 |  |
| 2025-05-31 | payroll | 390.00 | 2025-26 |  |
| 2025-06-30 | payroll | 390.00 | 2025-26 |  |
| 2025-06-30 | voluntary | 1,500.00 | 2025-26 | Overpayment from savings |
| 2025-07-31 | payroll | 390.00 | 2025-26 |  |
| 2025-08-31 | payroll | 390.00 | 2025-26 |  |
| 2025-09-30 | payroll | 390.00 | 2025-26 |  |
| 2025-10-31 | payroll | 390.00 | 2025-26 |  |
| 2025-11-30 | payroll | 390.00 | 2025-26 |  |
| 2025-12-31 | payroll | 390.00 | 2025-26 |  |
| 2026-01-31 | payroll | 390.00 | 2025-26 |  |
| 2026-01-31 | voluntary | 2,000.00 | 2025-26 | Overpayment from savings |
| 2026-02-28 | payroll | 390.00 | 2025-26 |  |
| 2026-03-31 | payroll | 390.00 | 2025-26 |  |
| 2026-04-30 | payroll | 428.00 | 2026-27 |  |
| 2026-05-31 | payroll | 428.00 | 2026-27 |  |
| 2026-06-30 | payroll | 428.00 | 2026-27 |  |
| 2026-07-31 | payroll | 428.00 | 2026-27 |  |
| 2026-07-31 | voluntary | 1,500.00 | 2026-27 | Overpayment from savings |
| 2026-08-31 | payroll | 428.00 | 2026-27 |  |
| 2026-09-30 | payroll | 428.00 | 2026-27 |  |
`,
  },
  {
    path: 'finance/uk-student-loan/annual-review.md',
    content: `---
tags: [finance, student-loan, review]
---

# Annual student loan review

## Balance movement

## Repayments checked

## Interest or threshold changes

## Questions to verify

## Follow-ups
`,
  },
  {
    path: 'finance/uk-student-loan/dashboard.md',
    content: `---
type: Dashboard
title: Student loan dashboard
description: The balance coming down, what has been repaid and how much interest is being added.
---

# Student loan dashboard

Reads [Balance](balance.md), [Statements](statements.md) and [Repayments](repayments.md). Figures come from what you record, so check them against your Student Loans Company account.

\`\`\`caedora-dashboard
data:
  balance: balance.md
  statements: statements.md
  repayments: repayments.md
rows:
  - columns: 4
    items:
      - stat: { label: Balance, source: balance, latest: date, value: sum(balance), trend: true, sparkline: true }
      - stat: { label: Repaid this tax year, source: repayments, where: tax_year(date) = current_tax_year(), value: sum(amount) }
      - stat: { label: Repaid since 2021, source: repayments, value: sum(amount) }
      - stat: { label: Overpayments, source: repayments, where: source = voluntary, value: sum(amount) }
  - columns: 2
    items:
      - progress:
          label: Loan paid off
          description: Balance cleared since tracking began
          source: balance
          value: max(balance) - min(balance)
          max: max(balance)
          gauge: true
      - line: { title: Balance, source: balance, x: month(date), y: sum(balance), ranges: [12m, 3y, all] }
  - columns: 2
    items:
      - bar: { title: Repaid each tax year, description: Completed tax years, source: repayments, where: tax_year(date) != current_tax_year(), x: tax_year(date), y: sum(amount), series: source, stacked: true }
      - bar: { title: Interest added each year, source: statements, x: tax_year(statement_date), y: sum(interest) }
  - columns: 1
    items:
      - table:
          title: Statements
          source: statements
          columns: [statement_date, opening_balance, repayments, interest, closing_balance]
          sort: -statement_date
\`\`\`
`,
  },
  {
    path: 'finance/uk-student-loan/AGENTS.md',
    content: `# UK student loan tracking guidance

Use only recorded statements, plan notes and user-provided official sources. Do not assume current UK thresholds, rates or write-off rules; ask the user to verify against official sources before acting.

- balance.md, statements.md and repayments.md are Datasets. Add a row per month, statement or repayment, keep ISO dates (YYYY-MM-DD) and plain numbers for money.
- Do not recommend overpaying. Whether it makes sense depends on the plan and personal circumstances.
`,
  },
]

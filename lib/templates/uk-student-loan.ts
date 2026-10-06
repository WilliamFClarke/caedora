import type { TemplateFile } from '../vault-templates'

/**
 * UK student loan tracker template. Statements and repayments are Datasets
 * that dashboard.md reads. The rows are illustrative examples to replace.
 */

export const UK_STUDENT_LOAN_FILES: TemplateFile[] = [
  {
    path: 'finance/uk-student-loan/README.md',
    content: `# UK student loan tracker

Open the [student loan dashboard](dashboard.md) for your balance, interest and repayments over time.

Track plan details, statements, repayments, interest changes and annual reviews here. Copy each yearly statement into [Statements](statements.md) and each payslip deduction or voluntary payment into [Repayments](repayments.md). The rows that ship with this template are examples, so replace them with your own. Verify current rules with official Student Loans Company or GOV.UK sources before acting.
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
| Plan type |  |  |
| Repayment status |  |  |
| Current balance |  |  |
| Interest rate |  |  |
| Repayment threshold |  |  |
| Write-off date estimate |  |  |
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
    notes: { type: text }
---

# Statements

| statement_date | opening_balance | repayments | interest | closing_balance | notes |
| --- | --- | --- | --- | --- | --- |
| 2023-04-05 | 46,200.00 | 1,050.00 | 2,480.00 | 47,630.00 | |
| 2024-04-05 | 47,630.00 | 1,420.00 | 3,370.00 | 49,580.00 | |
| 2025-04-05 | 49,580.00 | 1,760.00 | 2,960.00 | 50,780.00 | |
| 2026-04-05 | 50,780.00 | 2,040.00 | 2,610.00 | 51,350.00 | |
`,
  },
  {
    path: 'finance/uk-student-loan/repayments.md',
    content: `---
type: Dataset
title: Repayments
description: Each repayment from payroll, self assessment or a voluntary payment.
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

| date | source | amount | tax_year | notes |
| --- | --- | --- | --- | --- |
| 2026-04-30 | payroll | 172.00 | 2026-27 | |
| 2026-05-31 | payroll | 172.00 | 2026-27 | |
| 2026-06-30 | payroll | 172.00 | 2026-27 | |
| 2026-07-31 | payroll | 181.00 | 2026-27 | Pay rise |
| 2026-08-31 | payroll | 181.00 | 2026-27 | |
| 2026-08-31 | voluntary | 250.00 | 2026-27 | |
| 2026-09-30 | payroll | 181.00 | 2026-27 | |
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
description: Balance, interest and repayments from the student loan Datasets.
---

# Student loan dashboard

Reads [Statements](statements.md) and [Repayments](repayments.md). Figures come from what you record, so check them against your Student Loans Company account.

\`\`\`caedora-dashboard
data:
  statements: statements.md
  repayments: repayments.md
rows:
  - columns: 4
    items:
      - stat: { label: Balance at last statement, source: statements, latest: statement_date, value: sum(closing_balance), trend: true }
      - stat: { label: Interest last year, source: statements, latest: statement_date, value: sum(interest), trend: true }
      - stat: { label: Repaid this tax year, source: repayments, where: tax_year(date) = current_tax_year(), value: sum(amount) }
      - stat: { label: Repaid on statements, source: statements, value: sum(repayments) }
  - columns: 2
    items:
      - line: { title: Balance by statement, source: statements, x: statement_date, y: sum(closing_balance), curve: linear }
      - bar: { title: Interest added each year, source: statements, x: statement_date, y: sum(interest) }
  - columns: 2
    items:
      - bar: { title: Repayments this tax year, source: repayments, where: tax_year(date) = current_tax_year(), x: date, y: sum(amount), series: source, stacked: true }
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

- statements.md and repayments.md are Datasets. Add a row per statement or repayment, keep ISO dates (YYYY-MM-DD) and plain numbers for money.
`,
  },
]

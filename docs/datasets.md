# Datasets

A Dataset is an OKF concept that holds structured records, such as account
balances or workout measurements. Dashboards read from Datasets.

## Format

- Frontmatter sets `type: Dataset` plus the usual OKF fields.
- The records are the first Markdown table in the body. Each row is a record.
- An optional `dataset` frontmatter block describes the columns. OKF keeps
  producer defined fields, so the file stays conformant.

```markdown
---
type: Dataset
title: Balances
description: Monthly balance snapshots for every account.
tags: [finance, balances]
dataset:
  key: [date, account]
  columns:
    date: { type: date, required: true }
    account: { type: ref, to: accounts.md }
    balance: { type: currency, currency: GBP }
---

# Balances

| Date | Account | Balance |
| --- | --- | --- |
| 2026-09-30 | monzo-current | £1,240.55 |
| 2026-09-30 | nationwide-mortgage | -212,300.00 |
```

## Columns

Table headers are matched to schema columns by name, ignoring case, spaces and
punctuation, so `Tax year` matches `tax_year`. A column can also set `label`.

| Type | Accepts |
| --- | --- |
| `text` | Anything |
| `number` | `1240.5`, `1,240.50`, `-20`, `(20)` |
| `currency` | As `number`, with `£`, `$`, `€` or a currency code. `currency` defaults to `GBP` |
| `percent` | `4.5` or `4.5%`, both read as 4.5 percent |
| `date` | ISO `YYYY-MM-DD` only |
| `boolean` | `yes`, `no`, `true`, `false`, `y`, `n` |
| `enum` | One of `values`, ignoring case |
| `ref` | An identifier from the Dataset named in `to` |

Other column options are `required: true` and, at dataset level, `key`, which
lists the columns that must be unique together.

Without a `dataset` block Caedora infers column types from the table, so any
existing table works once its concept has `type: Dataset`.

## Validation

Problems such as a date in the wrong format or a missing column appear as
warnings in the OKF indicator. They never block saving.

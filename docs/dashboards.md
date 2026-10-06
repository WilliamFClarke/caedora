# Dashboards

A Dashboard is an OKF concept with `type: Dashboard`. Caedora shows it as a
grid of cards and charts, built from shadcn blocks and shadcn area charts, that
read from [Datasets](datasets.md). Use the Dashboard / Source toggle in the top
corner to edit the Markdown, or Edit layout to drag cards into a new order,
move rows and change how many columns a row has. Layout changes are written
straight back to the YAML block, keeping each card's settings as they were.

In the sidebar, dashboards and Dataset files have their own icons.

## Building a dashboard without writing YAML

Create a concept with the type `Dashboard` (or open an existing one) and click
Add element. Pick an element and its style, choose the Dataset it reads and
which columns to use, and a live preview shows it drawn from your data. Add
writes the element into the `caedora-dashboard` block, adding the Dataset under
`data` if it is not there yet, and creates the block if the note has none. In
Edit layout each card also has a remove button.

## Format

List the Datasets as normal Markdown links so the OKF link graph sees them,
then describe the layout in a fenced `caedora-dashboard` YAML block. Other
Markdown and OKF tools show the block as code, so the file stays portable.

````markdown
---
type: Dashboard
title: Finances
description: Net worth and ISA allowance.
---

# Finances

Reads [Balances](balances.md) and [ISA contributions](isa-contributions.md).

```caedora-dashboard
data:
  balances: balances.md
  isa: isa-contributions.md
rows:
  - columns: 2
    items:
      - stat: { label: Net worth, source: balances, latest: date, value: sum(balance), trend: true }
      - progress: { label: ISA allowance, source: isa, where: tax_year(date) = current_tax_year(), value: sum(amount), max: 20000 }
  - columns: 1
    items:
      - area: { title: Net worth, source: balances, x: date, y: sum(balance), snapshots: true, ranges: [3m, 12m, all] }
```
````

`data` maps short names to Dataset paths, relative to the dashboard. `rows`
is a list of rows, each with 1 to 4 `columns` and a list of `items`. Rows
collapse to a single column on narrow screens.

## Components

Every component except `text` takes `source`, and optionally `title`,
`description`, `where` (a filter) and `latest` (see below).

| Component | Settings | Shows |
| --- | --- | --- |
| `stat` | `label`, `value`, `format`, `trend`, `sparkline` | A summary card. `trend: true` compares with the previous snapshot of the `latest` date, `sparkline: true` draws the value at every snapshot |
| `area` | `x`, `y`, `series`, `stacked`, `snapshots`, `ranges` | An area chart. `series` splits it into one area per value, `ranges` adds a time range picker (`3m`, `12m`, `ytd`, `all`) |
| `line` | as `area` | A line chart |
| `bar` | as `area`, plus `horizontal` | A bar chart. `horizontal: true` runs the bars sideways, `stacked: true` stacks the series |
| `pie` | `label`, `value`, `donut` | A donut chart with one slice per value of `label`, sized by `value`. `donut: false` draws a full pie |
| `table` | `columns`, `sort`, `limit` | A table of rows. `sort: -balance` sorts descending |
| `progress` | `label`, `value`, `max`, `gauge` | A progress bar, or a radial gauge with `gauge: true`. `max` can be a number, an expression or `{ source, where, value }` to read it from another Dataset |
| `list` | `label`, `detail`, `sort`, `limit` | A simple list of rows |
| `text` | the text | A note between cards |

Area and line charts take `curve: smooth` (the default), `linear` or `step`.

`format` is `currency`, `number`, `integer`, `percent` (a fraction, so 0.62
shows as 62%), `date` or `text`. When it is left out the format follows the
column, so currency columns show as pounds.

## Expressions

- Values are aggregates: `sum(balance)`, `avg(rate)`, `min(fixed_until)`,
  `max(x)`, `count()`, `first(x)`, `last(x)`, combined with `+ - * /` and
  brackets, for example `sum(outstanding) / sum(property_value)`.
- Filters compare columns: `=`, `!=`, `>`, `>=`, `<`, `<=`, `in [a, b]` and
  `not in [...]`, joined with `and` and `or`. Bare words on the right hand side
  are text, so `kind = mortgage` needs no quotes.
- Ref columns can be followed with a dot. In balances, `account.category` reads
  the `category` of the matching row in accounts.md.
- Helpers: `today()`, `current_tax_year()`, `tax_year(date)` (UK tax years
  start on 6 April and read like `2026-27`), `days_until(date)`, `year(date)`,
  `month(date)`, `abs(x)`, `round(x, places)`, `coalesce(a, b)`.
- Put spaces around a minus sign, since `a-b` reads as one name.

Expressions cannot run code, so a dashboard from a template is always safe to
open.

## Latest and snapshots

Balance style Datasets record a value per account per date. `latest: date`
keeps the most recent row for each record, using the Dataset's `key` columns
other than the date (or its ref columns), so `sum(balance)` gives today's
total even when accounts were updated on different days. On an `area` chart,
`snapshots: true` applies the same rule at every date on the x axis.

## Templates

Every template ships with a `dashboard.md`. When a template has none, Caedora
generates one that shows each of its Datasets as a table.

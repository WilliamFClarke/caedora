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
| `treemap` | `label`, `value`, `group` | Tiles sized by `value`, one per `label`, each showing its share of the whole. `group` colours the tiles by a second column, such as fund or company |
| `waterfall` | `x`, `y`, `sort`, `total` | Bars that rise and fall from a running total, green for gains and red for losses, ending in a total bar. `total: false` leaves it off |
| `table` | `columns`, `sort`, `limit`, `edit`, `highlight`, `colour` | A table of rows. `sort: -balance` sorts descending. `edit` lets each row set a column from the dashboard, see below |
| `progress` | `label`, `value`, `max`, `target`, `gauge` | A progress bar, or a radial gauge with `gauge: true`. `max` can be a number, an expression or `{ source, where, value }` to read it from another Dataset. `target` marks a point on the bar, given the same way |
| `list` | `label`, `detail`, `sort`, `limit` | A simple list of rows |
| `text` | the text | A note between cards |

Area and line charts take `curve: smooth` (the default), `linear` or `step`.
Line charts scale their axis to the data so small changes, such as weight or
a 5k time, stay visible; area and bar charts start at zero.

A chart's `x` and `series`, and a pie's `label`, can be a column or an
expression worked out for each row. Use `month(date)` or `year(date)` to total
a log by month or year, and `tax_year(date)` for UK tax years. Month buckets
work with `ranges` too.

`format` is `currency`, `number`, `integer`, `percent` (a fraction, so 0.62
shows as 62%), `date` or `text`. When it is left out the format follows the
column, so currency columns show as pounds.

### Several values on one chart

Give `y` a list to draw each value as its own line, area or bar. A value can
carry a label:

```yaml
- line:
    title: Value against money paid in
    source: account
    x: date
    y:
      - { value: sum(total_value), label: Value }
      - { value: sum(net_deposits), label: Paid in }
```

Without a label the line is named after its column. A list of values cannot
be combined with `series`.

### Reference lines and bands

`rules` adds lines and shaded bands to area, line and bar charts:

```yaml
rules:
  - { y: 20000, label: Allowance }
  - { from: -50, to: 50, label: Noise }
  - { x: 2026-10-28, label: Results }
```

A `y` value can also be an aggregate of the chart's rows, such as `avg(amount)`.

### Growth and drawdown

`rebase: true` divides each line by its first value and shows it from 100, so
lines of different sizes can be compared by growth. `y: drawdown(total_value)`
charts how far the value is below its highest point so far, as a percentage.

### Colour and highlights

Bar charts with one series colour bars green for gains and red for losses when
they show money or percentages and any bar is negative. `colour: false` turns
this off. `highlight: "weight > 15"` draws the bars whose rows match in the
highlight colour instead.

Tables colour their currency and percent columns green and red in the same
way, for columns that have a negative value anywhere in the Dataset, such as
profit and loss. `colour: [unrealised_pl, return]` names the columns instead,
and `colour: false` turns it off. `highlight` picks out matching rows:

```yaml
- table: { title: Holdings, source: holdings, columns: [ticker, value, weight], highlight: weight > 15 }
```

To compare two columns, put brackets round the right hand one, as in
`weight > (cap)`, since a bare word on the right is read as text.

### Joining two Datasets

A `data` entry can join two other sources on a column they share. Each row of
the first gets the columns of the matching row in the second:

```yaml
data:
  holdings: holdings.md
  targets: ../strategy/targets.md
  positions: { join: [holdings, targets], on: ticker }
```

Use `on: [ticker, symbol]` when the columns have different names. Rows with no
match keep empty values for the joined columns. A joined column whose name the
first Dataset already uses is renamed with the second source's name, as in
`targets_weight`.

## Editing a row from a table

A `table` can make a column settable from the dashboard, for example to
approve a planned trade:

```yaml
- table: { title: Planned moves, source: decisions, columns: [date, ticker, action, amount, status], edit: { status: [approved, rejected] } }
```

Each row gets a small menu in that column offering the listed values. Choosing
one reads the newest copy of the Dataset, rewrites that single cell in its
Markdown table and saves it. Nothing else in the file changes: not the other
rows, not the table's spacing and not the frontmatter. On a GitHub vault the
save is its own commit, made with your GitHub account, with a message such as
"Set status to approved for buy GOOGL_US_EQ on 2026-10-19".

The row is found by the Dataset's `key` (see [Datasets](datasets.md)), so the
edit still lands on the right row if someone else has added or reordered rows
since the dashboard loaded. Editing is refused when the Dataset has no key, and
for any row whose key is shared with another row. The column must be one of
the table's `columns`, and for an `enum` column the values must be among its
`values`.

## How current the data is

Under the title, a dashboard says how old its data is, such as "Data from 2
hours ago". The time is the oldest `generated.at` among the Datasets it reads,
including the ones that ref columns point at, because a dashboard is only as
current as its oldest source. Hover over the line to see each Dataset's time.

When a Dataset has a `stale_after` time that has passed, the line turns amber
and names it, for example "Holdings is out of date." A producer such as a sync
workflow can write `stale_after` each time it runs, set to when the next run
should have happened:

```yaml
generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }
stale_after: 2026-10-20T20:00:00Z
```

In a GitHub vault the line updates by itself when a new commit to a Dataset
arrives.

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
- Relative values compare with something else:
  - `share(value)` is this part's fraction of the whole: a pie slice, a bar or
    tile of all of them, or a stat's matching rows of all the rows before
    `where`.
  - `change(total_value, 1m)` is the change since the snapshot on or before a
    month before the latest date, and `change_pct(total_value, 1m)` is the same
    as a percentage. Periods are `7d`, `2w`, `3m`, `1y`, `ytd` and `mtd`. With
    `latest`, it compares snapshots; without it, it totals what happened in the
    period, such as deposits.
  - `drawdown(total_value)` is how far the latest value is below its peak.

  `change()` and `drawdown()` need dates, so they work in stats and progress
  bars. A plain column is summed, so `share(value)` means `share(sum(value))`.
  In a one line YAML mapping, quote values that contain a comma:
  `value: 'change(total_value, 1m)'`.
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

Every template ships with a `dashboard.md`. The built in templates each come
with a dashboard of their own and five years of example rows in their
Datasets, so it shows something straight away; replace the rows with your own. When a template from
GitHub has no dashboard, Caedora generates one that shows each of its Datasets
as a table.

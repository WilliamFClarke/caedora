import type { Dataset, DatasetColumn, DatasetRow, DatasetValue } from '../dataset.js'
import { resolveBundleLink } from '../okf.js'
import { describeKey } from '../dataset-edit.js'
import {
  ExpressionError,
  compare,
  periodStart,
  type AggregateContext,
  evaluateAggregate,
  evaluateRow,
  parseExpression,
  toNumber,
  truthy,
  type Expr,
  type ExpressionScope,
} from './expression.js'
import type {
  ChartCurve,
  ChartItem,
  ChartRule,
  ChartKind,
  DashboardItem,
  PieItem,
  ListItem,
  ProgressItem,
  StatItem,
  SubQuery,
  TableItem,
  TreemapItem,
  ValueFormat,
  WaterfallItem,
} from './spec.js'

export interface DashboardData {
  /** Datasets by their alias in the dashboard's `data` map. */
  sources: Record<string, Dataset | { error: string }>
  /** Every loaded Dataset by vault path, including ref targets. */
  byPath: Record<string, Dataset>
  today: Date
}

export interface ValueSpec {
  format: ValueFormat
  currency: string
}

export type ItemResult =
  | { kind: 'error'; title?: string; message: string }
  | { kind: 'text'; title?: string; text: string }
  | {
      kind: 'stat'
      label: string
      description?: string
      value: DatasetValue
      spec: ValueSpec
      trend: { delta: number; ratio: number | null } | null
      sparkline: number[] | null
    }
  | ChartResult
  | {
      kind: 'pie'
      title?: string
      description?: string
      slices: Array<{ key: string; label: string; value: number }>
      total: number
      donut: boolean
      spec: ValueSpec
    }
  | {
      kind: 'treemap'
      title?: string
      description?: string
      tiles: Array<{ key: string; label: string; value: number; group: string }>
      groups: Array<{ key: string; label: string }>
      total: number
      spec: ValueSpec
    }
  | {
      kind: 'waterfall'
      title?: string
      description?: string
      steps: Array<{ x: string; start: number; end: number; change: number; total: boolean }>
      spec: ValueSpec
    }
  | {
      kind: 'table'
      title?: string
      description?: string
      columns: Array<{ key: string; label: string; spec: ValueSpec }>
      rows: DatasetValue[][]
      edit?: TableEdit
      /** Parallel to rows: true where the highlight expression holds. */
      highlighted?: boolean[]
      /** Indexes of columns coloured green or red by sign. */
      signed: number[]
    }
  | {
      kind: 'progress'
      label: string
      description?: string
      value: number
      max: number
      target: number | null
      spec: ValueSpec
      gauge: boolean
    }
  | {
      kind: 'list'
      title?: string
      description?: string
      items: Array<{ label: string; detail: string }>
      detailSpec: ValueSpec | null
    }

/** A reference line (value) or band (from, to), resolved to numbers or x values. */
export interface ChartRuleResult {
  axis: 'x' | 'y'
  value?: string | number
  from?: number
  to?: number
  label?: string
}

/** How a bar is coloured: a gain, a loss, or a highlighted bar. Stored on the point as `tone`. */
export type BarTone = 'up' | 'down' | 'highlight'

export interface ChartResult {
  kind: ChartKind
  title?: string
  description?: string
  /** One per x. Bars may carry a `tone`. */
  points: Array<Record<string, string | number>>
  series: Array<{ key: string; label: string }>
  stacked: boolean
  ranges: string[]
  spec: ValueSpec
  curve: ChartCurve
  horizontal: boolean
  rules: ChartRuleResult[]
}

export function evaluateItem(item: DashboardItem, data: DashboardData): ItemResult {
  if (item.kind === 'text') return item
  const title = 'title' in item ? item.title : undefined
  try {
    const source = item.source ? data.sources[item.source] : undefined
    if (!source) throw new ExpressionError(`No data source called ${item.source}.`)
    if ('error' in source) throw new ExpressionError(source.error)
    const rows = selectRows(source, item, data)

    switch (item.kind) {
      case 'stat':
        return evaluateStat(item, source, rows, data)
      case 'area':
      case 'bar':
      case 'line':
        return evaluateChart(item, source, data)
      case 'pie':
        return evaluatePie(item, source, rows, data)
      case 'treemap':
        return evaluateTreemap(item, source, rows, data)
      case 'waterfall':
        return evaluateWaterfall(item, source, rows, data)
      case 'table':
        return evaluateTable(item, source, rows, data)
      case 'progress':
        return evaluateProgress(item, source, rows, data)
      case 'list':
        return evaluateList(item, source, rows, data)
    }
  } catch (error) {
    const label = item.kind === 'stat' || item.kind === 'progress' ? item.label : title
    return {
      kind: 'error',
      title: label,
      message: error instanceof Error ? error.message : 'This component could not be rendered.',
    }
  }
}

/** Builds the scope that lets expressions read a row, following ref columns. */
export function rowScope(dataset: Dataset, row: DatasetRow, data: DashboardData): ExpressionScope {
  return {
    today: data.today,
    column: (path) => readPath(dataset, row, path, data),
  }
}

export function readPath(
  dataset: Dataset,
  row: DatasetRow,
  path: string[],
  data: DashboardData
): DatasetValue {
  const [head, ...rest] = path
  const column = findColumn(dataset, head)
  if (column && rest.length === 0) return row[column.name] ?? null

  const refColumn =
    column?.type === 'ref'
      ? column
      : dataset.schema.columns.find((candidate) => candidate.type === 'ref' && refAlias(candidate) === head)
  if (!refColumn) {
    throw new ExpressionError(`${dataset.title} has no column called ${path.join('.')}.`)
  }
  if (rest.length === 0) return row[refColumn.name] ?? null

  const target = refTarget(dataset, refColumn, data)
  if (!target) throw new ExpressionError(`${refColumn.name} points at ${refColumn.to}, which could not be loaded.`)
  const targetRow = findRefRow(target, row[refColumn.name])
  if (!targetRow) return null
  return readPath(target, targetRow, rest, data)
}

export function selectRows(
  dataset: Dataset,
  item: { where?: string; latest?: string | true },
  data: DashboardData,
  cutoff?: string
): DatasetRow[] {
  let rows = dataset.rows
  if (item.where) {
    const where = parseExpression(item.where)
    rows = rows.filter((row) => {
      const value = evaluateRow(where, rowScope(dataset, row, data))
      return !Array.isArray(value) && truthy(value)
    })
  }
  if (item.latest) rows = latestRows(dataset, rows, dateColumn(dataset, item.latest), cutoff)
  return rows
}

/**
 * Keeps the most recent row (on or before `cutoff`) for each record, where a
 * record is identified by the key columns other than the date. This turns a
 * log of balance snapshots into "balance per account right now".
 */
export function latestRows(
  dataset: Dataset,
  rows: DatasetRow[],
  date: string,
  cutoff?: string
): DatasetRow[] {
  const eligible = rows.filter((row) => {
    const value = row[date]
    return typeof value === 'string' && (!cutoff || value <= cutoff)
  })
  let groupBy = dataset.schema.key.filter((name) => name !== date)
  if (groupBy.length === 0) {
    groupBy = dataset.schema.columns.filter((column) => column.type === 'ref').map((column) => column.name)
  }
  if (groupBy.length === 0) {
    const max = eligible.reduce<string>((best, row) => ((row[date] as string) > best ? (row[date] as string) : best), '')
    return eligible.filter((row) => row[date] === max)
  }
  const latest = new Map<string, DatasetRow>()
  for (const row of eligible) {
    const key = JSON.stringify(groupBy.map((name) => row[name]))
    const current = latest.get(key)
    if (!current || (row[date] as string) >= (current[date] as string)) latest.set(key, row)
  }
  return [...latest.values()]
}

export function filterRange<T extends Record<string, string | number>>(
  points: T[],
  range: string,
  key = 'x'
): T[] {
  if (!range || range === 'all' || points.length === 0) return points
  const last = String(points[points.length - 1][key])
  // Days (2026-09-30) and months (2026-09) can both be filtered by range.
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(last)) return points
  const end = new Date(`${last.length === 7 ? `${last}-01` : last}T00:00:00Z`)
  let start: Date
  const match = range.match(/^(\d+)\s*([dwmy])$/i)
  if (range.toLowerCase() === 'ytd') {
    start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1))
  } else if (match) {
    const amount = Number(match[1])
    const unit = match[2].toLowerCase()
    start = new Date(end)
    if (unit === 'd') start.setUTCDate(start.getUTCDate() - amount)
    if (unit === 'w') start.setUTCDate(start.getUTCDate() - amount * 7)
    if (unit === 'm') start.setUTCMonth(start.getUTCMonth() - amount)
    if (unit === 'y') start.setUTCFullYear(start.getUTCFullYear() - amount)
  } else {
    return points
  }
  const from = start.toISOString().slice(0, last.length)
  return points.filter((point) => String(point[key]) >= from)
}

export function rangeLabel(range: string): string {
  if (range.toLowerCase() === 'all') return 'All'
  if (range.toLowerCase() === 'ytd') return 'YTD'
  const match = range.match(/^(\d+)\s*([dwmy])$/i)
  return match ? `${match[1]}${match[2].toUpperCase()}` : range
}

function evaluateStat(item: StatItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const expr = parseExpression(item.value)
  const context = itemContext(item, dataset, data)
  const value = aggregateRows(expr, dataset, rows, data, context)
  let trend: { delta: number; ratio: number | null } | null = null

  if (item.trend && item.latest) {
    const date = dateColumn(dataset, item.latest)
    const dates = [...new Set(dataset.rows.map((row) => row[date]).filter((v): v is string => typeof v === 'string'))].sort()
    const previous = dates[dates.length - 2]
    if (previous) {
      const before = aggregateRows(expr, dataset, selectRows(dataset, item, data, previous), data, context)
      const now = toNumber(value)
      const then = toNumber(before)
      if (now !== null && then !== null) {
        trend = { delta: now - then, ratio: then === 0 ? null : (now - then) / Math.abs(then) }
      }
    }
  }

  let sparkline: number[] | null = null
  if (item.sparkline && item.latest) {
    const date = dateColumn(dataset, item.latest)
    const dates = [...new Set(dataset.rows.map((row) => row[date]).filter((v): v is string => typeof v === 'string'))].sort()
    sparkline = dates.map(
      (cutoff) => toNumber(aggregateRows(expr, dataset, selectRows(dataset, item, data, cutoff), data, context)) ?? 0
    )
  }

  return {
    kind: 'stat',
    label: item.label,
    description: item.description,
    value,
    spec: valueSpec(item.format ?? impliedFormat(expr), item.currency, guessColumn(dataset, expr, data)),
    trend,
    sparkline,
  }
}

function evaluatePie(item: PieItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const valueExpr = parseExpression(item.value)
  const labelExpr = parseExpression(item.label)
  const groups = new Map<string, DatasetRow[]>()
  for (const row of rows) {
    const label = String(rowValue(labelExpr, dataset, row, data) ?? 'Other')
    groups.set(label, [...(groups.get(label) ?? []), row])
  }
  const slices = [...groups]
    .map(([label, groupRows]) => ({
      label: prettyLabel(label),
      value: toNumber(aggregateRows(valueExpr, dataset, groupRows, data, { whole: scopesOf(dataset, rows, data) })) ?? 0,
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((slice, index) => ({ ...slice, key: `s${index}` }))
  return {
    kind: 'pie',
    title: item.title,
    description: item.description,
    slices,
    total: slices.reduce((sum, slice) => sum + slice.value, 0),
    donut: item.donut ?? true,
    spec: valueSpec(item.format, item.currency, guessColumn(dataset, valueExpr, data)),
  }
}

function evaluateChart(item: ChartItem, dataset: Dataset, data: DashboardData): ItemResult {
  const measures = (item.measures ?? [{ value: item.y }]).map((measure, index) => {
    const parsed = parseExpression(measure.value)
    // drawdown() is worked out along the line, from the value at each point.
    const drawdown = parsed.kind === 'call' && parsed.name === 'drawdown'
    const expr = drawdown ? unwrapMeasure(parsed) : parsed
    return { key: item.measures ? `m${index}` : 'value', label: measure.label, expr, drawdown, source: parsed }
  })
  const xExpr = parseExpression(item.x)
  const seriesExpr = item.series ? parseExpression(item.series) : null
  const base = selectRows(dataset, { where: item.where }, data)

  // x and series are row expressions, so `month(date)` buckets a log by month.
  const xOf = (row: DatasetRow) => rowValue(xExpr, dataset, row, data)
  const xs = [...new Set(base.map(xOf).filter((value) => value !== null))].sort(compare)

  const seriesLabels = new Map<string, string>()
  const seriesKey = (row: DatasetRow): string => {
    if (!seriesExpr) return measures[0].key
    const label = String(rowValue(seriesExpr, dataset, row, data) ?? 'Other')
    let key = [...seriesLabels.entries()].find(([, existing]) => existing === label)?.[0]
    if (!key) {
      key = `s${seriesLabels.size}`
      seriesLabels.set(key, label)
    }
    return key
  }

  const highlightExpr = item.highlight ? parseExpression(item.highlight) : null
  const highlighted = new Set<number>()
  const points = xs.map((x, index) => {
    const rows = item.snapshots
      ? latestRows(dataset, base, dateColumn(dataset, item.x), String(x))
      : base.filter((row) => xOf(row) === x)
    const point: Record<string, string | number> = { x: x as string | number }
    if (highlightExpr && rows.some((row) => truthy(rowValue(highlightExpr, dataset, row, data)))) highlighted.add(index)
    // share() at a point is this series' part of everything at that point,
    // or of the whole chart when there is only one series.
    const whole = { whole: scopesOf(dataset, seriesExpr ? rows : base, data) }
    if (!seriesExpr) {
      for (const measure of measures) {
        point[measure.key] = toNumber(aggregateRows(measure.expr, dataset, rows, data, whole)) ?? 0
      }
      return point
    }
    const groups = new Map<string, DatasetRow[]>()
    for (const row of rows) {
      const key = seriesKey(row)
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    for (const [key, groupRows] of groups) {
      point[key] = toNumber(aggregateRows(measures[0].expr, dataset, groupRows, data, whole)) ?? 0
    }
    return point
  })

  const series = seriesExpr
    ? [...seriesLabels.entries()].map(([key, label]) => ({ key, label: prettyLabel(label) }))
    : measures.map((measure) => ({
        key: measure.key,
        label: measure.label ?? (item.measures ? measureLabel(dataset, measure.source, data) : 'Total'),
      }))
  for (const point of points) {
    for (const { key } of series) if (!(key in point)) point[key] = 0
  }

  const drawdown = measures.some((measure) => measure.drawdown)
  for (const { key } of series) {
    const measure = seriesExpr ? measures[0] : measures.find((entry) => entry.key === key)
    if (measure?.drawdown) applyDrawdown(points, key)
    else if (item.rebase) applyRebase(points, key)
  }

  let spec = valueSpec(item.format ?? impliedFormat(measures[0].source), item.currency, guessColumn(dataset, measures[0].expr, data))
  if (drawdown && !item.format) spec = { ...spec, format: 'percent' }
  else if (item.rebase && !item.format) spec = { ...spec, format: 'number' }

  if (item.kind === 'bar' && series.length === 1) {
    const key = series[0].key
    const signed =
      item.colour !== false &&
      ['currency', 'percent', 'percent-points'].includes(spec.format) &&
      points.some((point) => Number(point[key]) < 0)
    points.forEach((point, index) => {
      if (highlighted.has(index)) point.tone = 'highlight'
      else if (signed) point.tone = Number(point[key]) < 0 ? 'down' : 'up'
    })
  }

  return {
    kind: item.kind,
    title: item.title,
    description: item.description,
    points,
    series,
    stacked: item.stacked ?? false,
    ranges: item.ranges ?? [],
    spec,
    curve: item.curve ?? 'smooth',
    horizontal: item.horizontal ?? false,
    rules: (item.rules ?? []).map((rule) => resolveRule(rule, dataset, base, data)),
  }
}

/** drawdown(sum(value)) and drawdown(value) both chart the drop from sum(value)'s peak. */
function unwrapMeasure(expr: Extract<Expr, { kind: 'call' }>): Expr {
  const [arg] = expr.args
  if (!arg) throw new ExpressionError('drawdown() needs a value, such as drawdown(total_value).')
  return arg.kind === 'column' ? { kind: 'call', name: 'sum', args: [arg] } : arg
}

/** Each point as a fraction below the highest value so far. */
function applyDrawdown(points: Array<Record<string, string | number>>, key: string) {
  let peak = -Infinity
  for (const point of points) {
    const value = Number(point[key])
    peak = Math.max(peak, value)
    point[key] = peak > 0 ? value / peak - 1 : 0
  }
}

/** Each point relative to the series' first non-zero value, which shows as 100. */
function applyRebase(points: Array<Record<string, string | number>>, key: string) {
  const first = points.map((point) => Number(point[key])).find((value) => value !== 0)
  if (!first) return
  for (const point of points) point[key] = (Number(point[key]) / first) * 100
}

/** "sum(total_value)" reads as the column's label, "Total value". */
function measureLabel(dataset: Dataset, expr: Expr, data: DashboardData): string {
  const column = guessColumn(dataset, expr, data)
  return column ? column.label ?? prettyLabel(column.name) : 'Value'
}

function resolveRule(rule: ChartRule, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ChartRuleResult {
  const number = (value: string) => {
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
    const result = toNumber(aggregateRows(parseExpression(value), dataset, rows, data))
    if (result === null) throw new ExpressionError(`The rule ${value} did not give a number.`)
    return result
  }
  if (rule.axis === 'x') {
    const value = rule.value!
    return { axis: 'x', value: /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value, label: rule.label }
  }
  if (rule.value !== undefined) return { axis: 'y', value: number(rule.value), label: rule.label }
  return { axis: 'y', from: number(rule.from!), to: number(rule.to!), label: rule.label }
}

function evaluateTreemap(item: TreemapItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const valueExpr = parseExpression(item.value)
  const labelExpr = parseExpression(item.label)
  const groupExpr = item.group ? parseExpression(item.group) : null
  const tiles = new Map<string, { label: string; group: string; rows: DatasetRow[] }>()
  for (const row of rows) {
    const label = String(rowValue(labelExpr, dataset, row, data) ?? 'Other')
    const group = groupExpr ? String(rowValue(groupExpr, dataset, row, data) ?? 'Other') : ''
    const id = JSON.stringify([group, label])
    const tile = tiles.get(id) ?? { label, group, rows: [] }
    tile.rows.push(row)
    tiles.set(id, tile)
  }
  const whole = { whole: scopesOf(dataset, rows, data) }
  const groupKeys = new Map<string, string>()
  const sized = [...tiles.values()]
    .map((tile) => ({
      label: prettyLabel(tile.label),
      group: tile.group,
      value: toNumber(aggregateRows(valueExpr, dataset, tile.rows, data, whole)) ?? 0,
    }))
    .filter((tile) => tile.value > 0)
    .sort((a, b) => b.value - a.value)
  for (const tile of sized) if (!groupKeys.has(tile.group)) groupKeys.set(tile.group, `g${groupKeys.size}`)
  return {
    kind: 'treemap',
    title: item.title,
    description: item.description,
    tiles: sized.map((tile, index) => ({ key: `t${index}`, label: tile.label, value: tile.value, group: groupKeys.get(tile.group)! })),
    groups: [...groupKeys.entries()].map(([label, key]) => ({ key, label: label ? prettyLabel(label) : 'Total' })),
    total: sized.reduce((sum, tile) => sum + tile.value, 0),
    spec: valueSpec(item.format ?? impliedFormat(valueExpr), item.currency, guessColumn(dataset, valueExpr, data)),
  }
}

function evaluateWaterfall(item: WaterfallItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const yExpr = parseExpression(item.y)
  const xExpr = parseExpression(item.x)
  const ordered = sortRows(dataset, rows, item.sort, data)
  const groups = new Map<string, DatasetRow[]>()
  for (const row of ordered) {
    const x = rowValue(xExpr, dataset, row, data)
    if (x === null) continue
    const key = String(x)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  let keys = [...groups.keys()]
  // Months and dates run in order unless a sort says otherwise.
  if (!item.sort && keys.every((key) => /^\d{4}-\d{2}(-\d{2})?$/.test(key))) keys = keys.sort()
  let running = 0
  const steps: Array<{ x: string; start: number; end: number; change: number; total: boolean }> = keys.map((x) => {
    const change = toNumber(aggregateRows(yExpr, dataset, groups.get(x)!, data)) ?? 0
    const step = { x, start: running, end: running + change, change, total: false }
    running = step.end
    return step
  })
  if (item.total !== false) steps.push({ x: item.total ?? 'Total', start: 0, end: running, change: running, total: true })
  return {
    kind: 'waterfall',
    title: item.title,
    description: item.description,
    steps,
    spec: valueSpec(item.format, item.currency, guessColumn(dataset, yExpr, data)),
  }
}

/** What a table lets each row set, and how to find each row again when saving. */
export interface TableEdit {
  /** Path of the Dataset the rows come from. */
  source: string
  /** Shown columns that can be set, by their position in `columns`. */
  columns: Array<{ index: number; column: string; values: string[] }>
  /** Each row's key values, parallel to `rows`; null when the key is not unique. */
  keys: Array<Record<string, DatasetValue> | null>
  /** The row described in words, e.g. "buy GOOGL_US_EQ on 2026-10-19". */
  labels: string[]
  /** Why rows cannot be edited, such as a Dataset without a key. */
  problem?: string
}

function tableEdit(
  item: TableItem,
  dataset: Dataset,
  rows: DatasetRow[],
  shown: string[]
): TableEdit | undefined {
  if (!item.edit) return undefined
  const columns: TableEdit['columns'] = []
  const problems: string[] = []
  for (const [column, values] of Object.entries(item.edit)) {
    const index = shown.indexOf(column)
    const schema = dataset.schema.columns.find((entry) => entry.name === column)
    if (!schema) problems.push(`${dataset.title} has no ${column} column to edit.`)
    else if (index < 0) problems.push(`Add ${column} to columns to edit it here.`)
    else if (schema.type === 'enum' && schema.values?.length && values.some((value) => !schema.values!.includes(value))) {
      problems.push(`${column} can only be set to ${schema.values.join(', ')}.`)
    } else columns.push({ index, column, values })
  }
  const key = dataset.schema.key
  if (key.length === 0) {
    problems.push(`Add a key to ${dataset.title} so its rows can be edited here.`)
  }
  const counts = new Map<string, number>()
  const keyOf = (row: DatasetRow) => JSON.stringify(key.map((name) => row[name]))
  for (const row of dataset.rows) counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1)
  return {
    source: dataset.path,
    columns: problems.length > 0 ? [] : columns,
    keys: rows.map((row) =>
      key.length > 0 && counts.get(keyOf(row)) === 1
        ? Object.fromEntries(key.map((name) => [name, row[name]]))
        : null
    ),
    labels: rows.map((row) => describeKey(dataset, Object.fromEntries(key.map((name) => [name, row[name]])))),
    problem: problems.length > 0 ? problems.join(' ') : undefined,
  }
}

function evaluateTable(item: TableItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const columns = (item.columns ?? dataset.schema.columns.map((column) => column.name)).map((name) => {
    const path = name.split('.').map((part) => part.trim())
    const column = columnAt(dataset, path, data)
    return {
      key: name,
      path,
      label: column?.label ?? prettyLabel(path[path.length - 1]),
      spec: valueSpec(undefined, undefined, column),
    }
  })
  const sorted = sortRows(dataset, rows, item.sort, data)
  const limited = item.limit ? sorted.slice(0, item.limit) : sorted
  const highlightExpr = item.highlight ? parseExpression(item.highlight) : null
  return {
    kind: 'table',
    title: item.title,
    description: item.description,
    columns: columns.map(({ key, label, spec }) => ({ key, label, spec })),
    rows: limited.map((row) => columns.map((column) => readPath(dataset, row, column.path, data))),
    edit: tableEdit(item, dataset, limited, columns.map((column) => column.key)),
    highlighted: highlightExpr ? limited.map((row) => truthy(rowValue(highlightExpr, dataset, row, data))) : undefined,
    signed: signedColumns(item, dataset, columns),
  }
}

/**
 * Columns shown green when positive and red when negative: those listed in
 * `colour`, or by default the currency and percent columns with a negative
 * value anywhere in the Dataset, such as a profit and loss column.
 */
function signedColumns(
  item: TableItem,
  dataset: Dataset,
  columns: Array<{ key: string; path: string[]; spec: ValueSpec }>
): number[] {
  if (item.colour === false) return []
  if (item.colour) {
    return columns.flatMap((column, index) => (item.colour as string[]).includes(column.key) ? [index] : [])
  }
  return columns.flatMap((column, index) => {
    if (column.path.length !== 1 || !['currency', 'percent-points'].includes(column.spec.format)) return []
    const name = column.path[0]
    return dataset.rows.some((row) => (toNumber(row[name] ?? null) ?? 0) < 0) ? [index] : []
  })
}

function evaluateProgress(item: ProgressItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const valueExpr = parseExpression(item.value)
  const context = itemContext(item, dataset, data)
  const value = toNumber(aggregateRows(valueExpr, dataset, rows, data, context)) ?? 0
  const bound = (value: string | SubQuery) =>
    toNumber(
      typeof value === 'string'
        ? aggregateRows(parseExpression(value), dataset, rows, data, context)
        : evaluateSubQuery(value, data)
    )
  const max = bound(item.max)
  if (max === null || max <= 0) throw new ExpressionError(`max for ${item.label} must be a positive number.`)
  const target = item.target === undefined ? null : bound(item.target)
  return {
    kind: 'progress',
    label: item.label,
    description: item.description,
    value,
    max,
    target,
    spec: valueSpec(item.format ?? impliedFormat(valueExpr), item.currency, guessColumn(dataset, valueExpr, data)),
    gauge: item.gauge ?? false,
  }
}

function evaluateList(item: ListItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const labelExpr = parseExpression(item.label)
  const detailExpr = item.detail ? parseExpression(item.detail) : null
  const detailColumn = detailExpr?.kind === 'column' ? columnAt(dataset, detailExpr.path, data) : null
  const sorted = sortRows(dataset, rows, item.sort, data)
  const limited = item.limit ? sorted.slice(0, item.limit) : sorted
  return {
    kind: 'list',
    title: item.title,
    description: item.description,
    items: limited.map((row) => {
      const scope = rowScope(dataset, row, data)
      const label = evaluateRow(labelExpr, scope)
      const detail = detailExpr ? evaluateRow(detailExpr, scope) : null
      return { label: String(label ?? ''), detail: detail === null ? '' : String(detail) }
    }),
    detailSpec: detailColumn ? valueSpec(undefined, undefined, detailColumn) : null,
  }
}

function scopesOf(dataset: Dataset, rows: DatasetRow[], data: DashboardData) {
  return rows.map((row) => rowScope(dataset, row, data))
}

function rowValue(expr: Expr, dataset: Dataset, row: DatasetRow, data: DashboardData): DatasetValue {
  const value = evaluateRow(expr, rowScope(dataset, row, data))
  return Array.isArray(value) ? null : value
}

function evaluateSubQuery(query: SubQuery, data: DashboardData): DatasetValue {
  const source = data.sources[query.source]
  if (!source) throw new ExpressionError(`No data source called ${query.source}.`)
  if ('error' in source) throw new ExpressionError(source.error)
  return aggregateRows(parseExpression(query.value), source, selectRows(source, query, data), data)
}

function aggregateRows(
  expr: Expr,
  dataset: Dataset,
  rows: DatasetRow[],
  data: DashboardData,
  context?: AggregateContext
): DatasetValue {
  return evaluateAggregate(
    expr,
    rows.map((row) => rowScope(dataset, row, data)),
    data.today,
    context
  )
}

/**
 * What share(), change() and drawdown() compare with for a stat or progress
 * bar: the item's rows without `where`, and its rows at earlier dates.
 */
function itemContext(
  item: { where?: string; latest?: string | true },
  dataset: Dataset,
  data: DashboardData
): AggregateContext {
  const scopes = (rows: DatasetRow[]) => rows.map((row) => rowScope(dataset, row, data))
  const timeline = () => {
    const date = item.latest ? dateColumn(dataset, item.latest) : firstDateColumn(dataset)
    if (!date) return null
    const rows = selectRows(dataset, { where: item.where }, data)
    const dates = [...new Set(rows.map((row) => row[date]).filter((v): v is string => typeof v === 'string'))].sort()
    return { date, rows, dates }
  }
  return {
    whole: scopes(selectRows(dataset, { latest: item.latest }, data)),
    before: (period) => {
      const line = timeline()
      if (!line) throw new ExpressionError(`${dataset.title} has no date column to compare with.`)
      const last = line.dates[line.dates.length - 1]
      if (!last) return null
      const cutoff = periodStart(last, period)
      if (item.latest) {
        const rows = latestRows(dataset, line.rows, line.date, cutoff)
        return rows.length > 0 ? scopes(rows) : null
      }
      // A log of flows, such as deposits: the total up to the cutoff.
      return scopes(line.rows.filter((row) => typeof row[line.date] === 'string' && (row[line.date] as string) <= cutoff))
    },
    history: () => {
      const line = timeline()
      if (!line) throw new ExpressionError(`${dataset.title} has no date column for drawdown().`)
      return line.dates.map((cutoff) =>
        scopes(
          item.latest
            ? latestRows(dataset, line.rows, line.date, cutoff)
            : line.rows.filter((row) => row[line.date] === cutoff)
        )
      )
    },
  }
}

function firstDateColumn(dataset: Dataset): string | null {
  return dataset.schema.columns.find((column) => column.type === 'date')?.name ?? null
}

/** share(), change_pct() and drawdown() give fractions, so they read as percentages. */
function impliedFormat(expr: Expr): ValueFormat | undefined {
  if (expr.kind === 'call' && ['share', 'change_pct', 'drawdown'].includes(expr.name)) return 'percent'
  if (expr.kind === 'unary') return impliedFormat(expr.arg)
  return undefined
}

function sortRows(dataset: Dataset, rows: DatasetRow[], sort: string | undefined, data: DashboardData): DatasetRow[] {
  if (!sort) return rows
  const descending = sort.startsWith('-') || /\s+desc$/i.test(sort)
  const name = sort.replace(/^[-+]/, '').replace(/\s+(asc|desc)$/i, '').trim()
  const path = name.split('.')
  // Ties keep the file's order whichever way the sort runs.
  const direction = descending ? -1 : 1
  return [...rows].sort((a, b) => direction * compare(readPath(dataset, a, path, data), readPath(dataset, b, path, data)))
}

function valueSpec(format: ValueFormat | undefined, currency: string | undefined, column: DatasetColumn | null): ValueSpec {
  const inferred: ValueFormat =
    column?.type === 'currency'
      ? 'currency'
      : column?.type === 'percent'
        ? 'percent-points'
        : column?.type === 'number'
          ? 'number'
          : column?.type === 'date'
            ? 'date'
            : column
              ? 'text'
              : 'number'
  return {
    format: format ?? inferred,
    currency: currency ?? column?.currency ?? 'GBP',
  }
}

/** Finds the column an aggregate expression mainly reads, to pick a sensible format. */
function guessColumn(dataset: Dataset, expr: Expr, data: DashboardData): DatasetColumn | null {
  if (expr.kind === 'column') return columnAt(dataset, expr.path, data)
  if (expr.kind === 'call') {
    if (expr.name === 'count') return null
    for (const arg of expr.args) {
      const found = guessColumn(dataset, arg, data)
      if (found) return found
    }
  }
  if (expr.kind === 'unary') return guessColumn(dataset, expr.arg, data)
  if (expr.kind === 'binary' && (expr.op === '+' || expr.op === '-')) {
    return guessColumn(dataset, expr.left, data) ?? guessColumn(dataset, expr.right, data)
  }
  return null
}

function columnAt(dataset: Dataset, path: string[], data: DashboardData): DatasetColumn | null {
  const [head, ...rest] = path
  const column = findColumn(dataset, head)
  if (rest.length === 0) return column
  const refColumn =
    column?.type === 'ref'
      ? column
      : dataset.schema.columns.find((candidate) => candidate.type === 'ref' && refAlias(candidate) === head)
  const target = refColumn ? refTarget(dataset, refColumn, data) : null
  return target ? columnAt(target, rest, data) : null
}

function findColumn(dataset: Dataset, name: string): DatasetColumn | null {
  return dataset.schema.columns.find((column) => column.name === name) ?? null
}

function dateColumn(dataset: Dataset, latest: string | true): string {
  if (latest !== true) {
    const column = findColumn(dataset, latest)
    if (!column) throw new ExpressionError(`${dataset.title} has no date column called ${latest}.`)
    return column.name
  }
  const column = dataset.schema.columns.find((candidate) => candidate.type === 'date')
  if (!column) throw new ExpressionError(`${dataset.title} has no date column for latest.`)
  return column.name
}

function refAlias(column: DatasetColumn): string {
  return (column.to ?? '').split('/').pop()?.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_') ?? ''
}

function refTarget(dataset: Dataset, column: DatasetColumn, data: DashboardData): Dataset | null {
  if (!column.to) return null
  const path = resolveBundleLink(dataset.path, column.to)
  return path ? data.byPath[path] ?? null : null
}

const refIndexes = new WeakMap<Dataset, Map<string, DatasetRow>>()

function findRefRow(target: Dataset, id: DatasetValue): DatasetRow | null {
  if (id === null) return null
  let index = refIndexes.get(target)
  if (!index) {
    const idColumn =
      (target.schema.key.length === 1 ? target.schema.key[0] : null) ??
      findColumn(target, 'id')?.name ??
      target.schema.columns[0]?.name
    index = new Map()
    for (const row of target.rows) {
      const value = idColumn ? row[idColumn] : null
      if (value !== null && value !== undefined) index.set(String(value).toLowerCase(), row)
    }
    refIndexes.set(target, index)
  }
  return index.get(String(id).toLowerCase()) ?? null
}

export function prettyLabel(value: string): string {
  if (/[A-Z]/.test(value) || !/[_-]/.test(value)) return value.charAt(0).toUpperCase() + value.slice(1)
  const words = value.split(/[_-]+/).filter(Boolean).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

import type { Dataset, DatasetColumn, DatasetRow, DatasetValue } from '../dataset'
import { resolveBundleLink } from '../okf'
import {
  ExpressionError,
  compare,
  evaluateAggregate,
  evaluateRow,
  parseExpression,
  toNumber,
  truthy,
  type Expr,
  type ExpressionScope,
} from './expression'
import type {
  ChartCurve,
  ChartItem,
  ChartKind,
  DashboardItem,
  PieItem,
  ListItem,
  ProgressItem,
  StatItem,
  SubQuery,
  TableItem,
  ValueFormat,
} from './spec'

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
      kind: 'table'
      title?: string
      description?: string
      columns: Array<{ key: string; label: string; spec: ValueSpec }>
      rows: DatasetValue[][]
    }
  | {
      kind: 'progress'
      label: string
      description?: string
      value: number
      max: number
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

export interface ChartResult {
  kind: ChartKind
  title?: string
  description?: string
  points: Array<Record<string, string | number>>
  series: Array<{ key: string; label: string }>
  stacked: boolean
  ranges: string[]
  spec: ValueSpec
  curve: ChartCurve
  horizontal: boolean
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) return points
  const end = new Date(`${last}T00:00:00Z`)
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
  const from = start.toISOString().slice(0, 10)
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
  const value = aggregateRows(expr, dataset, rows, data)
  let trend: { delta: number; ratio: number | null } | null = null

  if (item.trend && item.latest) {
    const date = dateColumn(dataset, item.latest)
    const dates = [...new Set(dataset.rows.map((row) => row[date]).filter((v): v is string => typeof v === 'string'))].sort()
    const previous = dates[dates.length - 2]
    if (previous) {
      const before = aggregateRows(expr, dataset, selectRows(dataset, item, data, previous), data)
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
      (cutoff) => toNumber(aggregateRows(expr, dataset, selectRows(dataset, item, data, cutoff), data)) ?? 0
    )
  }

  return {
    kind: 'stat',
    label: item.label,
    description: item.description,
    value,
    spec: valueSpec(item.format, item.currency, guessColumn(dataset, expr, data)),
    trend,
    sparkline,
  }
}

function evaluatePie(item: PieItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const valueExpr = parseExpression(item.value)
  const labelPath = item.label.split('.')
  const groups = new Map<string, DatasetRow[]>()
  for (const row of rows) {
    const label = String(readPath(dataset, row, labelPath, data) ?? 'Other')
    groups.set(label, [...(groups.get(label) ?? []), row])
  }
  const slices = [...groups]
    .map(([label, groupRows]) => ({ label: prettyLabel(label), value: toNumber(aggregateRows(valueExpr, dataset, groupRows, data)) ?? 0 }))
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
  const yExpr = parseExpression(item.y)
  const xPath = item.x.split('.')
  const seriesPath = item.series?.split('.')
  const base = selectRows(dataset, { where: item.where }, data)

  const xOf = (row: DatasetRow) => readPath(dataset, row, xPath, data)
  const xs = [...new Set(base.map(xOf).filter((value) => value !== null))].sort(compare)

  const seriesLabels = new Map<string, string>()
  const seriesKey = (row: DatasetRow): string => {
    if (!seriesPath) return 'value'
    const label = String(readPath(dataset, row, seriesPath, data) ?? 'Other')
    let key = [...seriesLabels.entries()].find(([, existing]) => existing === label)?.[0]
    if (!key) {
      key = `s${seriesLabels.size}`
      seriesLabels.set(key, label)
    }
    return key
  }

  const points = xs.map((x) => {
    const rows = item.snapshots
      ? latestRows(dataset, base, xPath[0], String(x))
      : base.filter((row) => xOf(row) === x)
    const groups = new Map<string, DatasetRow[]>()
    for (const row of rows) {
      const key = seriesKey(row)
      groups.set(key, [...(groups.get(key) ?? []), row])
    }
    const point: Record<string, string | number> = { x: x as string | number }
    for (const [key, groupRows] of groups) {
      point[key] = toNumber(aggregateRows(yExpr, dataset, groupRows, data)) ?? 0
    }
    return point
  })

  const series = seriesPath
    ? [...seriesLabels.entries()].map(([key, label]) => ({ key, label: prettyLabel(label) }))
    : [{ key: 'value', label: 'Total' }]
  for (const point of points) {
    for (const { key } of series) if (!(key in point)) point[key] = 0
  }

  return {
    kind: item.kind,
    title: item.title,
    description: item.description,
    points,
    series,
    stacked: item.stacked ?? false,
    ranges: item.ranges ?? [],
    spec: valueSpec(item.format, item.currency, guessColumn(dataset, yExpr, data)),
    curve: item.curve ?? 'smooth',
    horizontal: item.horizontal ?? false,
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
  return {
    kind: 'table',
    title: item.title,
    description: item.description,
    columns: columns.map(({ key, label, spec }) => ({ key, label, spec })),
    rows: limited.map((row) => columns.map((column) => readPath(dataset, row, column.path, data))),
  }
}

function evaluateProgress(item: ProgressItem, dataset: Dataset, rows: DatasetRow[], data: DashboardData): ItemResult {
  const valueExpr = parseExpression(item.value)
  const value = toNumber(aggregateRows(valueExpr, dataset, rows, data)) ?? 0
  const max = toNumber(
    typeof item.max === 'string'
      ? aggregateRows(parseExpression(item.max), dataset, rows, data)
      : evaluateSubQuery(item.max, data)
  )
  if (max === null || max <= 0) throw new ExpressionError(`max for ${item.label} must be a positive number.`)
  return {
    kind: 'progress',
    label: item.label,
    description: item.description,
    value,
    max,
    spec: valueSpec(item.format, item.currency, guessColumn(dataset, valueExpr, data)),
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

function evaluateSubQuery(query: SubQuery, data: DashboardData): DatasetValue {
  const source = data.sources[query.source]
  if (!source) throw new ExpressionError(`No data source called ${query.source}.`)
  if ('error' in source) throw new ExpressionError(source.error)
  return aggregateRows(parseExpression(query.value), source, selectRows(source, query, data), data)
}

function aggregateRows(expr: Expr, dataset: Dataset, rows: DatasetRow[], data: DashboardData): DatasetValue {
  return evaluateAggregate(
    expr,
    rows.map((row) => rowScope(dataset, row, data)),
    data.today
  )
}

function sortRows(dataset: Dataset, rows: DatasetRow[], sort: string | undefined, data: DashboardData): DatasetRow[] {
  if (!sort) return rows
  const descending = sort.startsWith('-') || /\s+desc$/i.test(sort)
  const name = sort.replace(/^[-+]/, '').replace(/\s+(asc|desc)$/i, '').trim()
  const path = name.split('.')
  const sorted = [...rows].sort((a, b) =>
    compare(readPath(dataset, a, path, data), readPath(dataset, b, path, data))
  )
  return descending ? sorted.reverse() : sorted
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

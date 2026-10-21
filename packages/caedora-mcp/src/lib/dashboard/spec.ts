import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Code, Root, RootContent } from 'mdast'
import { parse as parseYaml } from 'yaml'
import type { Frontmatter } from '../frontmatter.js'

/**
 * Dashboards are OKF concepts with `type: Dashboard`. The layout lives in a
 * fenced `caedora-dashboard` YAML block, which any other Markdown reader shows
 * as an ordinary code block, so the file stays portable.
 */

export const DASHBOARD_TYPE = 'Dashboard'
export const DASHBOARD_FENCE = 'caedora-dashboard'

/**
 * `percent` formats a fraction (0.62 shows as 62%). Values read from a
 * percent column are already in percentage points and use `percent-points`.
 */
export type ValueFormat = 'currency' | 'number' | 'integer' | 'percent' | 'percent-points' | 'text' | 'date'

interface ItemBase {
  title?: string
  description?: string
  /** Alias from the dashboard's `data` map. */
  source?: string
  where?: string
  /** Keep only the latest row per key, using this date column. `true` picks the first date column. */
  latest?: string | true
}

export interface StatItem extends ItemBase {
  kind: 'stat'
  label: string
  value: string
  format?: ValueFormat
  currency?: string
  /** Compare with the previous snapshot of the `latest` date column. */
  trend?: boolean
  /** Draw a small line of the value at every snapshot of the `latest` date column. */
  sparkline?: boolean
}

export type ChartKind = 'area' | 'bar' | 'line'
export type ChartCurve = 'smooth' | 'linear' | 'step'
export const CHART_CURVES: readonly ChartCurve[] = ['smooth', 'linear', 'step']

/** One of several values drawn on the same chart, as in `y: [sum(value), sum(paid_in)]`. */
export interface ChartMeasure {
  value: string
  label?: string
}

/**
 * A reference line or band. `y: 15000` draws a line across the chart,
 * `from` and `to` shade a band between two values, and `x` marks a point
 * along the bottom, such as a date. Values may be numbers or aggregates.
 */
export interface ChartRule {
  axis: 'x' | 'y'
  value?: string
  from?: string
  to?: string
  label?: string
}

/** Area, line and bar charts share their settings, after the shadcn chart blocks. */
export interface ChartItem extends ItemBase {
  kind: ChartKind
  x: string
  /** The value drawn, or the first of `measures`. */
  y: string
  /** Set when `y` lists several values, each drawn as its own series. */
  measures?: ChartMeasure[]
  series?: string
  stacked?: boolean
  /** Rebuild every point as a snapshot of the latest row per key at that date. */
  snapshots?: boolean
  ranges?: string[]
  format?: ValueFormat
  currency?: string
  /** Area and line charts: how points are joined. */
  curve?: ChartCurve
  /** Bar charts: bars run sideways, with x down the left. */
  horizontal?: boolean
  rules?: ChartRule[]
  /** Divide each series by its first value and show it from 100, to compare growth. */
  rebase?: boolean
  /** Bar charts: bars where this row expression is true are drawn in the highlight colour. */
  highlight?: string
  /** Bar charts: false turns off green and red for gains and losses. */
  colour?: boolean
}

/** Tiles sized by `value`, one per `label`, optionally grouped. */
export interface TreemapItem extends ItemBase {
  kind: 'treemap'
  label: string
  value: string
  group?: string
  format?: ValueFormat
  currency?: string
}

/** Bars that rise and fall from a running total, ending in a total bar. */
export interface WaterfallItem extends ItemBase {
  kind: 'waterfall'
  x: string
  y: string
  /** Label of the closing total bar, or false for none. Defaults to Total. */
  total?: string | false
  sort?: string
  format?: ValueFormat
  currency?: string
}

/** A donut or pie chart: one slice per value of `label`, sized by `value`. */
export interface PieItem extends ItemBase {
  kind: 'pie'
  label: string
  value: string
  donut?: boolean
  format?: ValueFormat
  currency?: string
}

export interface TableItem extends ItemBase {
  kind: 'table'
  columns?: string[]
  sort?: string
  limit?: number
  /**
   * Columns each row can set from the dashboard, with the values offered,
   * e.g. `{ status: [approved, rejected] }`. The row is found by the
   * Dataset's key and only that cell is rewritten.
   */
  edit?: Record<string, string[]>
  /** Rows where this row expression is true are highlighted, e.g. `weight > 15`. */
  highlight?: string
  /**
   * Columns coloured green when positive and red when negative. Defaults to
   * the currency and percent columns that have a negative value; false for none.
   */
  colour?: string[] | false
}

/** A value read from another source, such as an allowance from a limits Dataset. */
export interface SubQuery {
  source: string
  where?: string
  latest?: string | true
  value: string
}

export interface ProgressItem extends ItemBase {
  kind: 'progress'
  label: string
  value: string
  max: string | SubQuery
  format?: ValueFormat
  currency?: string
  /** Show a radial gauge instead of a bar. */
  gauge?: boolean
  /** A marker on the bar, such as a target to reach before the maximum. */
  target?: string | SubQuery
}

export interface ListItem extends ItemBase {
  kind: 'list'
  label: string
  detail?: string
  sort?: string
  limit?: number
}

export interface TextItem {
  kind: 'text'
  title?: string
  text: string
}

export type DashboardItem =
  | StatItem
  | ChartItem
  | PieItem
  | TreemapItem
  | WaterfallItem
  | TableItem
  | ProgressItem
  | ListItem
  | TextItem

export interface DashboardRow {
  columns: number
  items: DashboardItem[]
  /** Position of this row in the YAML `rows` list. */
  index: number
  /** Position of each item in the row's YAML `items` list, parallel to `items`. */
  itemIndexes: number[]
}

/** A source made by matching rows of two others, as in `{ join: [holdings, targets], on: ticker }`. */
export interface JoinSpec {
  left: string
  right: string
  /** Column in the left source and the right source that must be equal. */
  on: [string, string]
}

export interface DashboardSpec {
  data: Record<string, string>
  /** Sources built from two others, by alias. */
  joins: Record<string, JoinSpec>
  rows: DashboardRow[]
  issues: string[]
}

export const ITEM_KINDS = [
  'stat',
  'area',
  'bar',
  'line',
  'pie',
  'treemap',
  'waterfall',
  'table',
  'progress',
  'list',
  'text',
] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export function isDashboardFrontmatter(frontmatter: Pick<Frontmatter, 'type'>): boolean {
  return frontmatter.type.trim().toLowerCase() === DASHBOARD_TYPE.toLowerCase()
}

export function findDashboardBlock(markdown: string): string | null {
  return locateDashboardBlock(markdown)?.value ?? null
}

/** Finds the dashboard block and its character range in the Markdown body. */
export function locateDashboardBlock(
  markdown: string
): { value: string; start: number; end: number } | null {
  const tree = unified().use(remarkParse).parse(markdown) as Root
  const block = findCode(tree.children)
  const start = block?.position?.start.offset
  const end = block?.position?.end.offset
  if (!block || start === undefined || end === undefined) return null
  return { value: block.value, start, end }
}

export function parseDashboard(markdown: string): DashboardSpec {
  const source = findDashboardBlock(markdown)
  if (source === null) {
    return {
      data: {},
      joins: {},
      rows: [],
      issues: [`Add a fenced \`\`\`${DASHBOARD_FENCE} block to describe this dashboard.`],
    }
  }
  return parseDashboardYaml(source)
}

export function parseDashboardYaml(source: string): DashboardSpec {
  const issues: string[] = []
  let value: unknown
  try {
    value = parseYaml(source)
  } catch (error) {
    return { data: {}, joins: {}, rows: [], issues: [`Dashboard YAML is invalid: ${(error as Error).message}`] }
  }
  if (!isRecord(value)) {
    return { data: {}, joins: {}, rows: [], issues: ['The dashboard block must be a YAML mapping.'] }
  }

  const data: Record<string, string> = {}
  const joins: Record<string, JoinSpec> = {}
  if (isRecord(value.data)) {
    for (const [alias, path] of Object.entries(value.data)) {
      if (typeof path === 'string' && path.trim()) data[alias] = path.trim()
      else if (isRecord(path) && path.join !== undefined) {
        const join = parseJoin(alias, path, issues)
        if (join) joins[alias] = join
      } else issues.push(`data.${alias} must be a path to a Dataset file.`)
    }
    for (const [alias, join] of Object.entries(joins)) {
      for (const side of [join.left, join.right]) {
        if (!(side in data)) issues.push(`data.${alias} joins ${side}, which is not a Dataset listed under data.`)
      }
    }
  } else if (value.data !== undefined) {
    issues.push('data must map names to Dataset files, for example balances: balances.md.')
  }

  const rows: DashboardRow[] = []
  const rawRows = Array.isArray(value.rows) ? value.rows : []
  if (!Array.isArray(value.rows)) issues.push('Add a rows list to lay out the dashboard.')

  // Items may read a join as well as a plain source.
  const known: Record<string, string> = { ...data, ...Object.fromEntries(Object.keys(joins).map((alias) => [alias, alias])) }
  rawRows.forEach((rawRow, rowIndex) => {
    const row = isRecord(rawRow) ? rawRow : {}
    const rawItems = Array.isArray(row.items) ? row.items : Array.isArray(rawRow) ? rawRow : []
    const items: DashboardItem[] = []
    const itemIndexes: number[] = []
    rawItems.forEach((rawItem, itemIndex) => {
      const item = parseItem(rawItem, `rows[${rowIndex}].items[${itemIndex}]`, known, issues)
      if (!item) return
      items.push(item)
      itemIndexes.push(itemIndex)
    })
    const requested = typeof row.columns === 'number' ? Math.round(row.columns) : items.length
    rows.push({ columns: Math.min(4, Math.max(1, requested || 1)), items, index: rowIndex, itemIndexes })
  })

  return { data, joins, rows, issues }
}

export function parseItem(
  raw: unknown,
  where: string,
  data: Record<string, string>,
  issues: string[]
): DashboardItem | null {
  if (!isRecord(raw)) {
    issues.push(`${where} must be a component such as stat, area or table.`)
    return null
  }
  const kind = Object.keys(raw).find((key) => (ITEM_KINDS as readonly string[]).includes(key))
  if (!kind) {
    issues.push(`${where} needs one of ${ITEM_KINDS.join(', ')}.`)
    return null
  }
  const body = raw[kind]
  if (kind === 'text') {
    if (typeof body === 'string') return { kind: 'text', text: body }
    if (isRecord(body) && typeof body.text === 'string') {
      return { kind: 'text', text: body.text, title: optionalString(body.title) }
    }
    issues.push(`${where}: text needs some text.`)
    return null
  }
  if (!isRecord(body)) {
    issues.push(`${where}: ${kind} needs settings such as source.`)
    return null
  }

  const base = {
    title: optionalString(body.title),
    description: optionalString(body.description),
    source: optionalString(body.source),
    where: optionalString(body.where),
    latest: body.latest === true ? (true as const) : optionalString(body.latest),
  }
  if (!base.source) {
    issues.push(`${where}: ${kind} needs a source.`)
    return null
  }
  if (!(base.source in data)) {
    issues.push(`${where}: source "${base.source}" is not listed under data.`)
  }

  const format = optionalString(body.format) as ValueFormat | undefined
  const currency = optionalString(body.currency)?.toUpperCase()
  const require = (field: string): string | null => {
    const value = body[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
    issues.push(`${where}: ${kind} needs ${field}.`)
    return null
  }

  switch (kind) {
    case 'stat': {
      const value = require('value')
      if (!value) return null
      return {
        ...base,
        kind,
        label: optionalString(body.label) ?? base.title ?? 'Value',
        value,
        format,
        currency,
        trend: body.trend === true,
        sparkline: body.sparkline === true,
      }
    }
    case 'area':
    case 'bar':
    case 'line': {
      const x = require('x')
      const measures = Array.isArray(body.y) ? parseMeasures(body.y, where, issues) : undefined
      const y = measures ? measures[0]?.value ?? null : require('y')
      if (!x || !y) return null
      if (measures && body.series !== undefined) {
        issues.push(`${where}: use series or a list of y values, not both.`)
      }
      return {
        ...base,
        kind,
        x,
        y,
        measures: measures && measures.length > 1 ? measures : undefined,
        series: measures ? undefined : optionalString(body.series),
        stacked: body.stacked === true,
        snapshots: body.snapshots === true,
        ranges: Array.isArray(body.ranges) ? body.ranges.map(String) : undefined,
        format,
        currency,
        curve: CHART_CURVES.find((curve) => curve === body.curve),
        horizontal: body.horizontal === true,
        rules: parseRules(body.rules, where, issues),
        rebase: body.rebase === true || undefined,
        highlight: optionalString(body.highlight),
        colour: colourSetting(body) === false ? false : undefined,
      }
    }
    case 'treemap': {
      const label = require('label')
      const value = require('value')
      if (!label || !value) return null
      return { ...base, kind, label, value, group: optionalString(body.group), format, currency }
    }
    case 'waterfall': {
      const x = require('x')
      const y = require('y')
      if (!x || !y) return null
      return {
        ...base,
        kind,
        x,
        y,
        total: body.total === false ? false : optionalString(body.total),
        sort: optionalString(body.sort),
        format,
        currency,
      }
    }
    case 'pie': {
      const label = require('label')
      const value = require('value')
      if (!label || !value) return null
      return { ...base, kind, label, value, donut: body.donut !== false, format, currency }
    }
    case 'table':
      return {
        ...base,
        kind,
        columns: Array.isArray(body.columns) ? body.columns.map(String) : undefined,
        sort: optionalString(body.sort),
        limit: typeof body.limit === 'number' ? body.limit : undefined,
        edit: parseTableEdit(body.edit, where, issues),
        highlight: optionalString(body.highlight),
        colour: parseColourColumns(colourSetting(body), where, issues),
      }
    case 'progress': {
      const value = require('value')
      const max = isRecord(body.max) ? parseSubQuery(body.max, `${where}.max`, data, issues) : require('max')
      if (!value || !max) return null
      const target = isRecord(body.target)
        ? parseSubQuery(body.target, `${where}.target`, data, issues) ?? undefined
        : typeof body.target === 'number'
          ? String(body.target)
          : optionalString(body.target)
      return {
        ...base,
        kind,
        label: optionalString(body.label) ?? base.title ?? 'Progress',
        value,
        max,
        format,
        currency,
        gauge: body.gauge === true,
        target,
      }
    }
    case 'list': {
      const label = require('label')
      if (!label) return null
      return {
        ...base,
        kind,
        label,
        detail: optionalString(body.detail),
        sort: optionalString(body.sort),
        limit: typeof body.limit === 'number' ? body.limit : undefined,
      }
    }
  }
  return null
}

function parseSubQuery(
  raw: Record<string, unknown>,
  where: string,
  data: Record<string, string>,
  issues: string[]
): SubQuery | null {
  const source = optionalString(raw.source)
  const value = optionalString(raw.value)
  if (!source || !value) {
    issues.push(`${where} needs a source and a value.`)
    return null
  }
  if (!(source in data)) issues.push(`${where}: source "${source}" is not listed under data.`)
  return {
    source,
    value,
    where: optionalString(raw.where),
    latest: raw.latest === true ? true : optionalString(raw.latest),
  }
}

function parseMeasures(raw: unknown[], where: string, issues: string[]): ChartMeasure[] {
  const measures: ChartMeasure[] = []
  raw.forEach((entry, index) => {
    if (typeof entry === 'string' && entry.trim()) measures.push({ value: entry.trim() })
    else if (isRecord(entry) && optionalString(entry.value)) {
      measures.push({ value: optionalString(entry.value)!, label: optionalString(entry.label) })
    } else issues.push(`${where}: y[${index}] must be a value such as sum(amount), or { value, label }.`)
  })
  if (measures.length === 0) issues.push(`${where}: y must list at least one value.`)
  return measures
}

function parseRules(raw: unknown, where: string, issues: string[]): ChartRule[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) {
    issues.push(`${where}: rules must be a list, such as [{ y: 15000, label: Target }].`)
    return undefined
  }
  const rules: ChartRule[] = []
  raw.forEach((entry, index) => {
    const at = `${where}.rules[${index}]`
    if (!isRecord(entry)) {
      issues.push(`${at} must be a mapping such as { y: 15000, label: Target }.`)
      return
    }
    const label = optionalString(entry.label)
    const text = (value: unknown) => (typeof value === 'number' ? String(value) : optionalString(value))
    if (entry.x !== undefined) {
      const value = text(entry.x)
      if (value) rules.push({ axis: 'x', value, label })
      else issues.push(`${at}: x must be a value along the bottom, such as a date.`)
    } else if (entry.from !== undefined || entry.to !== undefined) {
      const from = text(entry.from)
      const to = text(entry.to)
      if (from && to) rules.push({ axis: 'y', from, to, label })
      else issues.push(`${at}: a band needs both from and to.`)
    } else if (entry.y !== undefined) {
      const value = text(entry.y)
      if (value) rules.push({ axis: 'y', value, label })
      else issues.push(`${at}: y must be a number or a value such as avg(amount).`)
    } else issues.push(`${at} needs y, x, or from and to.`)
  })
  return rules.length > 0 ? rules : undefined
}

function parseJoin(alias: string, raw: Record<string, unknown>, issues: string[]): JoinSpec | null {
  const sides = Array.isArray(raw.join) ? raw.join.map(String) : []
  const on = Array.isArray(raw.on) ? raw.on.map(String) : typeof raw.on === 'string' ? [raw.on, raw.on] : []
  if (sides.length !== 2) {
    issues.push(`data.${alias}: join must name two sources, such as join: [holdings, targets].`)
    return null
  }
  if (on.length !== 2 || !on[0].trim() || !on[1].trim()) {
    issues.push(`data.${alias}: on must name the column to match, such as on: ticker or on: [ticker, symbol].`)
    return null
  }
  return { left: sides[0].trim(), right: sides[1].trim(), on: [on[0].trim(), on[1].trim()] }
}

/** `colour`, or the American `color`, as written. */
function colourSetting(body: Record<string, unknown>): unknown {
  return body.colour !== undefined ? body.colour : body.color
}

function parseColourColumns(value: unknown, where: string, issues: string[]): string[] | false | undefined {
  if (value === undefined || value === null || value === true) return undefined
  if (value === false) return false
  if (Array.isArray(value)) return value.map(String)
  issues.push(`${where}: colour must list columns, such as [unrealised_pl, return], or be false.`)
  return undefined
}

function findCode(nodes: RootContent[]): Code | null {
  for (const node of nodes) {
    if (node.type === 'code' && node.lang === DASHBOARD_FENCE) return node
    if ('children' in node && Array.isArray(node.children)) {
      const nested = findCode(node.children as RootContent[])
      if (nested) return nested
    }
  }
  return null
}

function parseTableEdit(
  value: unknown,
  where: string,
  issues: string[]
): Record<string, string[]> | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) {
    issues.push(`${where}: edit must map a column to the values it can be set to.`)
    return undefined
  }
  const out: Record<string, string[]> = {}
  for (const [column, values] of Object.entries(value)) {
    if (!Array.isArray(values) || values.length === 0) {
      issues.push(`${where}: edit.${column} must list the values it can be set to.`)
      continue
    }
    out[column] = values.map(String)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

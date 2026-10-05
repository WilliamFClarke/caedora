import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Code, Root, RootContent } from 'mdast'
import { parse as parseYaml } from 'yaml'
import type { Frontmatter } from '../frontmatter'

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
}

export interface AreaItem extends ItemBase {
  kind: 'area'
  x: string
  y: string
  series?: string
  stacked?: boolean
  /** Rebuild every point as a snapshot of the latest row per key at that date. */
  snapshots?: boolean
  ranges?: string[]
  format?: ValueFormat
  currency?: string
}

export interface TableItem extends ItemBase {
  kind: 'table'
  columns?: string[]
  sort?: string
  limit?: number
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

export type DashboardItem = StatItem | AreaItem | TableItem | ProgressItem | ListItem | TextItem

export interface DashboardRow {
  columns: number
  items: DashboardItem[]
  /** Position of this row in the YAML `rows` list. */
  index: number
  /** Position of each item in the row's YAML `items` list, parallel to `items`. */
  itemIndexes: number[]
}

export interface DashboardSpec {
  data: Record<string, string>
  rows: DashboardRow[]
  issues: string[]
}

export const ITEM_KINDS = ['stat', 'area', 'table', 'progress', 'list', 'text'] as const

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
    return { data: {}, rows: [], issues: [`Dashboard YAML is invalid: ${(error as Error).message}`] }
  }
  if (!isRecord(value)) {
    return { data: {}, rows: [], issues: ['The dashboard block must be a YAML mapping.'] }
  }

  const data: Record<string, string> = {}
  if (isRecord(value.data)) {
    for (const [alias, path] of Object.entries(value.data)) {
      if (typeof path === 'string' && path.trim()) data[alias] = path.trim()
      else issues.push(`data.${alias} must be a path to a Dataset file.`)
    }
  } else if (value.data !== undefined) {
    issues.push('data must map names to Dataset files, for example balances: balances.md.')
  }

  const rows: DashboardRow[] = []
  const rawRows = Array.isArray(value.rows) ? value.rows : []
  if (!Array.isArray(value.rows)) issues.push('Add a rows list to lay out the dashboard.')

  rawRows.forEach((rawRow, rowIndex) => {
    const row = isRecord(rawRow) ? rawRow : {}
    const rawItems = Array.isArray(row.items) ? row.items : Array.isArray(rawRow) ? rawRow : []
    const items: DashboardItem[] = []
    const itemIndexes: number[] = []
    rawItems.forEach((rawItem, itemIndex) => {
      const item = parseItem(rawItem, `rows[${rowIndex}].items[${itemIndex}]`, data, issues)
      if (!item) return
      items.push(item)
      itemIndexes.push(itemIndex)
    })
    const requested = typeof row.columns === 'number' ? Math.round(row.columns) : items.length
    rows.push({ columns: Math.min(4, Math.max(1, requested || 1)), items, index: rowIndex, itemIndexes })
  })

  return { data, rows, issues }
}

function parseItem(
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
      }
    }
    case 'area': {
      const x = require('x')
      const y = require('y')
      if (!x || !y) return null
      return {
        ...base,
        kind,
        x,
        y,
        series: optionalString(body.series),
        stacked: body.stacked === true,
        snapshots: body.snapshots === true,
        ranges: Array.isArray(body.ranges) ? body.ranges.map(String) : undefined,
        format,
        currency,
      }
    }
    case 'table':
      return {
        ...base,
        kind,
        columns: Array.isArray(body.columns) ? body.columns.map(String) : undefined,
        sort: optionalString(body.sort),
        limit: typeof body.limit === 'number' ? body.limit : undefined,
      }
    case 'progress': {
      const value = require('value')
      const max = isRecord(body.max) ? parseSubQuery(body.max, `${where}.max`, data, issues) : require('max')
      if (!value || !max) return null
      return {
        ...base,
        kind,
        label: optionalString(body.label) ?? base.title ?? 'Progress',
        value,
        max,
        format,
        currency,
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

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

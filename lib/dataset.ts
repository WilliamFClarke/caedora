import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { PhrasingContent, Root, RootContent, Table } from 'mdast'
import { parseFrontmatter, type Frontmatter } from './frontmatter'

/**
 * Datasets are ordinary OKF concepts with `type: Dataset`. The records live in
 * the first GFM table of the body, and an optional producer-defined `dataset`
 * frontmatter block describes the columns. Without that block the schema is
 * inferred from the table so plain Markdown tables still work.
 */

export const DATASET_TYPE = 'Dataset'

export const DATASET_COLUMN_TYPES = [
  'text',
  'number',
  'currency',
  'percent',
  'date',
  'boolean',
  'enum',
  'ref',
] as const

export type DatasetColumnType = (typeof DATASET_COLUMN_TYPES)[number]

export interface DatasetColumn {
  /** Normalised identifier used by dashboards, e.g. `tax_year`. */
  name: string
  type: DatasetColumnType
  /** Header text as written in the table, when it differs from `name`. */
  label?: string
  /** ISO 4217 code for currency columns. Defaults to GBP. */
  currency?: string
  /** Allowed values for enum columns. */
  values?: string[]
  /** Relative path of the Dataset a ref column points at. */
  to?: string
  required?: boolean
}

export interface DatasetSchema {
  key: string[]
  columns: DatasetColumn[]
}

export type DatasetValue = string | number | boolean | null
export type DatasetRow = Record<string, DatasetValue>

export interface DatasetIssue {
  /** 1-based data row number, excluding the header row. */
  row?: number
  column?: string
  message: string
}

export interface Dataset {
  path: string
  title: string
  schema: DatasetSchema
  /** True when no `dataset` frontmatter block was present. */
  inferred: boolean
  rows: DatasetRow[]
  issues: DatasetIssue[]
}

export interface MarkdownTable {
  headers: string[]
  rows: string[][]
}

export function isDatasetFrontmatter(frontmatter: Pick<Frontmatter, 'type'>): boolean {
  return frontmatter.type.trim().toLowerCase() === DATASET_TYPE.toLowerCase()
}

export function normaliseColumnName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function parseDataset(path: string, raw: string): Dataset {
  const parsed = parseFrontmatter(raw)
  const title = parsed.frontmatter.title || path.split('/').pop()?.replace(/\.md$/i, '') || path
  const issues: DatasetIssue[] = []
  const table = extractFirstTable(parsed.body)

  const declared = parseDatasetSchema(parsed.frontmatter.extra.dataset)
  issues.push(...declared.issues)

  if (!table) {
    issues.push({ message: 'Datasets need a Markdown table in the body.' })
    return {
      path,
      title,
      schema: declared.schema ?? { key: [], columns: [] },
      inferred: declared.schema === null,
      rows: [],
      issues,
    }
  }

  const schema = declared.schema ?? inferSchema(table)
  const columnForHeader = matchHeaders(schema, table.headers, issues)

  const rows: DatasetRow[] = []
  table.rows.forEach((cells, index) => {
    const row: DatasetRow = {}
    for (const column of schema.columns) row[column.name] = null
    cells.forEach((cell, cellIndex) => {
      const column = columnForHeader[cellIndex]
      if (!column) return
      const result = coerceValue(cell, column)
      row[column.name] = result.value
      if (result.error) {
        issues.push({ row: index + 1, column: column.name, message: result.error })
      }
    })
    for (const column of schema.columns) {
      if (column.required && row[column.name] === null) {
        issues.push({ row: index + 1, column: column.name, message: `${column.name} is required.` })
      }
    }
    rows.push(row)
  })

  if (schema.key.length > 0) {
    const seen = new Set<string>()
    rows.forEach((row, index) => {
      const key = JSON.stringify(schema.key.map((name) => row[name]))
      if (seen.has(key)) {
        issues.push({ row: index + 1, message: `Duplicate key (${schema.key.join(', ')}).` })
      }
      seen.add(key)
    })
  }

  return { path, title, schema, inferred: declared.schema === null, rows, issues }
}

export function parseDatasetSchema(value: unknown): {
  schema: DatasetSchema | null
  issues: DatasetIssue[]
} {
  if (value === undefined || value === null) return { schema: null, issues: [] }
  if (!isRecord(value)) {
    return { schema: null, issues: [{ message: 'dataset must be a mapping with a columns field.' }] }
  }

  const issues: DatasetIssue[] = []
  const columns: DatasetColumn[] = []
  const rawColumns = value.columns

  if (isRecord(rawColumns)) {
    for (const [name, spec] of Object.entries(rawColumns)) {
      const column = parseColumn(name, spec, issues)
      if (column) columns.push(column)
    }
  } else if (Array.isArray(rawColumns)) {
    for (const spec of rawColumns) {
      if (!isRecord(spec) || typeof spec.name !== 'string') {
        issues.push({ message: 'Each dataset column needs a name.' })
        continue
      }
      const column = parseColumn(spec.name, spec, issues)
      if (column) columns.push(column)
    }
  } else {
    issues.push({ message: 'dataset.columns must list the table columns.' })
    return { schema: null, issues }
  }

  const names = new Set(columns.map((column) => column.name))
  const key = (Array.isArray(value.key) ? value.key : typeof value.key === 'string' ? [value.key] : [])
    .filter((item): item is string => typeof item === 'string')
    .map(normaliseColumnName)
  for (const name of key) {
    if (!names.has(name)) issues.push({ column: name, message: `Key column ${name} is not defined.` })
  }

  return { schema: { key: key.filter((name) => names.has(name)), columns }, issues }
}

export function extractFirstTable(markdown: string): MarkdownTable | null {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root
  const table = findTable(tree.children)
  if (!table || table.children.length === 0) return null
  const [header, ...body] = table.children
  const headers = header.children.map((cell) => cellText(cell.children))
  const rows = body
    .map((row) => row.children.map((cell) => cellText(cell.children)))
    .filter((cells) => cells.some((cell) => cell.length > 0))
  return { headers, rows }
}

export function inferSchema(table: MarkdownTable): DatasetSchema {
  const columns = table.headers.map((header, index): DatasetColumn => {
    const name = normaliseColumnName(header) || `column_${index + 1}`
    const values = table.rows.map((row) => row[index] ?? '').filter((cell) => cell.length > 0)
    const type = inferColumnType(values)
    const column: DatasetColumn = { name, type }
    if (header.trim() !== name) column.label = header.trim()
    if (type === 'currency') column.currency = currencyCode(values[0])
    return column
  })
  return { key: [], columns }
}

export function coerceValue(
  raw: string,
  column: DatasetColumn
): { value: DatasetValue; error?: string } {
  const text = raw.trim()
  if (!text) return { value: null }

  switch (column.type) {
    case 'number':
    case 'currency':
    case 'percent': {
      const value = parseNumber(text)
      return value === null
        ? { value: text, error: `${column.name} should be a number, found "${text}".` }
        : { value }
    }
    case 'date':
      return isIsoDate(text)
        ? { value: text }
        : { value: text, error: `${column.name} should be a YYYY-MM-DD date, found "${text}".` }
    case 'boolean': {
      const lowered = text.toLowerCase()
      if (TRUE_VALUES.has(lowered)) return { value: true }
      if (FALSE_VALUES.has(lowered)) return { value: false }
      return { value: text, error: `${column.name} should be yes or no, found "${text}".` }
    }
    case 'enum': {
      const match = column.values?.find((option) => option.toLowerCase() === text.toLowerCase())
      if (match !== undefined) return { value: match }
      return column.values?.length
        ? { value: text, error: `${column.name} should be one of ${column.values.join(', ')}, found "${text}".` }
        : { value: text }
    }
    case 'ref':
    case 'text':
      return { value: text }
  }
}

export function parseNumber(text: string): number | null {
  let value = text.trim()
  let negative = false
  if (/^\(.*\)$/.test(value)) {
    negative = true
    value = value.slice(1, -1)
  }
  value = value.replace(/[£$€\s,%]/g, '').replace(/^(GBP|USD|EUR)/i, '')
  if (value.startsWith('-')) {
    negative = !negative
    value = value.slice(1)
  } else if (value.startsWith('+')) {
    value = value.slice(1)
  }
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(value)) return null
  const number = Number(value)
  return negative ? -number : number
}

export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text)
}

/** Validation hook for the OKF indicator. Dataset problems are warnings, never errors. */
export function validateDatasetDocument(path: string, raw: string): DatasetIssue[] {
  return parseDataset(path, raw).issues
}

export function describeDatasetIssue(issue: DatasetIssue): string {
  return issue.row ? `Row ${issue.row}: ${issue.message}` : issue.message
}

const TRUE_VALUES = new Set(['yes', 'y', 'true', '1', '✓', '✔', 'x'])
const FALSE_VALUES = new Set(['no', 'n', 'false', '0', ''])

function parseColumn(name: string, spec: unknown, issues: DatasetIssue[]): DatasetColumn | null {
  const normalised = normaliseColumnName(name)
  if (!normalised) {
    issues.push({ message: `Column "${name}" needs a name made of letters or numbers.` })
    return null
  }
  const record = isRecord(spec) ? spec : typeof spec === 'string' ? { type: spec } : {}
  const type = typeof record.type === 'string' ? record.type.toLowerCase() : 'text'
  if (!(DATASET_COLUMN_TYPES as readonly string[]).includes(type)) {
    issues.push({
      column: normalised,
      message: `Column ${normalised} has unknown type "${type}". Use one of ${DATASET_COLUMN_TYPES.join(', ')}.`,
    })
    return null
  }
  const column: DatasetColumn = { name: normalised, type: type as DatasetColumnType }
  if (typeof record.label === 'string') column.label = record.label
  else if (name !== normalised) column.label = name
  if (column.type === 'currency') {
    column.currency = typeof record.currency === 'string' ? record.currency.toUpperCase() : 'GBP'
  }
  if (column.type === 'enum') {
    column.values = Array.isArray(record.values) ? record.values.map(String) : []
  }
  if (column.type === 'ref') {
    if (typeof record.to === 'string') column.to = record.to
    else issues.push({ column: normalised, message: `Ref column ${normalised} needs a "to" path.` })
  }
  if (record.required === true) column.required = true
  return column
}

function matchHeaders(
  schema: DatasetSchema,
  headers: string[],
  issues: DatasetIssue[]
): Array<DatasetColumn | null> {
  const byName = new Map<string, DatasetColumn>()
  for (const column of schema.columns) {
    byName.set(column.name, column)
    if (column.label) byName.set(normaliseColumnName(column.label), column)
  }
  const matched = headers.map((header) => byName.get(normaliseColumnName(header)) ?? null)
  headers.forEach((header, index) => {
    if (!matched[index] && header.trim()) {
      issues.push({ column: header, message: `Table column "${header}" is not in the dataset schema.` })
    }
  })
  for (const column of schema.columns) {
    if (!matched.includes(column)) {
      issues.push({ column: column.name, message: `Schema column ${column.name} is missing from the table.` })
    }
  }
  return matched
}

function inferColumnType(values: string[]): DatasetColumnType {
  if (values.length === 0) return 'text'
  if (values.every(isIsoDate)) return 'date'
  if (values.every((value) => /^[(-]?\s*(£|\$|€|GBP|USD|EUR)/i.test(value) && parseNumber(value) !== null)) {
    return 'currency'
  }
  if (values.every((value) => value.endsWith('%') && parseNumber(value) !== null)) return 'percent'
  if (values.every((value) => parseNumber(value) !== null)) return 'number'
  if (values.every((value) => TRUE_VALUES.has(value.toLowerCase()) || FALSE_VALUES.has(value.toLowerCase()))) {
    return values.some((value) => /^(yes|no|true|false|y|n)$/i.test(value)) ? 'boolean' : 'text'
  }
  return 'text'
}

function currencyCode(sample: string | undefined): string {
  if (!sample) return 'GBP'
  if (sample.includes('$') || /USD/i.test(sample)) return 'USD'
  if (sample.includes('€') || /EUR/i.test(sample)) return 'EUR'
  return 'GBP'
}

function findTable(nodes: RootContent[]): Table | null {
  for (const node of nodes) {
    if (node.type === 'table') return node
    if ('children' in node && Array.isArray(node.children)) {
      const nested = findTable(node.children as RootContent[])
      if (nested) return nested
    }
  }
  return null
}

function cellText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      if (node.type === 'break') return ' '
      if ('value' in node && typeof node.value === 'string') return node.value
      if ('children' in node && Array.isArray(node.children)) {
        return cellText(node.children as PhrasingContent[])
      }
      return ''
    })
    .join('')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

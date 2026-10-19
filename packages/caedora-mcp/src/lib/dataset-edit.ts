import {
  coerceValue,
  findFirstTable,
  normaliseColumnName,
  parseDataset,
  type Dataset,
  type DatasetColumn,
  type DatasetValue,
} from './dataset.js'
import { parseFrontmatter } from './frontmatter.js'

/**
 * Changes one cell of a Dataset's table in place. The row is found by the
 * Dataset's `key`, and only the characters of that one cell change: the rest
 * of the file, the table's spacing and the frontmatter are left exactly as
 * they were, so the commit shows a one cell diff.
 */

export class DatasetEditError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatasetEditError'
  }
}

export interface CellEdit {
  /** The row's key column values, as the dashboard read them. */
  key: Record<string, DatasetValue>
  column: string
  value: string
}

export function setDatasetCell(path: string, raw: string, edit: CellEdit): string {
  const dataset = parseDataset(path, raw)
  const row = findRow(dataset, edit.key)
  const column = dataset.schema.columns.find((item) => item.name === edit.column)
  if (!column) throw new DatasetEditError(`${dataset.title} has no ${edit.column} column.`)
  if (column.type === 'enum' && column.values?.length && !column.values.includes(edit.value)) {
    throw new DatasetEditError(`${edit.value} is not one of the ${column.name} values in ${dataset.title}.`)
  }
  if (/[|\n\r]/.test(edit.value)) {
    throw new DatasetEditError('A table cell cannot contain a pipe or a line break.')
  }

  const layout = layoutTable(raw, dataset)
  writeCell(layout, layout.dataLines[row], columnIndex(layout, column), edit.value)
  return joinLayout(layout)
}

/** Where a Dataset's table sits in the file, line by line. */
interface TableLayout {
  /** Everything before the body, kept byte for byte. */
  prefix: string
  lines: string[]
  /** 0-based index of the header line. */
  header: number
  /** 0-based index of the last line of the table. */
  last: number
  /** 0-based line of each data row, in the order parseDataset reads them. */
  dataLines: number[]
}

function layoutTable(raw: string, dataset: Dataset): TableLayout {
  const { body } = parseFrontmatter(raw)
  if (!raw.endsWith(body)) throw new DatasetEditError(`The table in ${dataset.title} could not be located.`)
  const table = findFirstTable(body)
  const start = table?.position?.start.line
  const end = table?.position?.end.line
  if (!start || !end) throw new DatasetEditError(`The table in ${dataset.title} could not be located.`)

  const lines = body.split('\n')
  // Data rows as parseDataset counts them: blank rows are skipped.
  const dataLines: number[] = []
  for (let line = start + 1; line < end; line++) {
    const text = lines[line]
    if (cellSpans(text).some(([from, to]) => text.slice(from, to).trim().length > 0)) dataLines.push(line)
  }
  if (dataLines.length !== dataset.rows.length) {
    throw new DatasetEditError(`The table in ${dataset.title} could not be matched to its rows.`)
  }
  return { prefix: raw.slice(0, raw.length - body.length), lines, header: start - 1, last: end - 1, dataLines }
}

function joinLayout(layout: TableLayout): string {
  return layout.prefix + layout.lines.join('\n')
}

function columnIndex(layout: TableLayout, column: DatasetColumn): number {
  const header = layout.lines[layout.header]
  const names = new Set([column.name, ...(column.label ? [normaliseColumnName(column.label)] : [])])
  const index = cellSpans(header).findIndex(([from, to]) => names.has(normaliseColumnName(header.slice(from, to))))
  if (index < 0) throw new DatasetEditError(`The ${column.name} column is missing from the table.`)
  return index
}

function writeCell(layout: TableLayout, line: number, index: number, value: string) {
  const text = layout.lines[line]
  const span = cellSpans(text)[index]
  if (!span) throw new DatasetEditError(`That row has no cell for column ${index + 1}.`)
  layout.lines[line] = text.slice(0, span[0]) + replaceCell(text.slice(span[0], span[1]), value) + text.slice(span[1])
}

/** The index of the one row whose key matches, or an error explaining why not. */
export function findRow(dataset: Dataset, key: Record<string, DatasetValue>): number {
  if (dataset.schema.key.length === 0) {
    throw new DatasetEditError(
      `${dataset.title} has no key, so its rows cannot be told apart. Add key to its dataset frontmatter to edit rows here.`
    )
  }
  const matches = dataset.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => dataset.schema.key.every((name) => row[name] === key[name]))
  if (matches.length === 0) throw new DatasetEditError(`That row is no longer in ${dataset.title}.`)
  if (matches.length > 1) {
    throw new DatasetEditError(
      `More than one row in ${dataset.title} has that ${dataset.schema.key.join(', ')}, so none was changed.`
    )
  }
  return matches[0].index
}

/** "Set status to approved for buy GOOGL_US_EQ on 2026-10-19". */
export function describeCellEdit(dataset: Dataset, edit: CellEdit): string {
  return `Set ${edit.column} to ${edit.value} for ${describeKey(dataset, edit.key)}`
}

/** A row's key in words: choices first, then names, then dates, as in "buy GOOGL_US_EQ on 2026-10-19". */
export function describeKey(dataset: Dataset, key: Record<string, DatasetValue>): string {
  const typeOf = (name: string) => dataset.schema.columns.find((column) => column.name === name)?.type
  const rank = (name: string) => (typeOf(name) === 'enum' ? 0 : typeOf(name) === 'date' ? 2 : 1)
  const ordered = [...dataset.schema.key].sort((a, b) => rank(a) - rank(b))
  const words = ordered.filter((name) => rank(name) < 2).map((name) => String(key[name] ?? ''))
  const dates = ordered.filter((name) => rank(name) === 2).map((name) => String(key[name] ?? ''))
  return [words.join(' '), dates.length ? `on ${dates.join(' ')}` : ''].filter(Boolean).join(' ')
}

/** Keeps the cell's padding, so an aligned table stays aligned where the value fits. */
function replaceCell(cell: string, value: string): string {
  const leading = cell.match(/^\s*/)![0]
  const trailing = cell.length > leading.length ? cell.match(/\s*$/)![0] : ''
  const next = `${leading}${value}`
  if (!trailing) return next
  return next + ' '.repeat(Math.max(1, cell.length - next.length))
}

/** [start, end) of each cell's text in a table line, between unescaped pipes outside code. */
export function cellSpans(line: string): Array<[number, number]> {
  const pipes: number[] = []
  let code = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '\\') {
      i++
      continue
    }
    if (char === '`') code = !code
    else if (char === '|' && !code) pipes.push(i)
  }
  const edges = [-1, ...pipes, line.length]
  const spans: Array<[number, number]> = []
  for (let i = 0; i < edges.length - 1; i++) spans.push([edges[i] + 1, edges[i + 1]])
  // Outer pipes are optional in GFM; drop the empty edges they leave.
  if (spans.length > 1 && line.slice(...spans[0]).trim() === '' && pipes.length > 0 && line.trimStart().startsWith('|')) {
    spans.shift()
  }
  if (spans.length > 1 && pipes.length > 0 && line.trimEnd().endsWith('|') && line.slice(...spans[spans.length - 1]).trim() === '') {
    spans.pop()
  }
  return spans
}

/** A row as an agent or script supplies it, by column name. */
export type DatasetInput = Record<string, DatasetValue>

/**
 * Sets several cells of the row whose key matches. Key columns cannot be
 * changed this way, since the row would no longer be the one asked for.
 */
export function updateDatasetRow(
  path: string,
  raw: string,
  key: DatasetInput,
  fields: DatasetInput
): string {
  const dataset = parseDataset(path, raw)
  const row = findRow(dataset, normaliseKey(dataset, key))
  const layout = layoutTable(raw, dataset)
  for (const [name, value] of Object.entries(fields)) {
    const column = requireColumn(dataset, name)
    if (dataset.schema.key.includes(column.name)) {
      throw new DatasetEditError(`${column.name} is part of the key of ${dataset.title}, so it cannot be changed here.`)
    }
    const text = formatCell(value, column)
    // 45 and 45.00 are the same amount, so the cell keeps the way it is written.
    if (coerceValue(text.replace(/\\\|/g, '|'), column).value === dataset.rows[row][column.name]) continue
    writeCell(layout, layout.dataLines[row], columnIndex(layout, column), text)
  }
  return joinLayout(layout)
}

/**
 * Updates the rows whose key already exists and appends the rest to the end
 * of the table. Only the cells named in each input row are written, so other
 * columns of an existing row keep their values.
 */
export function upsertDatasetRows(
  path: string,
  raw: string,
  rows: DatasetInput[]
): { content: string; inserted: number; updated: number } {
  const dataset = parseDataset(path, raw)
  const keyColumns = keyOf(dataset)
  const seen = new Set<string>()
  for (const input of rows) {
    const id = JSON.stringify(keyColumns.map((name) => normaliseKey(dataset, input)[name]))
    if (seen.has(id)) throw new DatasetEditError(`Two of the rows given have the same ${keyColumns.join(', ')}.`)
    seen.add(id)
  }

  let content = raw
  let inserted = 0
  let updated = 0
  for (const input of rows) {
    const current = parseDataset(path, content)
    const key = normaliseKey(current, input)
    const exists = current.rows.some((row) => keyColumns.every((name) => row[name] === key[name]))
    if (exists) {
      const fields = Object.fromEntries(
        Object.entries(input).filter(([name]) => !keyColumns.includes(normaliseColumnName(name)))
      )
      const next = updateDatasetRow(path, content, key, fields)
      if (next !== content) updated++
      content = next
    } else {
      content = appendRow(current, content, input)
      inserted++
    }
  }
  return { content, inserted, updated }
}

/**
 * Writes `generated: { by, at }` into the frontmatter, keeping the style the
 * file already uses and leaving every other line alone.
 */
export function stampGenerated(raw: string, stamp: { by: string; at: string }): string {
  const lines = raw.split('\n')
  if (lines[0]?.trim() !== '---') return raw
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (close < 0) return raw
  const by = yamlScalar(stamp.by)
  const at = yamlScalar(stamp.at)
  const start = lines.findIndex((line, index) => index > 0 && index < close && /^generated\s*:/.test(line))
  if (start < 0) {
    lines.splice(close, 0, `generated: { by: ${by}, at: ${at} }`)
    return lines.join('\n')
  }
  let end = start + 1
  while (end < close && /^\s/.test(lines[end])) end++
  const block = /^generated\s*:\s*$/.test(lines[start])
  const indent = block ? lines[start + 1]?.match(/^\s+/)?.[0] ?? '  ' : ''
  const replacement = block
    ? ['generated:', `${indent}by: ${by}`, `${indent}at: ${at}`]
    : [`generated: { by: ${by}, at: ${at} }`]
  lines.splice(start, end - start, ...replacement)
  return lines.join('\n')
}

/** The text a value is written as in a table cell, checked against its column. */
export function formatCell(value: DatasetValue, column: DatasetColumn): string {
  const text =
    value === null
      ? ''
      : typeof value === 'boolean'
        ? value ? 'yes' : 'no'
        : String(value)
  if (/[\n\r]/.test(text)) throw new DatasetEditError(`${column.name} cannot contain a line break.`)
  if (!text && column.required) throw new DatasetEditError(`${column.name} is required.`)
  const checked = coerceValue(text, column)
  if (checked.error) throw new DatasetEditError(checked.error)
  // A pipe would end the cell, so it is escaped as GFM allows.
  return text.replace(/\|/g, '\\|')
}

function appendRow(dataset: Dataset, raw: string, input: DatasetInput): string {
  for (const column of dataset.schema.columns) {
    if (column.required && (input[column.name] ?? null) === null) {
      throw new DatasetEditError(`${column.name} is required for a new row in ${dataset.title}.`)
    }
  }
  const values = new Map<string, DatasetValue>()
  for (const [name, value] of Object.entries(input)) values.set(requireColumn(dataset, name).name, value)

  const layout = layoutTable(raw, dataset)
  const header = layout.lines[layout.header]
  // The delimiter row's cell widths are the narrowest the table allows, so
  // padding new cells to them keeps an aligned table aligned.
  const template = layout.lines[layout.header + 1]
  const spans = cellSpans(template)
  let line = template
  for (let index = spans.length - 1; index >= 0; index--) {
    const [from, to] = spans[index]
    const [headerFrom, headerTo] = cellSpans(header)[index] ?? [0, 0]
    const name = normaliseColumnName(header.slice(headerFrom, headerTo))
    const column = dataset.schema.columns.find(
      (candidate) => candidate.name === name || (candidate.label && normaliseColumnName(candidate.label) === name)
    )
    const text = column ? formatCell(values.get(column.name) ?? null, column) : ''
    line = line.slice(0, from) + paddedCell(template.slice(from, to), text) + line.slice(to)
  }
  layout.lines.splice(layout.last + 1, 0, line)
  return joinLayout(layout)
}

/** `text` laid out like the delimiter cell `template`, such as " --- " or "---". */
function paddedCell(template: string, text: string): string {
  const cell = /^\s/.test(template) ? ` ${text}` : text
  return /\s$/.test(template) ? cell + ' '.repeat(Math.max(1, template.length - cell.length)) : cell
}

function keyOf(dataset: Dataset): string[] {
  if (dataset.schema.key.length === 0) {
    throw new DatasetEditError(
      `${dataset.title} has no key, so its rows cannot be told apart. Add key to its dataset frontmatter first.`
    )
  }
  return dataset.schema.key
}

/** Reads the key columns from `input`, turning text such as "12" into the column's type. */
function normaliseKey(dataset: Dataset, input: DatasetInput): Record<string, DatasetValue> {
  const byName = new Map(Object.entries(input).map(([name, value]) => [normaliseColumnName(name), value]))
  const key: Record<string, DatasetValue> = {}
  for (const name of keyOf(dataset)) {
    const value = byName.get(name)
    if (value === undefined || value === null || value === '') {
      throw new DatasetEditError(`Give ${name}, which is part of the key of ${dataset.title}.`)
    }
    const column = requireColumn(dataset, name)
    key[name] = typeof value === 'string' ? coerceValue(value, column).value : value
  }
  return key
}

function requireColumn(dataset: Dataset, name: string): DatasetColumn {
  const normalised = normaliseColumnName(name)
  const column = dataset.schema.columns.find((item) => item.name === normalised)
  if (!column) throw new DatasetEditError(`${dataset.title} has no ${name} column.`)
  return column
}

function yamlScalar(value: string): string {
  return /^[A-Za-z0-9_][\w./@+:-]*$/.test(value) && !value.endsWith(':') ? value : JSON.stringify(value)
}

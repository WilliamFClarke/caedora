import {
  findFirstTable,
  normaliseColumnName,
  parseDataset,
  type Dataset,
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

  const { body } = parseFrontmatter(raw)
  if (!raw.endsWith(body)) throw new DatasetEditError(`The table in ${dataset.title} could not be located.`)
  const bodyStart = raw.length - body.length
  const table = findFirstTable(body)
  const start = table?.position?.start.line
  const end = table?.position?.end.line
  if (!start || !end) throw new DatasetEditError(`The table in ${dataset.title} could not be located.`)

  const lines = body.split('\n')
  const header = cellSpans(lines[start - 1])
  const names = new Set([column.name, ...(column.label ? [normaliseColumnName(column.label)] : [])])
  const columnIndex = header.findIndex(([from, to]) =>
    names.has(normaliseColumnName(lines[start - 1].slice(from, to)))
  )
  if (columnIndex < 0) throw new DatasetEditError(`The ${column.name} column is missing from the table.`)

  // Data rows as parseDataset counts them: blank rows are skipped.
  const dataLines: number[] = []
  for (let line = start + 1; line < end; line++) {
    const text = lines[line]
    if (cellSpans(text).some(([from, to]) => text.slice(from, to).trim().length > 0)) dataLines.push(line)
  }
  if (dataLines.length !== dataset.rows.length) {
    throw new DatasetEditError(`The table in ${dataset.title} could not be matched to its rows.`)
  }

  const lineIndex = dataLines[row]
  const text = lines[lineIndex]
  const span = cellSpans(text)[columnIndex]
  if (!span) throw new DatasetEditError(`That row in ${dataset.title} has no ${column.name} cell.`)
  lines[lineIndex] = text.slice(0, span[0]) + replaceCell(text.slice(span[0], span[1]), edit.value) + text.slice(span[1])
  return raw.slice(0, bodyStart) + lines.join('\n')
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

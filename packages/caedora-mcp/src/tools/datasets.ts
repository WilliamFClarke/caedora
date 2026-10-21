import { z } from 'zod'
import { parseFrontmatter } from '../lib/frontmatter.js'
import { appendLog, isConceptPath } from '../lib/okf.js'
import {
  describeDatasetIssue,
  isDatasetFrontmatter,
  parseDataset,
  type Dataset,
  type DatasetRow,
  type DatasetValue,
} from '../lib/dataset.js'
import {
  describeKey,
  stampGenerated,
  updateDatasetRow,
  upsertDatasetRows,
  type DatasetInput,
} from '../lib/dataset-edit.js'
import { compare, evaluateAggregate, evaluateRow, parseExpression } from '../lib/dashboard/expression.js'
import { rowScope, selectRows } from '../lib/dashboard/evaluate.js'
import { loadDashboardData } from '../lib/dashboard/load.js'
import type { VaultProvider } from '../providers/types.js'
import { MCP_ACTOR } from './write.js'

/**
 * Dataset tools. Reads return typed rows. Writes are row and field operations:
 * each one reads the current file, changes only the cells it names (or adds
 * rows at the end of the table), stamps `generated` and writes the result
 * back, so the commit diff shows exactly the rows that changed.
 */

const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()])
const rowShape = z.record(cellValue)

const datasetPath = z.string().describe('Dataset concept path, such as isa/holdings.md.')
const generatedBy = z
  .string()
  .optional()
  .describe(`OKF actor recorded in generated.by, such as <agent>/<model>. Defaults to ${MCP_ACTOR}.`)

export const readDatasetSchema = { path: datasetPath }

export async function readDataset(provider: VaultProvider, { path }: { path: string }) {
  const { dataset, raw } = await loadDataset(provider, path)
  const { frontmatter } = parseFrontmatter(raw)
  return {
    path,
    title: dataset.title,
    key: dataset.schema.key,
    columns: dataset.schema.columns,
    inferred: dataset.inferred,
    generated: frontmatter.generated,
    staleAfter: frontmatter.staleAfter || undefined,
    rows: dataset.rows,
    issues: dataset.issues.map(describeDatasetIssue),
  }
}

export const queryDatasetSchema = {
  path: datasetPath,
  where: z
    .string()
    .optional()
    .describe('Row filter in the dashboard expression language, such as "status = \'proposed\' and value > 100".'),
  value: z
    .string()
    .optional()
    .describe('Aggregate to compute over the matching rows, such as sum(value) or count(). Without it the rows are returned.'),
  group_by: z
    .string()
    .optional()
    .describe('Per row expression to group by, such as sector. Each group gets the value, which defaults to count().'),
}

export interface QueryResult {
  path: string
  /** Rows that matched `where`. */
  count: number
  /** The matching rows, when no value or group was asked for. */
  rows?: DatasetRow[]
  value?: DatasetValue
  groups?: Array<{ group: DatasetValue; count: number; value: DatasetValue }>
}

export async function queryDataset(
  provider: VaultProvider,
  args: { path: string; where?: string; value?: string; group_by?: string }
): Promise<QueryResult> {
  const { dataset } = await loadDataset(provider, args.path)
  // The same loader dashboards use, so ref columns such as account.name resolve.
  const data = await loadDashboardData(provider, '', { dataset: args.path })
  const loaded = data.sources.dataset
  const source = loaded && !('error' in loaded) ? loaded : dataset
  const rows = selectRows(source, { where: args.where }, data)

  if (!args.group_by) {
    if (!args.value) return { path: args.path, count: rows.length, rows }
    const value = evaluateAggregate(
      parseExpression(args.value),
      rows.map((row) => rowScope(source, row, data)),
      data.today
    )
    return { path: args.path, count: rows.length, value }
  }

  const groupExpr = parseExpression(args.group_by)
  const valueExpr = parseExpression(args.value ?? 'count()')
  const groups = new Map<string, { group: DatasetValue; rows: DatasetRow[] }>()
  for (const row of rows) {
    const result = evaluateRow(groupExpr, rowScope(source, row, data))
    const group = Array.isArray(result) ? JSON.stringify(result) : result
    const id = JSON.stringify(group)
    const entry = groups.get(id) ?? { group, rows: [] }
    entry.rows.push(row)
    groups.set(id, entry)
  }
  return {
    path: args.path,
    count: rows.length,
    groups: [...groups.values()]
      .sort((a, b) => compare(a.group, b.group))
      .map((entry) => ({
        group: entry.group,
        count: entry.rows.length,
        value: evaluateAggregate(
          valueExpr,
          entry.rows.map((row) => rowScope(source, row, data)),
          data.today
        ),
      })),
  }
}

export const upsertRowsSchema = {
  path: datasetPath,
  rows: z
    .array(rowShape)
    .min(1)
    .describe('Rows by column name. A row whose key already exists is updated, only in the cells given; others are added.'),
  generatedBy,
}

export async function upsertRows(
  provider: VaultProvider,
  args: { path: string; rows: DatasetInput[]; generatedBy?: string }
) {
  const { raw } = await loadDataset(provider, args.path)
  const result = upsertDatasetRows(args.path, raw, args.rows)
  const parts = [
    result.inserted ? `add ${plural(result.inserted, 'row')}` : '',
    result.updated ? `update ${plural(result.updated, 'row')}` : '',
  ].filter(Boolean)
  const message = parts.length ? `${capitalise(parts.join(' and '))} in ${args.path}` : ''
  const written = await writeDataset(provider, args.path, raw, result.content, message, args.generatedBy)
  return { path: args.path, inserted: result.inserted, updated: result.updated, ...written }
}

export const updateRowSchema = {
  path: datasetPath,
  key: rowShape.describe('The key column values of the row, such as { "date": "2026-10-19", "ticker": "GOOGL_US_EQ" }.'),
  fields: rowShape.describe('Cells to set, by column name. Key columns cannot be changed.'),
  generatedBy,
}

export async function updateRow(
  provider: VaultProvider,
  args: { path: string; key: DatasetInput; fields: DatasetInput; generatedBy?: string }
) {
  const { dataset, raw } = await loadDataset(provider, args.path)
  const content = updateDatasetRow(args.path, raw, args.key, args.fields)
  const fields = Object.entries(args.fields)
  const what = fields.length === 1 ? `${fields[0][0]} to ${fields[0][1] ?? 'blank'}` : fields.map(([name]) => name).join(', ')
  // The same wording as an edit made from a dashboard table in Caedora.
  const message = `Set ${what} for ${describeKey(dataset, args.key)}`
  const written = await writeDataset(provider, args.path, raw, content, message, args.generatedBy)
  return { path: args.path, key: args.key, fields: args.fields, ...written }
}

export const logEntrySchema = {
  kind: z.string().min(1).describe('Entry kind, shown in bold, such as Update, Ingest or order.'),
  text: z.string().min(1).describe('One line describing what happened. Markdown links are allowed.'),
  scope: z.string().optional().describe('Folder whose log.md to write. Defaults to the root log.md.'),
}

export async function logEntry(provider: VaultProvider, args: { kind: string; text: string; scope?: string }) {
  if (/[\n\r]/.test(args.text) || /[\n\r]/.test(args.kind)) throw new Error('A log entry is one line.')
  return appendLog(provider, args.kind.trim(), args.text.trim(), (args.scope ?? '').replace(/^\/+|\/+$/g, ''))
}

async function loadDataset(provider: VaultProvider, path: string): Promise<{ dataset: Dataset; raw: string }> {
  if (!isConceptPath(path)) throw new Error(`${path} is not a concept path.`)
  const raw = await provider.readFile(path)
  if (!isDatasetFrontmatter(parseFrontmatter(raw).frontmatter)) throw new Error(`${path} is not a Dataset.`)
  return { dataset: parseDataset(path, raw), raw }
}

async function writeDataset(
  provider: VaultProvider,
  path: string,
  before: string,
  after: string,
  message: string,
  by = MCP_ACTOR
): Promise<{ changed: boolean; message?: string }> {
  if (after === before) return { changed: false }
  const content = stampGenerated(after, { by, at: new Date().toISOString() })
  await provider.writeFile(path, content)
  if (!provider.writesAreCommits) await provider.commit(message, [path])
  return { changed: true, message }
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

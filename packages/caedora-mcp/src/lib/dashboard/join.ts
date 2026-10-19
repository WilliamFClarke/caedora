import type { Dataset, DatasetColumn, DatasetRow } from '../dataset.js'
import type { DashboardData } from './evaluate.js'
import type { JoinSpec } from './spec.js'

/**
 * A join adds the matching row of one source to each row of another, such as
 * each holding's target weight from a targets Dataset. Every row of the left
 * source is kept. Right columns keep their names unless the left already has
 * one by that name, in which case they are prefixed with the right alias, as
 * in targets_weight.
 */
export function joinDatasets(left: Dataset, right: Dataset, spec: JoinSpec): Dataset {
  const [leftOn, rightOn] = spec.on
  for (const [dataset, column] of [
    [left, leftOn],
    [right, rightOn],
  ] as const) {
    if (!dataset.schema.columns.some((entry) => entry.name === column)) {
      throw new Error(`${dataset.title} has no ${column} column to join on.`)
    }
  }

  const taken = new Set(left.schema.columns.map((column) => column.name))
  const renamed = new Map<string, string>()
  const added: DatasetColumn[] = []
  for (const column of right.schema.columns) {
    if (column.name === rightOn) continue
    const name = taken.has(column.name) ? `${spec.right}_${column.name}` : column.name
    taken.add(name)
    renamed.set(column.name, name)
    added.push({ ...column, name, label: name === column.name ? column.label : undefined })
  }

  const matches = new Map<string, DatasetRow>()
  for (const row of right.rows) {
    const id = joinValue(row[rightOn])
    if (id !== null && !matches.has(id)) matches.set(id, row)
  }

  const rows = left.rows.map((row) => {
    const id = joinValue(row[leftOn])
    const match = id === null ? undefined : matches.get(id)
    const joined: DatasetRow = { ...row }
    for (const [from, to] of renamed) joined[to] = match?.[from] ?? null
    return joined
  })

  return {
    ...left,
    title: `${left.title} with ${right.title}`,
    schema: { key: left.schema.key, columns: [...left.schema.columns, ...added] },
    rows,
    issues: [],
    generatedAt: older(left.generatedAt, right.generatedAt),
    staleAfter: older(left.staleAfter, right.staleAfter),
  }
}

/** Adds each join to the dashboard's sources, or an error explaining why it could not be made. */
export function withJoins(data: DashboardData, joins: Record<string, JoinSpec>): DashboardData {
  const entries = Object.entries(joins)
  if (entries.length === 0) return data
  const sources = { ...data.sources }
  for (const [alias, spec] of entries) {
    const left = sources[spec.left]
    const right = sources[spec.right]
    if (!left || !right) {
      sources[alias] = { error: `${alias} joins ${!left ? spec.left : spec.right}, which is not a source.` }
    } else if ('error' in left || 'error' in right) {
      sources[alias] = { error: 'error' in left ? left.error : (right as { error: string }).error }
    } else {
      try {
        sources[alias] = joinDatasets(left, right, spec)
      } catch (error) {
        sources[alias] = { error: (error as Error).message }
      }
    }
  }
  return { ...data, sources }
}

/** Keys match as text, ignoring case, so VWRP and vwrp join. */
function joinValue(value: DatasetRow[string] | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : String(value).toLowerCase()
}

function older(a: string | undefined, b: string | undefined): string | undefined {
  if (!a || !b) return a ?? b
  return Date.parse(a) <= Date.parse(b) ? a : b
}

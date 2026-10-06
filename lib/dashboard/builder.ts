import type { Dataset, DatasetColumnType } from '../dataset'
import { prettyLabel } from './evaluate'
import type { ItemKind } from './spec'

/**
 * The "Add element" panel works on a flat form, then turns it into the same
 * YAML settings someone would write by hand in the dashboard block.
 */

export type Aggregate = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last'

export const AGGREGATES: Array<{ id: Aggregate; label: string }> = [
  { id: 'sum', label: 'Total' },
  { id: 'avg', label: 'Average' },
  { id: 'min', label: 'Lowest' },
  { id: 'max', label: 'Highest' },
  { id: 'last', label: 'Last' },
  { id: 'count', label: 'Count of rows' },
]

export interface ElementType {
  kind: ItemKind
  name: string
  description: string
  variants: Array<{ id: string; label: string }>
}

export const ELEMENTS: ElementType[] = [
  {
    kind: 'stat',
    name: 'Stat card',
    description: 'One headline number',
    variants: [
      { id: 'plain', label: 'Plain' },
      { id: 'trend', label: 'With trend' },
      { id: 'sparkline', label: 'With sparkline' },
    ],
  },
  {
    kind: 'area',
    name: 'Area chart',
    description: 'A filled line over time',
    variants: [
      { id: 'smooth', label: 'Smooth' },
      { id: 'linear', label: 'Straight' },
      { id: 'step', label: 'Stepped' },
    ],
  },
  {
    kind: 'line',
    name: 'Line chart',
    description: 'Lines over time, good for rates',
    variants: [
      { id: 'smooth', label: 'Smooth' },
      { id: 'linear', label: 'Straight' },
      { id: 'step', label: 'Stepped' },
    ],
  },
  {
    kind: 'bar',
    name: 'Bar chart',
    description: 'Compare totals side by side',
    variants: [
      { id: 'vertical', label: 'Vertical' },
      { id: 'horizontal', label: 'Horizontal' },
    ],
  },
  {
    kind: 'pie',
    name: 'Donut chart',
    description: 'How a total splits up',
    variants: [
      { id: 'donut', label: 'Donut' },
      { id: 'pie', label: 'Pie' },
    ],
  },
  {
    kind: 'progress',
    name: 'Progress',
    description: 'A value against a target',
    variants: [
      { id: 'bar', label: 'Bar' },
      { id: 'gauge', label: 'Gauge' },
    ],
  },
  { kind: 'table', name: 'Table', description: 'Rows from a data file', variants: [] },
  { kind: 'list', name: 'List', description: 'A short list of rows', variants: [] },
  { kind: 'text', name: 'Text', description: 'A note between cards', variants: [] },
]

export interface BuilderForm {
  kind: ItemKind
  variant: string
  title: string
  /** Vault path of the Dataset. */
  source: string
  aggregate: Aggregate
  /** Column the aggregate reads, or the detail column of a list. */
  value: string
  x: string
  /** Splits charts into series, names donut slices and list rows. */
  group: string
  stacked: boolean
  /** Use only the latest row per record, for snapshot logs such as balances. */
  latest: boolean
  where: string
  target: string
  columns: string[]
  limit: string
  text: string
}

export interface ColumnOption {
  path: string
  label: string
  type: DatasetColumnType
}

const NUMERIC: DatasetColumnType[] = ['number', 'currency', 'percent']

/** The Dataset's columns, plus the columns reachable through its ref columns, like account.category. */
export function columnOptions(dataset: Dataset, byPath: Record<string, Dataset>): ColumnOption[] {
  const options: ColumnOption[] = []
  for (const column of dataset.schema.columns) {
    const label = column.label ?? column.name
    options.push({ path: column.name, label: prettyLabel(label), type: column.type })
    if (column.type !== 'ref' || !column.to) continue
    const target = Object.values(byPath).find((candidate) => candidate.path.endsWith(column.to!.replace(/^\.\//, '')))
    for (const joined of target?.schema.columns ?? []) {
      if (joined.type === 'ref') continue
      options.push({
        path: `${column.name}.${joined.name}`,
        label: `${prettyLabel(label)} › ${prettyLabel(joined.label ?? joined.name)}`,
        type: joined.type,
      })
    }
  }
  return options
}

export function isNumeric(option: ColumnOption): boolean {
  return NUMERIC.includes(option.type)
}

export function dateColumnOf(dataset: Dataset): string | null {
  return dataset.schema.columns.find((column) => column.type === 'date')?.name ?? null
}

/** A log of snapshots (keyed by date plus something else) should only count each record's latest row. */
export function isSnapshotLog(dataset: Dataset): boolean {
  const date = dateColumnOf(dataset)
  return Boolean(date && dataset.schema.key.includes(date) && dataset.schema.key.length > 1)
}

export function emptyForm(kind: ItemKind = 'stat'): BuilderForm {
  return {
    kind,
    variant: ELEMENTS.find((element) => element.kind === kind)?.variants[0]?.id ?? '',
    title: '',
    source: '',
    aggregate: 'sum',
    value: '',
    x: '',
    group: '',
    stacked: false,
    latest: false,
    where: '',
    target: '',
    columns: [],
    limit: '',
    text: '',
  }
}

/** Fills the column choices with sensible picks for a newly chosen Dataset. */
export function formForDataset(form: BuilderForm, dataset: Dataset, options: ColumnOption[]): BuilderForm {
  const date = dateColumnOf(dataset)
  // Prefer the Dataset's own columns over ones reached through a ref.
  const ranked = [...options].sort((a, b) => Number(a.path.includes('.')) - Number(b.path.includes('.')))
  const numeric = ranked.find(isNumeric)
  const category = ranked.find((option) => option.type === 'enum') ?? ranked.find((option) => option.type === 'text')
  return {
    ...form,
    value: numeric?.path ?? '',
    aggregate: numeric ? 'sum' : 'count',
    x: date ?? category?.path ?? options[0]?.path ?? '',
    group: form.kind === 'pie' || form.kind === 'list' ? category?.path ?? '' : '',
    latest: isSnapshotLog(dataset),
    columns: dataset.schema.columns.map((column) => column.name),
    title: form.title || dataset.title,
  }
}

/** Turns the form into `{ kind: settings }`, leaving out anything unset. */
export function buildItem(form: BuilderForm, alias: string, dataset: Dataset | null): Record<string, unknown> {
  if (form.kind === 'text') {
    const text = form.text.trim() || 'Write a note here.'
    return { text: form.title.trim() ? { title: form.title.trim(), text } : text }
  }

  const date = dataset ? dateColumnOf(dataset) : null
  const value = form.aggregate === 'count' ? 'count()' : `${form.aggregate}(${form.value})`
  const title = form.title.trim() || undefined
  const latest = form.latest && date ? date : undefined
  const common = { source: alias, where: form.where.trim() || undefined }
  let settings: Record<string, unknown>

  switch (form.kind) {
    case 'stat': {
      const needsDate = form.variant === 'trend' || form.variant === 'sparkline'
      settings = {
        label: title ?? 'Value',
        ...common,
        latest: latest ?? (needsDate && date ? date : undefined),
        value,
        trend: form.variant === 'trend' || undefined,
        sparkline: form.variant === 'sparkline' || undefined,
      }
      break
    }
    case 'area':
    case 'line':
    case 'bar': {
      const overTime = Boolean(date && form.x === date)
      settings = {
        title,
        ...common,
        x: form.x,
        y: value,
        series: form.group || undefined,
        stacked: (form.group && form.stacked) || undefined,
        snapshots: (form.latest && overTime) || undefined,
        ranges: overTime ? ['3m', '12m', 'all'] : undefined,
        curve: form.kind !== 'bar' && form.variant !== 'smooth' ? form.variant : undefined,
        horizontal: (form.kind === 'bar' && form.variant === 'horizontal') || undefined,
      }
      break
    }
    case 'pie':
      settings = {
        title,
        ...common,
        latest,
        label: form.group,
        value,
        donut: form.variant === 'pie' ? false : undefined,
      }
      break
    case 'progress':
      settings = {
        label: title ?? 'Progress',
        ...common,
        latest,
        value,
        max: Number(form.target) || form.target || undefined,
        gauge: form.variant === 'gauge' || undefined,
      }
      break
    case 'table':
      settings = {
        title,
        ...common,
        latest,
        columns: form.columns.length > 0 ? form.columns : undefined,
        limit: Number(form.limit) || undefined,
      }
      break
    case 'list':
      settings = {
        title,
        ...common,
        latest,
        label: form.group,
        detail: form.value || undefined,
        limit: Number(form.limit) || undefined,
      }
      break
  }
  return { [form.kind]: Object.fromEntries(Object.entries(settings).filter(([, entry]) => entry !== undefined)) }
}

/** Picks the data alias for a Dataset, reusing one the dashboard already lists. */
export function sourceFor(
  dashboardPath: string,
  datasetPath: string,
  data: Record<string, string>
): { alias: string; href: string } {
  const href = relativePath(dashboardPath, datasetPath)
  const existing = Object.entries(data).find(([, path]) => path === href || path === `./${href}`)
  if (existing) return { alias: existing[0], href }
  const stem = (datasetPath.split('/').pop() ?? 'data').replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
  let alias = stem || 'data'
  for (let n = 2; alias in data; n++) alias = `${stem}_${n}`
  return { alias, href }
}

/** The path of `to` as a link written in `from`, both vault paths. */
export function relativePath(from: string, to: string): string {
  const fromDir = from.split('/').slice(0, -1)
  const target = to.split('/')
  let shared = 0
  while (shared < fromDir.length && shared < target.length - 1 && fromDir[shared] === target[shared]) shared++
  return [...fromDir.slice(shared).map(() => '..'), ...target.slice(shared)].join('/')
}

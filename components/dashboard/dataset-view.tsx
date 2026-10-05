'use client'

import { useMemo } from 'react'
import { DataTable } from './dashboard-items'
import { parseDataset } from '@/lib/dataset'
import { prettyLabel } from '@/lib/dashboard/evaluate'
import type { ValueFormat } from '@/lib/dashboard/spec'

const FORMATS: Record<string, ValueFormat> = {
  currency: 'currency',
  number: 'number',
  percent: 'percent-points',
  date: 'date',
}

/** Read-only, sortable table view of a Dataset concept. */
export function DatasetView({
  path,
  raw,
  title,
  description,
}: {
  path: string
  raw: string
  title: string
  description?: string
}) {
  const dataset = useMemo(() => parseDataset(path, raw), [path, raw])
  const columns = dataset.schema.columns.map((column) => ({
    key: column.name,
    label: column.label ?? prettyLabel(column.name),
    spec: { format: FORMATS[column.type] ?? 'text', currency: column.currency ?? 'GBP' },
  }))
  const rows = dataset.rows.map((row) => dataset.schema.columns.map((column) => row[column.name] ?? null))

  return (
    <div data-testid="dataset-view" className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
          <p className="text-muted-foreground text-xs">
            {dataset.rows.length} row{dataset.rows.length === 1 ? '' : 's'}
            {dataset.inferred ? ' · column types inferred from the table' : ''}
          </p>
        </header>
        <DataTable columns={columns} rows={rows} sortable />
      </div>
    </div>
  )
}

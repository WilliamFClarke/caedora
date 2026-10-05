'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CircleAlert,
  GripVertical,
  LayoutGrid,
  Loader2,
} from 'lucide-react'
import { DashboardItemView } from './dashboard-items'
import { ViewHeader } from './view-header'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { evaluateItem, type DashboardData, type ItemResult } from '@/lib/dashboard/evaluate'
import { applyLayoutEdit, type LayoutEdit } from '@/lib/dashboard/layout'
import { loadDashboardData } from '@/lib/dashboard/load'
import { parseDashboard, type DashboardRow } from '@/lib/dashboard/spec'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 @2xl/dashboard:grid-cols-2',
  3: 'grid-cols-1 @2xl/dashboard:grid-cols-2 @5xl/dashboard:grid-cols-3',
  4: 'grid-cols-1 @xl/dashboard:grid-cols-2 @5xl/dashboard:grid-cols-4',
}

/** Where an item lives in the YAML: its row and its position in that row's items list. */
type ItemAt = { row: number; item: number }

export function DashboardView({
  provider,
  path,
  title,
  description,
  body,
  refreshKey,
  viewToggle,
  onBodyChange,
}: {
  provider: VaultProvider
  path: string
  title: string
  description?: string
  body: string
  /** Changes whenever the vault's files change, so Datasets are re-read. */
  refreshKey?: unknown
  viewToggle?: ReactNode
  /** Receives the rewritten Markdown body after a layout edit. */
  onBodyChange?: (body: string) => void
}) {
  const spec = useMemo(() => parseDashboard(body), [body])
  const [data, setData] = useState<DashboardData | null>(null)
  const [editing, setEditing] = useState(false)
  const sourcesKey = JSON.stringify(spec.data)

  useEffect(() => {
    setEditing(false)
  }, [path])

  useEffect(() => {
    let cancelled = false
    loadDashboardData(provider, path, JSON.parse(sourcesKey) as Record<string, string>)
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setData({ sources: {}, byPath: {}, today: new Date() })
      })
    return () => {
      cancelled = true
    }
  }, [provider, path, sourcesKey, refreshKey])

  const edit = (change: LayoutEdit) => {
    const next = applyLayoutEdit(body, change)
    if (next === body || !onBodyChange) return
    // Cards carry view-transition-names, so the browser animates them to their new places.
    if (!document.startViewTransition) return onBodyChange(next)
    document.startViewTransition(() => flushSync(() => onBodyChange(next)))
  }

  const canEdit = Boolean(onBodyChange) && spec.rows.length > 0

  return (
    <div data-testid="dashboard-view" className="@container/dashboard h-full overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <ViewHeader
          title={title}
          description={description}
          actions={
            <>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant={editing ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setEditing((value) => !value)}
                >
                  {editing ? <Check className="size-4" /> : <LayoutGrid className="size-4" />}
                  {editing ? 'Done' : 'Edit layout'}
                </Button>
              )}
              {viewToggle}
            </>
          }
        />
        {spec.issues.length > 0 && (
          <div className="border-destructive/40 text-destructive rounded-lg border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CircleAlert className="size-4" />
              Some of this dashboard could not be read
            </p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
              {spec.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {!data ? (
          <div className="text-muted-foreground flex items-center gap-2 py-12 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading data…
          </div>
        ) : editing ? (
          <LayoutEditor rows={spec.rows} data={data} onEdit={edit} />
        ) : (
          spec.rows.map((row) => <DashboardRowView key={row.index} row={row} data={data} />)
        )}
      </div>
    </div>
  )
}

function useRowResults(row: DashboardRow, data: DashboardData): ItemResult[] {
  return useMemo(() => row.items.map((item) => evaluateItem(item, data)), [row, data])
}

function DashboardRowView({ row, data }: { row: DashboardRow; data: DashboardData }) {
  const results = useRowResults(row, data)
  return (
    <div className={cn('grid gap-4', GRID[row.columns] ?? GRID[1])}>
      {results.map((result, index) => (
        <DashboardItemView key={row.itemIndexes[index]} result={result} />
      ))}
    </div>
  )
}

/**
 * Edit mode: drag cards to reorder them within or across rows, or drop them
 * on the bottom zone to start a new row. Buttons do the same for keyboard and
 * touch users. Every change rewrites the dashboard's YAML straight away.
 */
function LayoutEditor({
  rows,
  data,
  onEdit,
}: {
  rows: DashboardRow[]
  data: DashboardData
  onEdit: (edit: LayoutEdit) => void
}) {
  const [dragging, setDragging] = useState<ItemAt | null>(null)
  const [draggingRow, setDraggingRow] = useState<number | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const names = useMemo(() => transitionNames(rows), [rows])

  const drop = (to: { row: number; index: number } | { newRowAt: number }) => {
    if (!dragging) return
    if ('newRowAt' in to) onEdit({ kind: 'item-to-new-row', from: dragging, at: to.newRowAt })
    else onEdit({ kind: 'move-item', from: dragging, to })
    setDragging(null)
    setTarget(null)
  }

  const endOfRow = (row: DashboardRow) =>
    row.itemIndexes.length > 0 ? row.itemIndexes[row.itemIndexes.length - 1] + 1 : 0

  return (
    <div className="flex flex-col gap-4" data-testid="dashboard-layout-editor">
      <p className="text-muted-foreground text-sm">
        Drag cards to rearrange them, or use the arrows. Changes are written to the Source as you go.
      </p>
      {rows.map((row, rowPosition) => (
        <section
          key={row.index}
          aria-label={`Row ${rowPosition + 1}`}
          draggable
          data-testid="dashboard-edit-row"
          className={cn(
            'rounded-xl border border-dashed p-3 transition-colors',
            target === `row-${row.index}` && 'border-primary bg-primary/5',
            draggingRow === row.index && 'opacity-40'
          )}
          onDragStart={(event) => {
            // Card drags bubble up here too; only drags that start on the row itself move the row.
            if (event.target !== event.currentTarget) return
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', `Row ${rowPosition + 1}`)
            setDraggingRow(row.index)
          }}
          onDragEnd={() => {
            setDraggingRow(null)
            setTarget(null)
          }}
          onDragOver={(event) => {
            if (draggingRow !== null) {
              event.preventDefault()
              if (draggingRow !== row.index) setTarget(`row-${row.index}`)
              return
            }
            if (!dragging) return
            event.preventDefault()
            if (event.target === event.currentTarget) setTarget(`row-${row.index}`)
          }}
          onDrop={(event) => {
            if (draggingRow !== null) {
              event.preventDefault()
              if (draggingRow !== row.index) onEdit({ kind: 'move-row', from: draggingRow, to: row.index })
              setDraggingRow(null)
              setTarget(null)
              return
            }
            if (event.target !== event.currentTarget) return
            event.preventDefault()
            drop({ row: row.index, index: endOfRow(row) })
          }}
        >
          <div className="mb-3 flex cursor-grab flex-wrap items-center gap-2 active:cursor-grabbing">
            <GripVertical className="text-muted-foreground size-4" aria-hidden />
            <span className="text-muted-foreground text-xs font-medium">Row {rowPosition + 1}</span>
            <ToggleGroup
              type="single"
              value={String(row.columns)}
              onValueChange={(value) => value && onEdit({ kind: 'set-columns', row: row.index, columns: Number(value) })}
              aria-label={`Columns in row ${rowPosition + 1}`}
            >
              {[1, 2, 3, 4].map((count) => (
                <ToggleGroupItem key={count} value={String(count)} className="h-7 px-2 text-xs" aria-label={`${count} columns`}>
                  {count}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-muted-foreground text-xs">columns</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move row ${rowPosition + 1} up`}
                disabled={rowPosition === 0}
                onClick={() => onEdit({ kind: 'move-row', from: row.index, to: rows[rowPosition - 1].index })}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move row ${rowPosition + 1} down`}
                disabled={rowPosition === rows.length - 1}
                onClick={() => onEdit({ kind: 'move-row', from: row.index, to: rows[rowPosition + 1].index })}
              >
                <ArrowDown className="size-4" />
              </Button>
            </div>
          </div>
          <EditableRow
            row={row}
            rowPosition={rowPosition}
            rows={rows}
            data={data}
            names={names[rowPosition]}
            dragging={dragging}
            target={target}
            setTarget={setTarget}
            onDragStart={setDragging}
            onDragEnd={() => {
              setDragging(null)
              setTarget(null)
            }}
            onDrop={drop}
            onEdit={onEdit}
            endOfRow={endOfRow}
          />
        </section>
      ))}
      <div
        className={cn(
          'text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm transition-colors',
          !dragging && 'opacity-60',
          target === 'new-row' && 'border-primary bg-primary/5 text-foreground'
        )}
        onDragOver={(event) => {
          if (!dragging) return
          event.preventDefault()
          setTarget('new-row')
        }}
        onDrop={(event) => {
          event.preventDefault()
          drop({ newRowAt: rows.length > 0 ? rows[rows.length - 1].index + 1 : 0 })
        }}
      >
        Drop a card here to start a new row
      </div>
    </div>
  )
}

function EditableRow({
  row,
  rowPosition,
  rows,
  data,
  names,
  dragging,
  target,
  setTarget,
  onDragStart,
  onDragEnd,
  onDrop,
  onEdit,
  endOfRow,
}: {
  row: DashboardRow
  rowPosition: number
  rows: DashboardRow[]
  data: DashboardData
  names: string[]
  dragging: ItemAt | null
  target: string | null
  setTarget: (target: string | null) => void
  onDragStart: (at: ItemAt) => void
  onDragEnd: () => void
  onDrop: (to: { row: number; index: number }) => void
  onEdit: (edit: LayoutEdit) => void
  endOfRow: (row: DashboardRow) => number
}) {
  const results = useRowResults(row, data)
  const previous = rows[rowPosition - 1]
  const next = rows[rowPosition + 1]

  return (
    <div className={cn('grid gap-x-4 gap-y-6 pt-3', GRID[row.columns] ?? GRID[1])}>
      {results.map((result, position) => {
        const at = { row: row.index, item: row.itemIndexes[position] }
        const isDragging = dragging?.row === at.row && dragging.item === at.item
        const label = itemLabel(result, position)
        const first = position === 0
        const last = position === results.length - 1
        return (
          <div
            key={at.item}
            draggable
            data-testid="dashboard-edit-item"
            aria-label={label}
            style={{ viewTransitionName: names[position] }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', label)
              onDragStart(at)
            }}
            onDragEnd={onDragEnd}
            onDragOver={(event) => {
              if (!dragging) return
              event.preventDefault()
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              const after = event.clientX > rect.left + rect.width / 2
              setTarget(`${at.row}:${at.item}:${after ? 'after' : 'before'}`)
            }}
            onDrop={(event) => {
              if (!dragging) return
              event.preventDefault()
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              const after = event.clientX > rect.left + rect.width / 2
              onDrop({ row: at.row, index: at.item + (after ? 1 : 0) })
            }}
            className={cn(
              'group/edit relative cursor-grab rounded-xl ring-2 ring-transparent transition active:cursor-grabbing',
              isDragging && 'opacity-40',
              target === `${at.row}:${at.item}:before` && 'ring-primary [box-shadow:-6px_0_0_0_var(--primary)]',
              target === `${at.row}:${at.item}:after` && 'ring-primary [box-shadow:6px_0_0_0_var(--primary)]'
            )}
          >
            <div className="pointer-events-none select-none">
              <DashboardItemView result={result} />
            </div>
            <div className="bg-background absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
              <GripVertical className="text-muted-foreground size-4" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Move ${label} back`}
                disabled={first && !previous}
                onClick={() =>
                  first
                    ? onEdit({ kind: 'move-item', from: at, to: { row: previous.index, index: endOfRow(previous) } })
                    : onEdit({ kind: 'move-item', from: at, to: { row: at.row, index: row.itemIndexes[position - 1] } })
                }
              >
                <ArrowLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Move ${label} forward`}
                disabled={last && !next}
                onClick={() =>
                  last
                    ? onEdit({ kind: 'move-item', from: at, to: { row: next.index, index: 0 } })
                    : onEdit({ kind: 'move-item', from: at, to: { row: at.row, index: row.itemIndexes[position + 1] + 1 } })
                }
              >
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** A stable view-transition-name per card, from its YAML, so moved cards animate. */
function transitionNames(rows: DashboardRow[]): string[][] {
  const seen = new Map<string, number>()
  return rows.map((row) =>
    row.items.map((item) => {
      const json = JSON.stringify(item)
      let hash = 5381
      for (let i = 0; i < json.length; i++) hash = (hash * 33) ^ json.charCodeAt(i)
      const key = (hash >>> 0).toString(36)
      const count = seen.get(key) ?? 0
      seen.set(key, count + 1)
      return `dashboard-card-${key}-${count}`
    })
  )
}

function itemLabel(result: ItemResult, position: number): string {
  if (result.kind === 'stat' || result.kind === 'progress') return result.label
  return result.title ?? `${result.kind} ${position + 1}`
}

'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DashboardItemView } from './dashboard-items'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AGGREGATES,
  ELEMENTS,
  buildItem,
  columnOptions,
  dateColumnOf,
  emptyForm,
  formForDataset,
  isNumeric,
  sourceFor,
  type Aggregate,
  type BuilderForm,
} from '@/lib/dashboard/builder'
import { evaluateItem, type DashboardData } from '@/lib/dashboard/evaluate'
import type { LayoutEdit } from '@/lib/dashboard/layout'
import { loadDashboardData } from '@/lib/dashboard/load'
import { parseItem, type DashboardRow, type ItemKind } from '@/lib/dashboard/spec'
import type { VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface DatasetChoice {
  path: string
  title: string
}

/**
 * Pick an element and variant, point it at a Dataset and its columns, and see
 * it drawn from the real data before it is written into the dashboard block.
 */
export function ElementBuilder({
  open,
  onOpenChange,
  provider,
  dashboardPath,
  data,
  rows,
  datasets,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: VaultProvider
  dashboardPath: string
  /** The dashboard's existing `data` map. */
  data: Record<string, string>
  rows: DashboardRow[]
  datasets: DatasetChoice[]
  onAdd: (edit: Extract<LayoutEdit, { kind: 'add-item' }>) => void
}) {
  const [form, setForm] = useState<BuilderForm>(() => emptyForm())
  const [loaded, setLoaded] = useState<DashboardData | null>(null)
  const [placement, setPlacement] = useState<string>('new')
  const update = (patch: Partial<BuilderForm>) => setForm((current) => ({ ...current, ...patch }))

  useEffect(() => {
    if (!open) return
    setForm(emptyForm())
    setLoaded(null)
    setPlacement('new')
  }, [open])

  const source = form.source ? sourceFor(dashboardPath, form.source, data) : null
  const dataset = loaded && source ? loaded.sources[source.alias] : undefined
  const ready = dataset && !('error' in dataset) ? dataset : null
  const options = useMemo(() => (ready && loaded ? columnOptions(ready, loaded.byPath) : []), [ready, loaded])

  const chooseSource = async (path: string) => {
    update({ source: path })
    setLoaded(null)
    if (!path) return
    const { alias, href } = sourceFor(dashboardPath, path, data)
    const next = await loadDashboardData(provider, dashboardPath, { [alias]: href })
    setLoaded(next)
    const chosen = next.sources[alias]
    if (chosen && !('error' in chosen)) {
      setForm((current) => formForDataset({ ...current, source: path }, chosen, columnOptions(chosen, next.byPath)))
    }
  }

  const chooseKind = (kind: ItemKind) => {
    setForm((current) => {
      const fresh = { ...emptyForm(kind), title: current.title, source: current.source, text: current.text }
      return ready && loaded ? formForDataset(fresh, ready, options) : fresh
    })
  }

  const item = useMemo(
    () => (form.kind === 'text' || source ? buildItem(form, source?.alias ?? '', ready) : null),
    [form, source, ready]
  )
  const preview = useMemo(() => {
    if (!item) return null
    const issues: string[] = []
    const parsed = parseItem(item, 'The new element', source ? { [source.alias]: source.href } : {}, issues)
    if (!parsed) return { kind: 'error' as const, title: 'Not ready yet', message: issues.join(' ') }
    if (parsed.kind === 'text') return parsed
    if (!loaded) return null
    return evaluateItem(parsed, loaded)
  }, [item, source, loaded])

  const element = ELEMENTS.find((entry) => entry.kind === form.kind)!
  const numeric = options.filter(isNumeric)
  const dates = options.filter((option) => option.type === 'date')
  const categories = options.filter((option) => !isNumeric(option) && option.type !== 'date')
  const valueChoices = form.aggregate === 'min' || form.aggregate === 'max' ? [...numeric, ...dates] : numeric
  const needsData = form.kind !== 'text'
  const canAdd = Boolean(item) && preview?.kind !== 'error' && (!needsData || ready)

  const add = () => {
    if (!item) return
    onAdd({
      kind: 'add-item',
      item,
      data: source ? { alias: source.alias, path: source.href } : undefined,
      row: placement === 'new' ? 'new' : Number(placement),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl" data-testid="element-builder">
        <DialogHeader>
          <DialogTitle>Add element</DialogTitle>
          <DialogDescription>
            Choose an element, then the data it shows. It is added to the dashboard&apos;s Source when you click Add.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Element">
              {ELEMENTS.map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === entry.kind}
                  aria-label={entry.name}
                  onClick={() => chooseKind(entry.kind)}
                  className={cn(
                    'hover:bg-accent flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors',
                    form.kind === entry.kind && 'border-primary bg-primary/5 ring-primary/30 ring-2'
                  )}
                >
                  <Sketch kind={entry.kind} />
                  <span className="font-medium">{entry.name}</span>
                </button>
              ))}
            </div>
            <p className="text-muted-foreground -mt-2 text-xs">{element.description}</p>

            {element.variants.length > 0 && (
              <Field label="Style">
                <ToggleGroup
                  type="single"
                  value={form.variant}
                  onValueChange={(variant) => variant && update({ variant })}
                  aria-label="Style"
                  className="w-full rounded-md border p-0.5"
                >
                  {element.variants.map((variant) => (
                    <ToggleGroupItem key={variant.id} value={variant.id} className="h-8 flex-1 text-xs">
                      {variant.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            )}

            <Field label={form.kind === 'stat' || form.kind === 'progress' ? 'Label' : 'Title'} htmlFor="builder-title">
              <Input id="builder-title" value={form.title} onChange={(event) => update({ title: event.target.value })} />
            </Field>

            {form.kind === 'text' ? (
              <Field label="Text" htmlFor="builder-text">
                <textarea
                  id="builder-text"
                  value={form.text}
                  onChange={(event) => update({ text: event.target.value })}
                  rows={4}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                />
              </Field>
            ) : (
              <>
                <Field label="Data file" htmlFor="builder-source">
                  <Select id="builder-source" value={form.source} onChange={(value) => void chooseSource(value)}>
                    <option value="">Choose a Dataset…</option>
                    {datasets.map((choice) => (
                      <option key={choice.path} value={choice.path}>
                        {choice.title} ({choice.path})
                      </option>
                    ))}
                  </Select>
                  {datasets.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                      No Datasets yet. Create a note with type Dataset and a table first.
                    </p>
                  )}
                </Field>

                {ready && (
                  <>
                    {['area', 'line', 'bar'].includes(form.kind) && (
                      <Field label={form.kind === 'bar' ? 'Bars for each' : 'Along the bottom'} htmlFor="builder-x">
                        <ColumnSelect id="builder-x" value={form.x} choices={[...dates, ...categories]} onChange={(x) => update({ x })} />
                      </Field>
                    )}
                    {(form.kind === 'pie' || form.kind === 'list') && (
                      <Field label={form.kind === 'pie' ? 'Slice for each' : 'Show each'} htmlFor="builder-group">
                        <ColumnSelect id="builder-group" value={form.group} choices={categories} onChange={(group) => update({ group })} />
                      </Field>
                    )}
                    {form.kind === 'list' ? (
                      <Field label="Detail (optional)" htmlFor="builder-value">
                        <ColumnSelect id="builder-value" value={form.value} choices={options} empty="None" onChange={(value) => update({ value })} />
                      </Field>
                    ) : form.kind !== 'table' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Value" htmlFor="builder-aggregate">
                          <Select
                            id="builder-aggregate"
                            value={form.aggregate}
                            onChange={(aggregate) => update({ aggregate: aggregate as Aggregate })}
                          >
                            {AGGREGATES.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        {form.aggregate !== 'count' && (
                          <Field label="of" htmlFor="builder-value">
                            <ColumnSelect id="builder-value" value={form.value} choices={valueChoices} onChange={(value) => update({ value })} />
                          </Field>
                        )}
                      </div>
                    ) : (
                      <Field label="Columns">
                        <div className="flex flex-wrap gap-1.5">
                          {options.map((option) => {
                            const on = form.columns.includes(option.path)
                            return (
                              <button
                                key={option.path}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                  update({
                                    columns: on
                                      ? form.columns.filter((path) => path !== option.path)
                                      : [...form.columns, option.path],
                                  })
                                }
                                className={cn(
                                  'rounded-md border px-2 py-1 text-xs',
                                  on ? 'border-primary bg-primary/10' : 'text-muted-foreground'
                                )}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </Field>
                    )}
                    {['area', 'line', 'bar'].includes(form.kind) && (
                      <Field label="Split into a series for each (optional)" htmlFor="builder-group">
                        <ColumnSelect id="builder-group" value={form.group} choices={categories} empty="None" onChange={(group) => update({ group })} />
                        {form.group && form.kind !== 'line' && (
                          <Check label="Stack the series" checked={form.stacked} onChange={(stacked) => update({ stacked })} />
                        )}
                      </Field>
                    )}
                    {form.kind === 'progress' && (
                      <Field label="Target" htmlFor="builder-target">
                        <Input
                          id="builder-target"
                          inputMode="decimal"
                          value={form.target}
                          placeholder="20000"
                          onChange={(event) => update({ target: event.target.value })}
                        />
                      </Field>
                    )}
                    {(form.kind === 'table' || form.kind === 'list') && (
                      <Field label="Show at most (optional)" htmlFor="builder-limit">
                        <Input id="builder-limit" inputMode="numeric" value={form.limit} onChange={(event) => update({ limit: event.target.value })} />
                      </Field>
                    )}
                    {dateColumnOf(ready) && (
                      <Check
                        label="Only use the latest row for each record (for snapshots such as balances)"
                        checked={form.latest}
                        onChange={(latest) => update({ latest })}
                      />
                    )}
                    <Field label="Only rows where (optional)" htmlFor="builder-where">
                      <Input
                        id="builder-where"
                        value={form.where}
                        placeholder="kind = isa"
                        onChange={(event) => update({ where: event.target.value })}
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-medium">Preview</span>
            <div className="bg-muted/40 @container/dashboard flex min-h-48 flex-1 flex-col justify-center rounded-xl border border-dashed p-4" data-testid="element-preview">
              {preview ? (
                <DashboardItemView result={preview} />
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  {form.source ? 'Loading data…' : 'Choose a data file to see a preview.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="builder-placement">Add to</Label>
            <Select id="builder-placement" value={placement} onChange={setPlacement} className="w-40">
              <option value="new">A new row</option>
              {rows.map((row, position) => (
                <option key={row.index} value={row.index}>
                  Row {position + 1}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={add} disabled={!canAdd}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-primary size-4" />
      {label}
    </label>
  )
}

function Select({
  id,
  value,
  onChange,
  className,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
  children: ReactNode
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
        className
      )}
    >
      {children}
    </select>
  )
}

function ColumnSelect({
  id,
  value,
  choices,
  empty,
  onChange,
}: {
  id: string
  value: string
  choices: Array<{ path: string; label: string }>
  empty?: string
  onChange: (value: string) => void
}) {
  return (
    <Select id={id} value={value} onChange={onChange}>
      {(empty || !choices.some((choice) => choice.path === value)) && <option value="">{empty ?? 'Choose a column…'}</option>}
      {choices.map((choice) => (
        <option key={choice.path} value={choice.path}>
          {choice.label}
        </option>
      ))}
    </Select>
  )
}

/** A tiny drawing of each element for the gallery. */
function Sketch({ kind }: { kind: ItemKind }) {
  const shapes: Record<ItemKind, ReactNode> = {
    stat: (
      <>
        <rect x="6" y="8" width="22" height="4" rx="2" opacity="0.4" />
        <rect x="6" y="17" width="34" height="9" rx="2" />
        <rect x="44" y="8" width="14" height="6" rx="3" opacity="0.4" />
      </>
    ),
    area: <path d="M4 34 L4 24 C14 18 20 26 30 16 C40 8 48 14 60 6 L60 34 Z" opacity="0.7" />,
    line: <path d="M4 28 C14 20 22 30 32 18 S50 12 60 8" fill="none" stroke="currentColor" strokeWidth="3" />,
    bar: (
      <>
        <rect x="6" y="18" width="9" height="16" rx="1.5" />
        <rect x="20" y="8" width="9" height="26" rx="1.5" />
        <rect x="34" y="14" width="9" height="20" rx="1.5" />
        <rect x="48" y="22" width="9" height="12" rx="1.5" />
      </>
    ),
    pie: (
      <>
        <circle cx="32" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="7" opacity="0.35" />
        <path d="M32 7 A13 13 0 0 1 44.4 24" fill="none" stroke="currentColor" strokeWidth="7" />
      </>
    ),
    progress: (
      <>
        <rect x="6" y="10" width="26" height="5" rx="2" opacity="0.4" />
        <rect x="6" y="22" width="52" height="7" rx="3.5" opacity="0.25" />
        <rect x="6" y="22" width="34" height="7" rx="3.5" />
      </>
    ),
    table: (
      <>
        <rect x="6" y="6" width="52" height="6" rx="1.5" />
        {[16, 23, 30].map((y) => (
          <rect key={y} x="6" y={y} width="52" height="3" rx="1.5" opacity="0.4" />
        ))}
      </>
    ),
    list: (
      <>
        {[8, 18, 28].map((y) => (
          <g key={y}>
            <rect x="6" y={y} width="30" height="4" rx="2" />
            <rect x="46" y={y} width="12" height="4" rx="2" opacity="0.4" />
          </g>
        ))}
      </>
    ),
    text: (
      <>
        {[9, 17, 25].map((y, index) => (
          <rect key={y} x="6" y={y} width={index === 2 ? 30 : 52} height="3.5" rx="1.75" opacity="0.5" />
        ))}
      </>
    ),
  }
  return (
    <svg viewBox="0 0 64 40" className="text-primary h-10 w-16" fill="currentColor" aria-hidden>
      {shapes[kind]}
    </svg>
  )
}

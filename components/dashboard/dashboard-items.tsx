'use client'

import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceLine,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts'
import { Check, ChevronDown, CircleAlert, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CellEdit } from '@/lib/dataset-edit'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { filterRange, rangeLabel, type BarTone, type ChartResult, type ItemResult } from '@/lib/dashboard/evaluate'
import { formatDate, formatMonth, formatValue } from '@/lib/dashboard/format'
import { cn } from '@/lib/utils'

type Result<K extends ItemResult['kind']> = Extract<ItemResult, { kind: K }>

/** Saves one cell of a Dataset; rejects with a message to show when it cannot. */
export type EditCell = (source: string, edit: CellEdit) => Promise<void>

export function DashboardItemView({ result, onEditCell }: { result: ItemResult; onEditCell?: EditCell }) {
  switch (result.kind) {
    case 'stat':
      return <StatCard result={result} />
    case 'area':
    case 'bar':
    case 'line':
      return <ChartCard result={result} />
    case 'pie':
      return <PieCard result={result} />
    case 'treemap':
      return <TreemapCard result={result} />
    case 'waterfall':
      return <WaterfallCard result={result} />
    case 'table':
      return <TableCard result={result} onEditCell={onEditCell} />
    case 'progress':
      return result.gauge ? <GaugeCard result={result} /> : <ProgressCard result={result} />
    case 'list':
      return <ListCard result={result} />
    case 'text':
      return <TextCard result={result} />
    case 'error':
      return <ErrorCard result={result} />
  }
}

/** Based on the shadcn dashboard "section cards" block. */
function StatCard({ result }: { result: Result<'stat'> }) {
  const trend = result.trend
  const up = trend ? trend.delta >= 0 : true
  return (
    <Card data-slot="dashboard-stat" className="from-primary/5 to-card @container/card bg-gradient-to-t shadow-xs">
      <CardHeader>
        <CardDescription>{result.label}</CardDescription>
        <CardTitle className="text-2xl font-semibold whitespace-nowrap tabular-nums @[250px]/card:text-3xl">
          {formatValue(result.value, result.spec)}
        </CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline">
              {up ? <TrendingUp /> : <TrendingDown />}
              {trend.ratio === null
                ? formatValue(trend.delta, result.spec, { compact: true })
                : `${up ? '+' : ''}${(trend.ratio * 100).toFixed(1)}%`}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {result.sparkline && result.sparkline.length > 1 && <Sparkline values={result.sparkline} />}
      {(trend || result.description) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {trend && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {up ? 'Up' : 'Down'} {formatValue(Math.abs(trend.delta), result.spec)} since last snapshot
              {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            </div>
          )}
          {result.description && <div className="text-muted-foreground">{result.description}</div>}
        </CardFooter>
      )}
    </Card>
  )
}

const CURVES = { smooth: 'monotone', linear: 'linear', step: 'step' } as const

function seriesConfig(series: Array<{ key: string; label: string }>): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [entry.key, { label: entry.label, color: `var(--chart-${(index % 5) + 1})` }])
  )
}

function Sparkline({ values }: { values: number[] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const points = values.map((value, index) => ({ index, value }))
  return (
    <ChartContainer config={{ value: { label: 'Value', color: 'var(--chart-1)' } }} className="aspect-auto h-12 w-full px-6">
      <AreaChart data={points} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" fill={`url(#spark-${id})`} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}

/** Based on the shadcn interactive area, line and bar charts. */
function ChartCard({ result }: { result: ChartResult }) {
  const [range, setRange] = useState(result.ranges[result.ranges.length - 1] ?? 'all')
  const points = useMemo(() => filterRange(result.points, range), [result.points, range])
  const config = useMemo(() => seriesConfig(result.series), [result.series])
  const datesOnX = typeof points[0]?.x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(points[0].x))
  const monthsOnX = typeof points[0]?.x === 'string' && /^\d{4}-\d{2}$/.test(String(points[0].x))
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const formatX = (value: unknown) =>
    datesOnX ? formatDate(String(value), 'short') : monthsOnX ? formatMonth(String(value), 'short') : String(value)
  const formatLabel = (value: unknown) =>
    datesOnX ? formatDate(String(value)) : monthsOnX ? formatMonth(String(value)) : String(value ?? '')
  const formatY = (value: unknown) => formatValue(Number(value), result.spec, { compact: true })
  const sideways = result.kind === 'bar' && result.horizontal
  const stackId = result.stacked ? 'stack' : undefined

  const xAxis = sideways ? (
    <YAxis dataKey="x" type="category" tickLine={false} axisLine={false} width={96} tickFormatter={formatX} />
  ) : (
    <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatX} />
  )
  const yAxis = sideways ? (
    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatY} />
  ) : (
    // Lines show change, so they scale to the data rather than starting at zero.
    <YAxis
      tickLine={false}
      axisLine={false}
      width={64}
      tickFormatter={formatY}
      domain={result.kind === 'line' ? ['auto', 'auto'] : undefined}
    />
  )
  const shared = (
    <>
      <CartesianGrid vertical={sideways} horizontal={!sideways} />
      {xAxis}
      {yAxis}
      <ChartTooltip
        cursor={result.kind === 'bar'}
        content={
          <ChartTooltipContent
            indicator="dot"
            labelFormatter={(_, payload) => {
              return formatLabel(payload?.[0]?.payload?.x)
            }}
            formatter={(value, name, item) => (
              <div className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{config[String(name)]?.label ?? name}</span>
                </span>
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {formatValue(Number(value), result.spec)}
                </span>
              </div>
            )}
          />
        }
      />
      {result.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      {chartRules(result, formatX, formatY)}
    </>
  )

  return (
    <Card data-slot={`dashboard-${result.kind}`} className="@container/card">
      <CardHeader>
        {result.title && <CardTitle>{result.title}</CardTitle>}
        {result.description && <CardDescription>{result.description}</CardDescription>}
        {result.ranges.length > 1 && (
          <CardAction>
            <ToggleGroup
              type="single"
              value={range}
              onValueChange={(value) => value && setRange(value)}
              aria-label="Time range"
            >
              {result.ranges.map((option) => (
                <ToggleGroupItem key={option} value={option} className="px-2.5 text-xs">
                  {rangeLabel(option)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {points.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">No data in this range yet.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
            {result.kind === 'bar' ? (
              <BarChart data={points} layout={sideways ? 'vertical' : 'horizontal'} stackOffset="sign" margin={{ left: 4, right: 12 }}>
                {shared}
                {result.series.map((series) => (
                  <Bar key={series.key} dataKey={series.key} fill={`var(--color-${series.key})`} stackId={stackId} radius={result.stacked ? 0 : 4}>
                    {points.some((point) => point.tone) &&
                      points.map((point) => (
                        <Cell key={String(point.x)} fill={toneColour(point.tone as BarTone | undefined, series.key)} data-tone={point.tone} />
                      ))}
                  </Bar>
                ))}
              </BarChart>
            ) : result.kind === 'line' ? (
              <LineChart data={points} margin={{ left: 4, right: 12 }}>
                {shared}
                {result.series.map((series) => (
                  <Line key={series.key} dataKey={series.key} type={CURVES[result.curve]} stroke={`var(--color-${series.key})`} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={points} margin={{ left: 4, right: 12 }}>
                <defs>
                  {result.series.map((series) => (
                    <linearGradient key={series.key} id={`fill-${id}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--color-${series.key})`} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={`var(--color-${series.key})`} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                {shared}
                {result.series.map((series) => (
                  <Area
                    key={series.key}
                    dataKey={series.key}
                    type={CURVES[result.curve]}
                    fill={`url(#fill-${id}-${series.key})`}
                    stroke={`var(--color-${series.key})`}
                    stackId={stackId}
                  />
                ))}
              </AreaChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

const TONES: Record<BarTone, string> = { up: 'var(--gain)', down: 'var(--loss)', highlight: 'var(--highlight)' }

function toneColour(tone: BarTone | undefined, key: string): string {
  return tone ? TONES[tone] : `var(--color-${key})`
}

/** Reference lines and bands. Sideways bars swap the axes, so a y rule runs down the chart. */
function chartRules(
  result: ChartResult,
  formatX: (value: unknown) => string,
  formatY: (value: unknown) => string
): ReactNode {
  const sideways = result.kind === 'bar' && result.horizontal
  return result.rules.map((rule, index) => {
    const valueAxis = sideways ? 'x' : 'y'
    const label = (text: string) => (
      <Label value={text} position={sideways ? 'insideTopRight' : 'insideTopLeft'} className="fill-muted-foreground text-[11px]" />
    )
    if (rule.from !== undefined && rule.to !== undefined) {
      const band = { [`${valueAxis}1`]: rule.from, [`${valueAxis}2`]: rule.to }
      return (
        <ReferenceArea key={index} {...band} fill="var(--muted-foreground)" fillOpacity={0.08} stroke="none" ifOverflow="extendDomain">
          {label(rule.label ?? `${formatY(rule.from)} to ${formatY(rule.to)}`)}
        </ReferenceArea>
      )
    }
    const along = rule.axis === 'x' ? (sideways ? 'y' : 'x') : valueAxis
    const position = { [along]: rule.value }
    return (
      <ReferenceLine
        key={index}
        {...position}
        stroke="var(--muted-foreground)"
        strokeDasharray="4 4"
        ifOverflow="extendDomain"
        data-slot="dashboard-rule"
      >
        {label(rule.label ?? (rule.axis === 'x' ? formatX(rule.value) : formatY(rule.value)))}
      </ReferenceLine>
    )
  })
}

/** A treemap: tiles sized by value, coloured by group, with the share of the whole on each. */
function TreemapCard({ result }: { result: Result<'treemap'> }) {
  const config = useMemo(() => seriesConfig(result.groups), [result.groups])
  const tiles = result.tiles.map((tile) => ({ ...tile, name: tile.label, fill: `var(--color-${tile.group})` }))
  return (
    <Card data-slot="dashboard-treemap" className="@container/card">
      <CardHeader>
        {result.title && <CardTitle>{result.title}</CardTitle>}
        {result.description && <CardDescription>{result.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {tiles.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">Nothing to show yet.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
            <Treemap
              data={tiles}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              content={<TreemapTile total={result.total} spec={result.spec} />}
            >
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">{item.payload?.name}</span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatValue(Number(value), result.spec)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
            </Treemap>
          </ChartContainer>
        )}
        {result.groups.length > 1 && (
          <ul className="text-muted-foreground mt-3 flex flex-wrap justify-center gap-4 text-xs">
            {result.groups.map((group) => (
              <li key={group.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: `var(--color-${group.key})` }} />
                {group.label}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function TreemapTile(props: {
  total: number
  spec: Result<'treemap'>['spec']
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  fill?: string
  depth?: number
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, value = 0, fill, depth, total } = props
  if (depth === 0) return null
  const roomy = width > 64 && height > 36
  return (
    <g role="img" aria-label={`${name}: ${formatValue(value, props.spec)}`} data-slot="dashboard-treemap-tile">
      <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} stroke="var(--card)" strokeWidth={2} />
      {roomy && (
        <text x={x + 8} y={y + 18} className="fill-white text-xs font-medium" style={{ pointerEvents: 'none' }}>
          {name}
          <tspan x={x + 8} dy="1.3em" className="fill-white/80 text-[11px] font-normal">
            {total > 0 ? `${((value / total) * 100).toFixed(1)}%` : ''}
          </tspan>
        </text>
      )}
    </g>
  )
}

/** A waterfall: each bar rises or falls from the running total, ending with the total. */
function WaterfallCard({ result }: { result: Result<'waterfall'> }) {
  const points = result.steps.map((step) => ({
    x: step.x,
    range: [Math.min(step.start, step.end), Math.max(step.start, step.end)],
    change: step.change,
    tone: step.total ? 'total' : step.change < 0 ? 'down' : 'up',
  }))
  const formatY = (value: unknown) => formatValue(Number(value), result.spec, { compact: true })
  const formatX = (value: unknown) =>
    /^\d{4}-\d{2}$/.test(String(value)) ? formatMonth(String(value), 'short') : String(value)
  return (
    <Card data-slot="dashboard-waterfall" className="@container/card">
      <CardHeader>
        {result.title && <CardTitle>{result.title}</CardTitle>}
        {result.description && <CardDescription>{result.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {points.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">Nothing to show yet.</p>
        ) : (
          <ChartContainer config={{ range: { label: 'Change', color: 'var(--chart-1)' } }} className="aspect-auto h-[250px] w-full">
            <BarChart data={points} margin={{ left: 4, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatX} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={formatY} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                cursor
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => formatX(payload?.[0]?.payload?.x)}
                    formatter={(_value, _name, item) => (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {item.payload?.tone === 'total'
                          ? formatValue(Number(item.payload?.change), result.spec)
                          : `${Number(item.payload?.change) >= 0 ? '+' : ''}${formatValue(Number(item.payload?.change), result.spec)}`}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="range" radius={4} isAnimationActive={false}>
                {points.map((point) => (
                  <Cell
                    key={point.x}
                    data-tone={point.tone}
                    fill={point.tone === 'total' ? 'var(--chart-1)' : point.tone === 'down' ? 'var(--loss)' : 'var(--gain)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/** Based on the shadcn donut chart with text. */
function PieCard({ result }: { result: Result<'pie'> }) {
  const config = useMemo(() => seriesConfig(result.slices), [result.slices])
  const data = result.slices.map((slice) => ({ ...slice, fill: `var(--color-${slice.key})` }))
  return (
    <Card data-slot="dashboard-pie" className="@container/card">
      <CardHeader>
        {result.title && <CardTitle>{result.title}</CardTitle>}
        {result.description && <CardDescription>{result.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">Nothing to show yet.</p>
        ) : (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: item.payload?.fill }} />
                          <span className="text-muted-foreground">{name}</span>
                        </span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatValue(Number(value), result.spec)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={result.donut ? 60 : 0} strokeWidth={4}>
                {result.donut && (
                  <Label
                    content={({ viewBox }) =>
                      viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                            {formatValue(result.total, result.spec, { compact: true })}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                            Total
                          </tspan>
                        </text>
                      ) : null
                    }
                  />
                )}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-wrap gap-x-4 gap-y-1 text-xs">
        {result.slices.map((slice) => (
          <span key={slice.key} className="text-muted-foreground flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: `var(--chart-${(Number(slice.key.slice(1)) % 5) + 1})` }} />
            {slice.label}
          </span>
        ))}
      </CardFooter>
    </Card>
  )
}

function TableCard({ result, onEditCell }: { result: Result<'table'>; onEditCell?: EditCell }) {
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const edit = result.edit && onEditCell ? result.edit : undefined

  const setCell = async (row: number, column: string, value: string) => {
    const key = edit?.keys[row]
    if (!edit || !key || !onEditCell) return
    setSaving(row)
    setError(null)
    try {
      await onEditCell(edit.source, { key, column, value })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That change could not be saved.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card data-slot="dashboard-table" className="gap-4">
      {(result.title || result.description) && (
        <CardHeader>
          {result.title && <CardTitle>{result.title}</CardTitle>}
          {result.description && <CardDescription>{result.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        <DataTable
          columns={result.columns}
          rows={result.rows}
          highlighted={result.highlighted}
          signed={result.signed}
          renderCell={
            edit && edit.columns.length > 0
              ? (rowIndex, columnIndex, content) => {
                  const editable = edit.columns.find((entry) => entry.index === columnIndex)
                  if (!editable) return content
                  const current = result.rows[rowIndex][columnIndex]
                  const label = edit.labels[rowIndex]
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!edit.keys[rowIndex] || saving !== null}
                          aria-label={`Set ${editable.column} for ${label}`}
                          title={edit.keys[rowIndex] ? undefined : 'Another row has the same key, so this one cannot be edited.'}
                          className="hover:bg-accent -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 disabled:opacity-60"
                        >
                          {content}
                          {saving === rowIndex ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <ChevronDown className="text-muted-foreground size-3" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {editable.values.map((value) => (
                          <DropdownMenuItem
                            key={value}
                            disabled={value === current}
                            onSelect={() => void setCell(rowIndex, editable.column, value)}
                          >
                            <Check className={cn('size-3.5', value !== current && 'invisible')} />
                            {value}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }
              : undefined
          }
        />
        {edit?.problem && (
          <p className="text-muted-foreground text-xs">{edit.problem}</p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DataTable({
  columns,
  rows,
  sortable = false,
  highlighted,
  signed = [],
  renderCell,
}: {
  columns: Result<'table'>['columns']
  rows: Result<'table'>['rows']
  sortable?: boolean
  /** Parallel to rows: rows to pick out, such as holdings above a cap. */
  highlighted?: boolean[]
  /** Columns shown green when positive and red when negative. */
  signed?: number[]
  /** Wraps a cell's formatted content, given the row's index in `rows`. */
  renderCell?: (row: number, column: number, content: ReactNode) => ReactNode
}) {
  const [sort, setSort] = useState<{ index: number; descending: boolean } | null>(null)
  // Sorted positions into `rows`, so a cell can be traced back to its row.
  const order = useMemo(() => {
    const indexes = rows.map((_, index) => index)
    if (!sort) return indexes
    indexes.sort((a, b) => {
      const x = rows[a][sort.index]
      const y = rows[b][sort.index]
      if (x === null) return 1
      if (y === null) return -1
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    })
    return sort.descending ? indexes.reverse() : indexes
  }, [rows, sort])

  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No rows yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            {columns.map((column, index) => {
              const numeric = ['currency', 'number', 'integer', 'percent', 'percent-points'].includes(column.spec.format)
              return (
                <TableHead key={column.key} className={cn(numeric && 'text-right')}>
                  {sortable ? (
                    <button
                      type="button"
                      className="hover:text-foreground inline-flex items-center gap-1"
                      onClick={() =>
                        setSort((current) => ({
                          index,
                          descending: current?.index === index ? !current.descending : false,
                        }))
                      }
                    >
                      {column.label}
                      {sort?.index === index && <span aria-hidden>{sort.descending ? '↓' : '↑'}</span>}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.map((rowIndex) => (
            <TableRow
              key={rowIndex}
              data-highlighted={highlighted?.[rowIndex] || undefined}
              className={cn(highlighted?.[rowIndex] && 'bg-highlight/15 hover:bg-highlight/25')}
            >
              {rows[rowIndex].map((value, index) => {
                const spec = columns[index].spec
                const numeric = typeof value === 'number'
                const content = formatValue(value, spec)
                const tone = numeric && signed.includes(index) && value !== 0 ? (value > 0 ? 'gain' : 'loss') : undefined
                return (
                  <TableCell
                    key={columns[index].key}
                    data-tone={tone}
                    className={cn(numeric && 'text-right tabular-nums', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}
                  >
                    {renderCell ? renderCell(rowIndex, index, content) : content}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProgressCard({ result }: { result: Result<'progress'> }) {
  const percent = Math.min(100, Math.max(0, (result.value / result.max) * 100))
  const targetPercent = result.target === null ? null : Math.min(100, Math.max(0, (result.target / result.max) * 100))
  return (
    <Card data-slot="dashboard-progress" className="@container/card shadow-xs">
      <CardHeader>
        <CardDescription>{result.label}</CardDescription>
        <CardTitle className="text-2xl font-semibold whitespace-nowrap tabular-nums">{formatValue(result.value, result.spec)}</CardTitle>
        <CardAction>
          <Badge variant="outline">{percent.toFixed(0)}%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Progress value={percent} aria-label={`${result.label}: ${percent.toFixed(0)}%`} />
          {targetPercent !== null && (
            <span
              aria-hidden
              data-slot="dashboard-progress-target"
              className="bg-foreground absolute -top-1 h-4 w-0.5 rounded-full"
              style={{ left: `calc(${targetPercent}% - 1px)` }}
            />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {formatValue(Math.max(0, result.max - result.value), result.spec)} left of{' '}
          {formatValue(result.max, result.spec)}
          {result.target !== null ? `. Target ${formatValue(result.target, result.spec)}` : ''}
          {result.description ? `. ${result.description}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}

/** Based on the shadcn radial chart with text. */
function GaugeCard({ result }: { result: Result<'progress'> }) {
  const percent = Math.min(100, Math.max(0, (result.value / result.max) * 100))
  return (
    <Card data-slot="dashboard-progress" className="@container/card shadow-xs">
      <CardHeader>
        <CardDescription>{result.label}</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer config={{ value: { label: result.label, color: 'var(--chart-1)' } }} className="mx-auto aspect-square max-h-[180px]">
          <RadialBarChart data={[{ value: result.value }]} startAngle={90} endAngle={-270} innerRadius="75%" outerRadius="100%">
            <PolarAngleAxis type="number" domain={[0, result.max]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" background cornerRadius={10} fill="var(--color-value)" aria-label={`${result.label}: ${percent.toFixed(0)}%`} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan x="50%" dy="-0.2em" className="fill-foreground text-2xl font-bold">
                {percent.toFixed(0)}%
              </tspan>
              <tspan x="50%" dy="1.6em" className="fill-muted-foreground text-xs">
                of {formatValue(result.max, result.spec, { compact: true })}
              </tspan>
            </text>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-muted-foreground justify-center text-sm tabular-nums">
        {formatValue(result.value, result.spec)} used, {formatValue(Math.max(0, result.max - result.value), result.spec)} left
        {result.target !== null && `, target ${formatValue(result.target, result.spec)}`}
      </CardFooter>
    </Card>
  )
}

function ListCard({ result }: { result: Result<'list'> }) {
  return (
    <Card data-slot="dashboard-list" className="gap-4">
      {(result.title || result.description) && (
        <CardHeader>
          {result.title && <CardTitle>{result.title}</CardTitle>}
          {result.description && <CardDescription>{result.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {result.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing to show yet.</p>
        ) : (
          <ul className="divide-y">
            {result.items.map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                {item.detail && (
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {result.detailSpec ? formatValue(item.detail, result.detailSpec) : item.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function TextCard({ result }: { result: Result<'text'> }) {
  return (
    <div className="text-muted-foreground space-y-1 px-1 text-sm leading-relaxed">
      {result.title && <h3 className="text-foreground font-medium">{result.title}</h3>}
      <p className="whitespace-pre-line">{result.text}</p>
    </div>
  )
}

function ErrorCard({ result }: { result: Result<'error'> }) {
  return (
    <Card data-slot="dashboard-error" className="border-destructive/40 gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-destructive flex items-center gap-2 text-sm">
          <CircleAlert className="size-4" />
          {result.title ?? 'Component error'}
        </CardTitle>
        <CardDescription>{result.message}</CardDescription>
      </CardHeader>
    </Card>
  )
}

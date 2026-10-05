'use client'

import { useId, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { CircleAlert, TrendingDown, TrendingUp } from 'lucide-react'
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
import { filterRange, rangeLabel, type ItemResult } from '@/lib/dashboard/evaluate'
import { formatDate, formatValue } from '@/lib/dashboard/format'
import { cn } from '@/lib/utils'

type Result<K extends ItemResult['kind']> = Extract<ItemResult, { kind: K }>

export function DashboardItemView({ result }: { result: ItemResult }) {
  switch (result.kind) {
    case 'stat':
      return <StatCard result={result} />
    case 'area':
      return <AreaCard result={result} />
    case 'table':
      return <TableCard result={result} />
    case 'progress':
      return <ProgressCard result={result} />
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

/** Based on the shadcn interactive area chart. */
function AreaCard({ result }: { result: Result<'area'> }) {
  const [range, setRange] = useState(result.ranges[result.ranges.length - 1] ?? 'all')
  const points = useMemo(() => filterRange(result.points, range), [result.points, range])
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        result.series.map((series, index) => [
          series.key,
          { label: series.label, color: `var(--chart-${(index % 5) + 1})` },
        ])
      ),
    [result.series]
  )
  const datesOnX = typeof points[0]?.x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(points[0].x))
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')

  return (
    <Card data-slot="dashboard-area" className="@container/card">
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
            <AreaChart data={points} margin={{ left: 4, right: 12 }}>
              <defs>
                {result.series.map((series) => (
                  <linearGradient key={series.key} id={`fill-${id}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${series.key})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(--color-${series.key})`} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="x"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => (datesOnX ? formatDate(String(value), 'short') : String(value))}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value) => formatValue(Number(value), result.spec, { compact: true })}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) => {
                      const x = payload?.[0]?.payload?.x
                      return datesOnX ? formatDate(String(x)) : String(x ?? '')
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
              {result.series.map((series) => (
                <Area
                  key={series.key}
                  dataKey={series.key}
                  type="monotone"
                  fill={`url(#fill-${id}-${series.key})`}
                  stroke={`var(--color-${series.key})`}
                  stackId={result.stacked ? 'stack' : undefined}
                />
              ))}
              {result.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function TableCard({ result }: { result: Result<'table'> }) {
  return (
    <Card data-slot="dashboard-table" className="gap-4">
      {(result.title || result.description) && (
        <CardHeader>
          {result.title && <CardTitle>{result.title}</CardTitle>}
          {result.description && <CardDescription>{result.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <DataTable columns={result.columns} rows={result.rows} />
      </CardContent>
    </Card>
  )
}

export function DataTable({
  columns,
  rows,
  sortable = false,
}: {
  columns: Result<'table'>['columns']
  rows: Result<'table'>['rows']
  sortable?: boolean
}) {
  const [sort, setSort] = useState<{ index: number; descending: boolean } | null>(null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const copy = [...rows].sort((a, b) => {
      const x = a[sort.index]
      const y = b[sort.index]
      if (x === null) return 1
      if (y === null) return -1
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    })
    return sort.descending ? copy.reverse() : copy
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
          {sorted.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((value, index) => {
                const spec = columns[index].spec
                const numeric = typeof value === 'number'
                return (
                  <TableCell key={columns[index].key} className={cn(numeric && 'text-right tabular-nums')}>
                    {formatValue(value, spec)}
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
        <Progress value={percent} aria-label={`${result.label}: ${percent.toFixed(0)}%`} />
        <p className="text-muted-foreground text-sm">
          {formatValue(Math.max(0, result.max - result.value), result.spec)} left of{' '}
          {formatValue(result.max, result.spec)}
          {result.description ? `. ${result.description}` : ''}
        </p>
      </CardContent>
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

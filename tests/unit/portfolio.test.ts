import { expect, test } from '@playwright/test'
import { evaluateItem, type ChartResult, type ItemResult } from '@/lib/dashboard/evaluate'
import { evaluateAggregate, parseExpression, periodStart } from '@/lib/dashboard/expression'
import { withJoins } from '@/lib/dashboard/join'
import { loadDashboardData } from '@/lib/dashboard/load'
import { parseDashboard, parseDashboardYaml } from '@/lib/dashboard/spec'
import { PORTFOLIO_FILES } from '../fixtures/portfolio'

const TODAY = new Date('2026-10-19T20:00:00Z')
const provider = {
  readFile: async (path: string) => {
    const content = PORTFOLIO_FILES[path]
    if (content === undefined) throw new Error(`missing ${path}`)
    return content
  },
}

async function portfolio(): Promise<Record<string, ItemResult>> {
  const spec = parseDashboard(PORTFOLIO_FILES['isa/portfolio.md'])
  expect(spec.issues).toEqual([])
  const data = withJoins(await loadDashboardData(provider, 'isa/portfolio.md', spec.data, TODAY), spec.joins)
  const results: Record<string, ItemResult> = {}
  for (const row of spec.rows) {
    for (const item of row.items) {
      results[item.kind === 'stat' || item.kind === 'progress' ? item.label : (item.title ?? item.kind)] = evaluateItem(item, data)
    }
  }
  return results
}

function chart(result: ItemResult | undefined, kind: ChartResult['kind']): ChartResult {
  if (result?.kind === 'error') throw new Error(result.message)
  expect(result?.kind).toBe(kind)
  return result as ChartResult
}

function as<K extends ItemResult['kind']>(result: ItemResult | undefined, kind: K): Extract<ItemResult, { kind: K }> {
  if (result?.kind === 'error') throw new Error(result.message)
  expect(result?.kind).toBe(kind)
  return result as Extract<ItemResult, { kind: K }>
}

test('change, change_pct, drawdown and share compare with earlier dates and the whole', async () => {
  const results = await portfolio()
  // 1800 now against 2000 on 31 August, the last snapshot on or before 19 September.
  expect(as(results['Change this month'], 'stat').value).toBe(-200)
  expect(as(results['Change this month'], 'stat').spec.format).toBe('currency')
  // Against 1000 at the end of last year.
  expect(as(results['Change this year'], 'stat').value).toBeCloseTo(0.8)
  expect(as(results['Change this year'], 'stat').spec.format).toBe('percent')
  // 10% below the 2000 peak in August.
  expect(as(results['Drop from peak'], 'stat').value).toBeCloseTo(-0.1)
  expect(as(results['Funds share'], 'stat').value).toBeCloseTo(0.5)
})

test('several measures share one chart, with labels and a reference line', async () => {
  const measures = chart((await portfolio())['Value against paid in'], 'line')
  expect(measures.series).toEqual([
    { key: 'm0', label: 'Value' },
    { key: 'm1', label: 'Paid in' },
  ])
  expect(measures.points.at(-1)).toMatchObject({ x: '2026-10-19', m0: 1800, m1: 1500 })
  expect(measures.rules).toEqual([{ axis: 'y', value: 2000, label: 'Goal' }])
})

test('rebase starts a line at 100 and drawdown charts the drop from the peak', async () => {
  const results = await portfolio()
  const rebased = chart(results['Growth from 100'], 'line')
  expect(rebased.points[0].value).toBe(100)
  expect(rebased.points.at(-1)!.value).toBe(180)
  expect(rebased.spec.format).toBe('number')

  const drawdown = chart(results['Drawdown'], 'area')
  expect(drawdown.points.map((point) => Number(Number(point.value).toFixed(2)))).toEqual([
    0, 0, 0, -0.2, 0, 0, 0, 0, 0, -0.05, -0.1,
  ])
  expect(drawdown.spec.format).toBe('percent')
})

test('bars are green or red by sign, a highlight wins, and bands resolve', async () => {
  const bar = chart((await portfolio())['Profit or loss by holding'], 'bar')
  expect(bar.points.map((point) => [point.x, point.tone])).toEqual([
    ['AMD', 'up'],
    ['GOOGL', 'up'],
    ['TSM', 'down'],
    ['VWRP', 'highlight'],
  ])
  expect(bar.rules).toEqual([{ axis: 'y', from: -20, to: 20, label: 'Noise' }])
})

test('a treemap sizes tiles by value within groups', async () => {
  const treemap = as((await portfolio())['Holdings map'], 'treemap')
  expect(treemap.tiles.map((tile) => [tile.label, tile.value, tile.group])).toEqual([
    ['VWRP', 900, 'g0'],
    ['GOOGL', 360, 'g1'],
    ['TSM', 360, 'g1'],
    ['AMD', 180, 'g1'],
  ])
  expect(treemap.groups).toEqual([
    { key: 'g0', label: 'Fund' },
    { key: 'g1', label: 'Company' },
  ])
  expect(treemap.total).toBe(1800)
})

test('a waterfall runs a total through each step and ends with it', async () => {
  const waterfall = as((await portfolio())['Where the profit came from'], 'waterfall')
  expect(waterfall.steps).toEqual([
    { x: 'VWRP', start: 0, end: 150, change: 150, total: false },
    { x: 'GOOGL', start: 150, end: 230, change: 80, total: false },
    { x: 'AMD', start: 230, end: 240, change: 10, total: false },
    { x: 'TSM', start: 240, end: 210, change: -30, total: false },
    { x: 'Total', start: 0, end: 210, change: 210, total: true },
  ])
})

test('progress carries a target', async () => {
  const progress = as((await portfolio())['Paid in this year'], 'progress')
  expect(progress).toMatchObject({ value: 1500, max: 20000, target: 15000 })
})

test('a join adds the matching row of another Dataset, and tables colour and highlight rows', async () => {
  const table = as((await portfolio())['Against target'], 'table')
  expect(table.columns.map((column) => column.label)).toEqual(['Ticker', 'Value', 'Unrealised P/L', 'Weight', 'Target weight'])
  expect(table.rows).toEqual([
    ['VWRP', 900, 150, 50, 25],
    ['GOOGL', 360, 80, 20, 15],
    ['TSM', 360, -30, 20, 15],
    ['AMD', 180, 10, 10, null],
  ])
  // AMD has no target row, so it has no cap to be over.
  expect(table.highlighted).toEqual([false, true, true, false])
  // Only P/L has a negative value, so only it is coloured by default.
  expect(table.signed).toEqual([2])
})

test('the spec reports mistakes in the new settings', () => {
  const spec = parseDashboardYaml(`
data:
  holdings: holdings.md
  both: { join: [holdings, missing], on: ticker }
rows:
  - items:
      - line: { source: holdings, x: date, y: [sum(a), sum(b)], series: kind }
      - bar: { source: holdings, x: ticker, y: sum(value), rules: [{ from: 1 }] }
`)
  expect(spec.issues).toEqual([
    'data.both joins missing, which is not a Dataset listed under data.',
    'rows[0].items[0]: use series or a list of y values, not both.',
    'rows[0].items[1].rules[0]: a band needs both from and to.',
  ])
})

test('periods step back by calendar months and years', () => {
  expect(periodStart('2026-03-31', '1m')).toBe('2026-02-28')
  expect(periodStart('2026-10-19', '3m')).toBe('2026-07-19')
  expect(periodStart('2026-10-19', 'ytd')).toBe('2025-12-31')
  expect(periodStart('2026-10-19', 'mtd')).toBe('2026-09-30')
  expect(periodStart('2024-02-29', '1y')).toBe('2023-02-28')
  expect(() => evaluateAggregate(parseExpression('change(value, 1m)'), [], TODAY)).toThrow(/use it in a stat/)
  expect(() => evaluateAggregate(parseExpression('change(value, 7)'), [], TODAY)).toThrow(/needs a period/)
})

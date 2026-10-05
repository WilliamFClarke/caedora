import { expect, test } from '@playwright/test'
import { parseDataset } from '../lib/dataset'
import { evaluateItem, filterRange, type DashboardData, type ItemResult } from '../lib/dashboard/evaluate'
import { parseExpression, evaluateAggregate, ukTaxYear } from '../lib/dashboard/expression'
import { formatValue } from '../lib/dashboard/format'
import { applyLayoutEdit } from '../lib/dashboard/layout'
import { loadDashboardData } from '../lib/dashboard/load'
import { parseDashboard } from '../lib/dashboard/spec'
import { validateDocument } from '../lib/okf'
import { UK_PERSONAL_FINANCE_FILES } from '../lib/templates/uk-personal-finance'
import { CURATED_TEMPLATES, fetchTemplateFiles } from '../lib/vault-templates'

const TODAY = new Date(2026, 9, 5)
const files = new Map(UK_PERSONAL_FINANCE_FILES.map((file) => [file.path, file.content]))
const provider = {
  readFile: async (path: string) => {
    const content = files.get(path)
    if (content === undefined) throw new Error(`missing ${path}`)
    return content
  },
}

async function financeDashboard(): Promise<Record<string, ItemResult>> {
  const spec = parseDashboard(files.get('finance/dashboard.md')!)
  expect(spec.issues).toEqual([])
  const data = await loadDashboardData(provider, 'finance/dashboard.md', spec.data, TODAY)
  const results: Record<string, ItemResult> = {}
  for (const row of spec.rows) {
    for (const item of row.items) {
      const result = evaluateItem(item, data)
      const name = 'label' in item && item.kind !== 'list' ? item.label : (item.title ?? item.kind)
      results[name] = result
    }
  }
  return results
}

test.describe('dashboard expressions', () => {
  test('works out UK tax years from 6 April', () => {
    expect(ukTaxYear('2026-04-05')).toBe('2025-26')
    expect(ukTaxYear('2026-04-06')).toBe('2026-27')
    expect(ukTaxYear('2027-01-15')).toBe('2026-27')
  })

  test('evaluates arithmetic over aggregates', () => {
    const rows = [{ a: 2, b: 10 }, { a: 3, b: 30 }].map((row) => ({
      today: TODAY,
      column: (path: string[]) => row[path[0] as 'a' | 'b'],
    }))
    expect(evaluateAggregate(parseExpression('sum(a) / sum(b)'), rows, TODAY)).toBe(0.125)
    expect(evaluateAggregate(parseExpression('count() * 2 - 1'), rows, TODAY)).toBe(3)
    expect(() => evaluateAggregate(parseExpression('a + 1'), rows, TODAY)).toThrow(/Wrap a in an aggregate/)
  })

  test('filters chart points to a time range', () => {
    const points = ['2025-09-30', '2026-03-31', '2026-08-31', '2026-09-30'].map((x) => ({ x }))
    expect(filterRange(points, '3m').map((p) => p.x)).toEqual(['2026-08-31', '2026-09-30'])
    expect(filterRange(points, '12m')).toHaveLength(4)
    expect(filterRange(points, 'all')).toHaveLength(4)
  })

  test('formats GBP values', () => {
    expect(formatValue(1240.5, { format: 'currency', currency: 'GBP' })).toBe('£1,240.50')
    expect(formatValue(0.6612, { format: 'percent', currency: 'GBP' })).toBe('66.1%')
    expect(formatValue(4.39, { format: 'percent-points', currency: 'GBP' })).toBe('4.39%')
    expect(formatValue('2028-07-31', { format: 'date', currency: 'GBP' })).toBe('31 Jul 2028')
  })
})

test.describe('UK personal finance template', () => {
  test('every file is a conformant OKF concept with clean Datasets', () => {
    for (const [path, content] of files) {
      expect(validateDocument(path, content), path).toEqual([])
    }
  })

  test('finance dashboard renders every component from the example data', async () => {
    const results = await financeDashboard()
    for (const [name, result] of Object.entries(results)) {
      expect(result.kind, `${name}: ${'message' in result ? result.message : ''}`).not.toBe('error')
    }

    const balances = parseDataset('finance/balances.md', files.get('finance/balances.md')!)
    const latest = balances.rows.filter((row) => row.date === '2026-09-30')
    const netWorth = latest.reduce((total, row) => total + (row.balance as number), 0)

    const stat = results['Net worth']
    expect(stat.kind === 'stat' && stat.value).toBeCloseTo(netWorth, 2)
    expect(stat.kind === 'stat' && stat.trend?.delta).toBeGreaterThan(0)

    const debt = results['Debt']
    expect(debt.kind === 'stat' && (debt.value as number)).toBeLessThan(0)

    const isa = results['ISA allowance used']
    expect(isa).toMatchObject({ kind: 'progress', value: 8165, max: 20000 })
    const lisa = results['Lifetime ISA allowance used']
    expect(lisa).toMatchObject({ kind: 'progress', value: 2665, max: 4000 })

    expect(results['Fixed rate ends']).toMatchObject({ kind: 'stat', value: '2028-07-31' })
    const ltv = results['Mortgage loan to value']
    expect(ltv.kind === 'stat' && ltv.value).toBeCloseTo(214900 / 325000, 4)

    const chart = results['Net worth over time']
    expect(chart.kind).toBe('area')
    if (chart.kind === 'area') {
      expect(chart.points).toHaveLength(6)
      expect(chart.points[5].value).toBeCloseTo(netWorth, 2)
    }

    const assets = results['Assets by category']
    if (assets.kind === 'area') {
      expect(assets.series.map((series) => series.label).sort()).toEqual([
        'Cash',
        'Investments',
        'Pensions',
        'Property',
      ])
    }

    const table = results['Latest balances']
    expect(table.kind).toBe('table')
    if (table.kind === 'table') {
      expect(table.rows).toHaveLength(9)
      expect(table.rows[0][0]).toBe('Home')
      expect(table.columns.map((column) => column.label)).toEqual(['Name', 'Provider', 'Category', 'Balance', 'Date'])
    }
  })

  test('snapshots carry forward accounts that were not updated on a date', async () => {
    const spec = parseDashboard(
      '```caedora-dashboard\ndata: { b: balances.md }\nrows:\n  - items:\n      - area: { source: b, x: date, y: sum(balance), snapshots: true }\n```'
    )
    files.set(
      'test/balances.md',
      `---\ntype: Dataset\ndataset:\n  key: [date, account]\n  columns:\n    date: { type: date }\n    account: { type: text }\n    balance: { type: currency }\n---\n\n| date | account | balance |\n| --- | --- | --- |\n| 2026-01-31 | a | 100 |\n| 2026-01-31 | b | 50 |\n| 2026-02-28 | a | 120 |\n`
    )
    const data: DashboardData = await loadDashboardData(provider, 'test/dashboard.md', spec.data, TODAY)
    const result = evaluateItem(spec.rows[0].items[0], data)
    expect(result.kind === 'area' && result.points).toEqual([
      { x: '2026-01-31', value: 150 },
      { x: '2026-02-28', value: 170 },
    ])
  })

  test('reports a helpful error instead of breaking the dashboard', async () => {
    const spec = parseDashboard(
      '```caedora-dashboard\ndata: { b: ../finance/balances.md }\nrows:\n  - items:\n      - stat: { label: Broken, source: b, value: sum(nope) }\n```'
    )
    const data = await loadDashboardData(provider, 'test/dashboard.md', spec.data, TODAY)
    expect(evaluateItem(spec.rows[0].items[0], data)).toEqual({
      kind: 'error',
      title: 'Broken',
      message: 'Balances has no column called nope.',
    })
  })
})

test.describe('template dashboards', () => {
  test('every curated template imports with a working dashboard', async () => {
    for (const template of CURATED_TEMPLATES) {
      const templateFiles = await fetchTemplateFiles(template)
      const dashboards = templateFiles.filter((file) => /type: Dashboard/.test(file.content))
      expect(dashboards, template.id).toHaveLength(1)

      const store = new Map(templateFiles.map((file) => [file.path, file.content]))
      for (const [path, content] of store) {
        const errors = validateDocument(path, content).filter((issue) => issue.severity === 'error')
        expect(errors, path).toEqual([])
      }

      const [dashboard] = dashboards
      const spec = parseDashboard(dashboard.content)
      expect(spec.issues, template.id).toEqual([])
      const data = await loadDashboardData(
        { readFile: async (path) => store.get(path) ?? Promise.reject(new Error(path)) },
        dashboard.path,
        spec.data,
        TODAY
      )
      for (const row of spec.rows) {
        for (const item of row.items) {
          const result = evaluateItem(item, data)
          expect(result.kind, `${template.id}: ${'message' in result ? result.message : ''}`).not.toBe('error')
        }
      }
    }
  })
})

test.describe('dashboard layout edits', () => {
  const body = [
    '# Finance',
    '',
    '```caedora-dashboard',
    'data: { b: balances.md }',
    'rows:',
    '  - columns: 2',
    '    items:',
    '      - stat: { label: A, source: b, value: sum(balance) }  # first',
    '      - stat: { label: B, source: b, value: sum(balance) }',
    '  - columns: 1',
    '    items:',
    '      - text: Note',
    '```',
    '',
    'After the block.',
    '',
  ].join('\n')
  const labels = (markdown: string) =>
    parseDashboard(markdown).rows.map((row) =>
      row.items.map((item) => ('label' in item && item.kind !== 'list' ? item.label : item.kind))
    )

  test('reorders items within and across rows and keeps the rest of the note', () => {
    const swapped = applyLayoutEdit(body, { kind: 'move-item', from: { row: 0, item: 1 }, to: { row: 0, index: 0 } })
    expect(labels(swapped)).toEqual([['B', 'A'], ['text']])
    expect(swapped).toContain('# first')
    expect(swapped.startsWith('# Finance\n\n```caedora-dashboard\n')).toBe(true)
    expect(swapped.endsWith('```\n\nAfter the block.\n')).toBe(true)

    const across = applyLayoutEdit(body, { kind: 'move-item', from: { row: 1, item: 0 }, to: { row: 0, index: 1 } })
    expect(labels(across)).toEqual([['A', 'text', 'B']])

    const newRow = applyLayoutEdit(body, { kind: 'item-to-new-row', from: { row: 0, item: 0 }, at: 2 })
    expect(labels(newRow)).toEqual([['B'], ['text'], ['A']])

    const rows = applyLayoutEdit(body, { kind: 'move-row', from: 1, to: 0 })
    expect(labels(rows)).toEqual([['text'], ['A', 'B']])

    const columns = applyLayoutEdit(body, { kind: 'set-columns', row: 0, columns: 3 })
    expect(parseDashboard(columns).rows[0].columns).toBe(3)

    expect(applyLayoutEdit(body, { kind: 'move-item', from: { row: 1, item: 0 }, to: { row: 1, index: 1 } })).toBe(body)
  })
})

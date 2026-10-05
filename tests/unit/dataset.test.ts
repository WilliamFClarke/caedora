import { expect, test } from '@playwright/test'
import { parseDataset, parseNumber } from '@/lib/dataset'
import { validateDocument } from '@/lib/okf'

const BALANCES = `---
type: Dataset
title: Balances
description: Monthly balance snapshots.
dataset:
  key: [date, account]
  columns:
    date: { type: date, required: true }
    account: { type: ref, to: accounts.md }
    balance: { type: currency, currency: gbp }
    Kind: { type: enum, values: [asset, liability] }
---

# Balances

| Date | Account | Balance | Kind |
| --- | --- | --- | --- |
| 2026-09-30 | monzo-current | £1,240.55 | asset |
| 2026-09-30 | nationwide-mortgage | (212,300.00) | Liability |
`

test.describe('dataset parsing', () => {
  test('reads typed rows from a declared schema', () => {
    const dataset = parseDataset('finance/balances.md', BALANCES)

    expect(dataset.issues).toEqual([])
    expect(dataset.inferred).toBe(false)
    expect(dataset.schema.key).toEqual(['date', 'account'])
    expect(dataset.schema.columns.find((c) => c.name === 'balance')?.currency).toBe('GBP')
    expect(dataset.rows).toEqual([
      { date: '2026-09-30', account: 'monzo-current', balance: 1240.55, kind: 'asset' },
      { date: '2026-09-30', account: 'nationwide-mortgage', balance: -212300, kind: 'liability' },
    ])
  })

  test('infers a schema from a plain table', () => {
    const dataset = parseDataset(
      'fitness/measurements.md',
      `---\ntype: Dataset\n---\n\n| Date | Weight | Body fat | Notes |\n| --- | --- | --- | --- |\n| 2026-01-01 | 80.5 | 18% | start |\n| 2026-02-01 | 79 | 17.5% | |\n`
    )

    expect(dataset.inferred).toBe(true)
    expect(dataset.schema.columns.map((c) => [c.name, c.type])).toEqual([
      ['date', 'date'],
      ['weight', 'number'],
      ['body_fat', 'percent'],
      ['notes', 'text'],
    ])
    expect(dataset.rows[1]).toEqual({ date: '2026-02-01', weight: 79, body_fat: 17.5, notes: null })
  })

  test('reports bad values, missing columns and duplicate keys', () => {
    const raw = BALANCES.replace('| Kind |\n| --- | --- | --- | --- |', '|\n| --- | --- | --- |')
      .replace('| asset |', '|')
      .replace('| Liability |', '|')
      .replace('£1,240.55', 'lots')
      .replace('nationwide-mortgage', 'monzo-current')
    const messages = parseDataset('finance/balances.md', raw).issues.map((issue) => issue.message)

    expect(messages).toContain('Schema column kind is missing from the table.')
    expect(messages).toContain('balance should be a number, found "lots".')
    expect(messages).toContain('Duplicate key (date, account).')
  })

  test('surfaces dataset problems as OKF warnings only', () => {
    const issues = validateDocument('finance/balances.md', BALANCES.replace('2026-09-30', '30/09/2026'))

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ severity: 'warning', code: 'invalid-dataset' })
    expect(issues[0].message).toBe('Row 1: date should be a YYYY-MM-DD date, found "30/09/2026".')
  })

  test('parses UK money formats', () => {
    expect(parseNumber('£1,234.50')).toBe(1234.5)
    expect(parseNumber('-£20')).toBe(-20)
    expect(parseNumber('(£20.00)')).toBe(-20)
    expect(parseNumber('GBP 5,000')).toBe(5000)
    expect(parseNumber('4.5%')).toBe(4.5)
    expect(parseNumber('n/a')).toBeNull()
  })
})

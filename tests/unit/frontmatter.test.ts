import { expect, test } from '@playwright/test'
import { combine, parseFrontmatter, slugifyFilename } from '@/lib/frontmatter'

test('rewriting frontmatter keeps unknown fields, body and standard fields', () => {
  const md = [
    '---',
    'type: Dataset',
    'title: Balances',
    'description: Monthly balance snapshots.',
    'tags: [finance, Money Matters]',
    'timestamp: 2026-06-15T12:00:00Z',
    'dataset:',
    '  key: [date, account]',
    'owner: will',
    '---',
    '',
    '# Balances',
    '',
    'Body text.',
    '',
  ].join('\n')

  const parsed = parseFrontmatter(md)
  expect(parsed.error).toBeNull()
  expect(parsed.frontmatter).toMatchObject({
    type: 'Dataset',
    title: 'Balances',
    tags: ['finance', 'money-matters'],
    timestamp: '2026-06-15T12:00:00Z',
    extra: { dataset: { key: ['date', 'account'] }, owner: 'will' },
  })

  const rewritten = combine(parsed.frontmatter, parsed.body)
  const again = parseFrontmatter(rewritten)
  expect(again.frontmatter).toEqual(parsed.frontmatter)
  expect(again.body).toBe(parsed.body)
  // A second rewrite is byte for byte stable.
  expect(combine(again.frontmatter, again.body)).toBe(rewritten)
})

test('broken YAML is reported and the body is still returned', () => {
  const parsed = parseFrontmatter('---\ntype: [unclosed\n---\n\nStill here.\n')
  expect(parsed.hasFrontmatter).toBe(true)
  expect(parsed.error).toBeTruthy()
  expect(parsed.body).toBe('\nStill here.\n')
})

test('a note without frontmatter is left untouched', () => {
  const parsed = parseFrontmatter('# Just a heading\n')
  expect(parsed.hasFrontmatter).toBe(false)
  expect(parsed.body).toBe('# Just a heading\n')
})

test('filenames are slugified into stable concept paths', () => {
  expect(slugifyFilename('Garden Plans')).toBe('garden-plans')
  expect(slugifyFilename("Will's Café Notes.md")).toBe('wills-cafe-notes')
  expect(slugifyFilename('  ***  ')).toBe('untitled')
})

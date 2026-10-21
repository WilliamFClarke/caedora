import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { logEntry, queryDataset, readDataset, updateRow, upsertRows } from './datasets.js'
import { agentInstructionsFor } from './agents.js'
import { stampGenerated } from '../lib/dataset-edit.js'
import { parseFrontmatter } from '../lib/frontmatter.js'
import { lintCommand, rebuildIndexesCommand } from '../commands.js'
import { buildServer } from '../server.js'
import { MemoryProvider } from './memory-provider.test.js'

const DECISIONS = `---
type: Dataset
title: Decisions
description: Proposed and approved trades.
dataset:
  key: [date, ticker, action]
  columns:
    date: { type: date, required: true }
    ticker: { type: text, required: true }
    action: { type: enum, values: [buy, sell] }
    value: { type: currency }
    status: { type: enum, values: [proposed, approved, rejected, placed] }
generated: { by: claude, at: 2026-10-18T20:45:00Z }
---

# Decisions

Add a row before any order is placed.

| date       | ticker      | action | value  | status   |
| ---------- | ----------- | ------ | ------ | -------- |
| 2026-10-18 | GOOGL_US_EQ | sell   | 45.00  | proposed |
| 2026-10-18 | VWRPl_EQ    | sell   | 52.00  | proposed |
| 2026-10-18 | TSM_US_EQ   | buy    | 96.00  | proposed |

Notes below the table stay put.
`

function vault(files: Record<string, string> = {}) {
  const provider = new MemoryProvider()
  provider.files.set('strategy/decisions.md', DECISIONS)
  for (const [path, content] of Object.entries(files)) provider.files.set(path, content)
  return provider
}

/** The lines of `after` that differ from `before`, which must have as many lines. */
function changedLines(before: string, after: string): string[] {
  const a = before.split('\n')
  const b = after.split('\n')
  assert.equal(b.length, a.length)
  return b.filter((line, index) => line !== a[index])
}

describe('read_dataset and query_dataset', () => {
  it('returns typed rows with the schema and generated stamp', async () => {
    const result = await readDataset(vault(), { path: 'strategy/decisions.md' })
    assert.deepEqual(result.key, ['date', 'ticker', 'action'])
    assert.equal(result.rows.length, 3)
    assert.deepEqual(result.rows[0], {
      date: '2026-10-18',
      ticker: 'GOOGL_US_EQ',
      action: 'sell',
      value: 45,
      status: 'proposed',
    })
    assert.deepEqual(result.generated, { by: 'claude', at: '2026-10-18T20:45:00Z' })
    assert.deepEqual(result.issues, [])
  })

  it('filters, aggregates and groups with dashboard expressions', async () => {
    const provider = vault()
    const sells = await queryDataset(provider, { path: 'strategy/decisions.md', where: "action = 'sell'" })
    assert.equal(sells.count, 2)
    assert.deepEqual(sells.rows?.map((row) => row.ticker), ['GOOGL_US_EQ', 'VWRPl_EQ'])

    const total = await queryDataset(provider, { path: 'strategy/decisions.md', value: 'sum(value)' })
    assert.equal(total.value, 193)

    const byAction = await queryDataset(provider, {
      path: 'strategy/decisions.md',
      group_by: 'action',
      value: 'sum(value)',
    })
    assert.deepEqual(byAction.groups, [
      { group: 'buy', count: 1, value: 96 },
      { group: 'sell', count: 2, value: 97 },
    ])
  })

  it('refuses a concept that is not a Dataset', async () => {
    const provider = vault({ 'notes/plan.md': '---\ntype: Note\ntitle: Plan\n---\n\n# Plan\n' })
    await assert.rejects(readDataset(provider, { path: 'notes/plan.md' }), /is not a Dataset/)
  })
})

describe('update_row', () => {
  it('changes only the cells named and the generated stamp', async () => {
    const provider = vault()
    const result = await updateRow(provider, {
      path: 'strategy/decisions.md',
      key: { date: '2026-10-18', ticker: 'GOOGL_US_EQ', action: 'sell' },
      fields: { status: 'approved' },
      generatedBy: 'claude/opus',
    })
    assert.equal(result.changed, true)
    const after = provider.files.get('strategy/decisions.md')!
    const lines = changedLines(DECISIONS, after)
    assert.equal(lines.length, 2)
    assert.match(lines[0], /^generated: \{ by: claude\/opus, at: \d{4}-\d{2}-\d{2}T[\d:.]+Z \}$/)
    assert.equal(lines[1], '| 2026-10-18 | GOOGL_US_EQ | sell   | 45.00  | approved |')
    assert.deepEqual(provider.commits, [
      {
        message: 'Set status to approved for sell GOOGL_US_EQ on 2026-10-18',
        paths: ['strategy/decisions.md'],
      },
    ])
  })

  it('does not write when nothing changes', async () => {
    const provider = vault()
    const result = await updateRow(provider, {
      path: 'strategy/decisions.md',
      key: { date: '2026-10-18', ticker: 'TSM_US_EQ', action: 'buy' },
      fields: { status: 'proposed', value: 96 },
    })
    assert.equal(result.changed, false)
    assert.equal(provider.files.get('strategy/decisions.md'), DECISIONS)
    assert.equal(provider.commits.length, 0)
  })

  it('checks values against the schema and refuses unclear rows', async () => {
    const provider = vault()
    const path = 'strategy/decisions.md'
    const key = { date: '2026-10-18', ticker: 'GOOGL_US_EQ', action: 'sell' }
    await assert.rejects(updateRow(provider, { path, key, fields: { status: 'maybe' } }), /should be one of/)
    await assert.rejects(updateRow(provider, { path, key, fields: { value: 'lots' } }), /should be a number/)
    await assert.rejects(updateRow(provider, { path, key, fields: { notes: 'x' } }), /has no notes column/)
    await assert.rejects(updateRow(provider, { path, key, fields: { ticker: 'GOOG' } }), /part of the key/)
    await assert.rejects(
      updateRow(provider, { path, key: { date: '2026-10-18', ticker: 'GOOGL_US_EQ' }, fields: { status: 'approved' } }),
      /Give action/
    )
    await assert.rejects(
      updateRow(provider, { path, key: { ...key, ticker: 'AMD_US_EQ' }, fields: { status: 'approved' } }),
      /no longer in Decisions/
    )
    const duplicated = DECISIONS.replace(
      '| 2026-10-18 | VWRPl_EQ',
      '| 2026-10-18 | GOOGL_US_EQ | sell   | 10.00  | proposed |\n| 2026-10-18 | VWRPl_EQ'
    )
    provider.files.set(path, duplicated)
    await assert.rejects(updateRow(provider, { path, key, fields: { status: 'approved' } }), /More than one row/)
    assert.equal(provider.files.get(path), duplicated)
  })

  it('refuses a Dataset without a key', async () => {
    const provider = vault()
    const path = 'strategy/decisions.md'
    provider.files.set(path, DECISIONS.replace('  key: [date, ticker, action]\n', ''))
    await assert.rejects(
      updateRow(provider, { path, key: { ticker: 'GOOGL_US_EQ' }, fields: { status: 'approved' } }),
      /has no key/
    )
  })
})

describe('upsert_rows', () => {
  it('updates existing rows in place and appends new ones in the table style', async () => {
    const provider = vault()
    const result = await upsertRows(provider, {
      path: 'strategy/decisions.md',
      rows: [
        { date: '2026-10-18', ticker: 'TSM_US_EQ', action: 'buy', status: 'placed' },
        { date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'buy', value: 40, status: 'proposed' },
      ],
    })
    assert.equal(result.inserted, 1)
    assert.equal(result.updated, 1)
    const after = provider.files.get('strategy/decisions.md')!
    assert.ok(after.includes('| 2026-10-18 | TSM_US_EQ   | buy    | 96.00  | placed   |'))
    assert.ok(
      after.includes(
        '| 2026-10-18 | TSM_US_EQ   | buy    | 96.00  | placed   |\n| 2026-10-19 | AMD_US_EQ   | buy    | 40     | proposed |\n\nNotes below the table stay put.'
      )
    )
    assert.ok(after.includes('| 2026-10-18 | GOOGL_US_EQ | sell   | 45.00  | proposed |'))
    assert.deepEqual(provider.commits.map((commit) => commit.message), [
      'Add 1 row and update 1 row in strategy/decisions.md',
    ])

    const read = await readDataset(provider, { path: 'strategy/decisions.md' })
    assert.equal(read.rows.length, 4)
    assert.deepEqual(read.issues, [])
    assert.equal(read.generated?.by, 'caedora-mcp/0.2.0')
  })

  it('validates every row before writing any of them', async () => {
    const provider = vault()
    const path = 'strategy/decisions.md'
    await assert.rejects(
      upsertRows(provider, { path, rows: [{ date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'hold' }] }),
      /should be one of buy, sell/
    )
    await assert.rejects(
      upsertRows(provider, {
        path,
        rows: [
          { date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'buy' },
          { date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'buy' },
        ],
      }),
      /same date, ticker, action/
    )
    await assert.rejects(
      upsertRows(provider, {
        path,
        rows: [
          { date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'buy' },
          { date: '19/10/2026', ticker: 'NVDA_US_EQ', action: 'buy' },
        ],
      }),
      /YYYY-MM-DD/
    )
    assert.equal(provider.files.get(path), DECISIONS)
  })

  it('escapes a pipe so it stays inside its cell', async () => {
    const provider = vault()
    const path = 'strategy/decisions.md'
    provider.files.set(path, DECISIONS.replace('    status:', '    note: { type: text }\n    status:').replace(
      '| date       | ticker      | action | value  | status   |\n| ---------- | ----------- | ------ | ------ | -------- |',
      '| date       | ticker      | action | value  | status   | note |\n| ---------- | ----------- | ------ | ------ | -------- | ---- |'
    ))
    await upsertRows(provider, {
      path,
      rows: [{ date: '2026-10-19', ticker: 'AMD_US_EQ', action: 'buy', note: 'AI | data centres' }],
    })
    const read = await readDataset(provider, { path })
    assert.equal(read.rows.at(-1)?.note, 'AI | data centres')
  })
})

describe('stampGenerated', () => {
  it('keeps the block style and adds the stamp when it is missing', () => {
    const block = '---\ntype: Dataset\ngenerated:\n  by: t212-sync\n  at: 2026-10-19T18:28:40Z\ntags: [isa]\n---\n\n# Holdings\n'
    assert.equal(
      stampGenerated(block, { by: 'human:owner', at: '2026-10-19T19:00:00Z' }),
      '---\ntype: Dataset\ngenerated:\n  by: human:owner\n  at: 2026-10-19T19:00:00Z\ntags: [isa]\n---\n\n# Holdings\n'
    )
    const missing = '---\ntype: Dataset\n---\n\n# Holdings\n'
    const stamped = stampGenerated(missing, { by: 'claude', at: '2026-10-19T19:00:00Z' })
    assert.equal(stamped, '---\ntype: Dataset\ngenerated: { by: claude, at: 2026-10-19T19:00:00Z }\n---\n\n# Holdings\n')
    assert.deepEqual(parseFrontmatter(stamped).frontmatter.generated, { by: 'claude', at: '2026-10-19T19:00:00Z' })
  })
})

describe('log_entry', () => {
  it('writes a line under today in the log format Caedora uses', async () => {
    const provider = vault({ 'log.md': '# Vault Update Log\n\n## 2000-01-01\n* **Create**: Started.\n' })
    await logEntry(provider, { kind: 'order', text: 'Dry run buy 0.1 AMD_US_EQ.' })
    const today = new Date().toISOString().slice(0, 10)
    assert.equal(
      provider.files.get('log.md'),
      `# Vault Update Log\n\n## ${today}\n* **order**: Dry run buy 0.1 AMD_US_EQ.\n\n## 2000-01-01\n* **Create**: Started.\n`
    )
    await assert.rejects(logEntry(provider, { kind: 'order', text: 'two\nlines' }), /one line/)
  })
})

describe('agent instructions', () => {
  it('gathers the root and folder AGENTS.md files that apply to a path', async () => {
    const provider = vault({
      'AGENTS.md': '---\ntype: Agent Instructions\ntitle: Agent instructions\n---\n\nRoot rules.\n',
      'strategy/AGENTS.md': '---\ntype: Agent Instructions\ntitle: Strategy rules\n---\n\nStrategy rules.\n',
      'isa/AGENTS.md': '---\ntype: Agent Instructions\ntitle: ISA rules\n---\n\nISA rules.\n',
    })
    const files = await agentInstructionsFor(provider, 'strategy/decisions.md')
    assert.deepEqual(files.map((file) => file.path), ['AGENTS.md', 'strategy/AGENTS.md'])
    assert.deepEqual((await agentInstructionsFor(provider)).map((file) => file.path), ['AGENTS.md'])
  })

  it('serves them as resources and a prompt over MCP', async () => {
    const provider = vault({
      'AGENTS.md': '---\ntype: Agent Instructions\ntitle: Agent instructions\n---\n\nRoot rules.\n',
      'strategy/AGENTS.md': '---\ntype: Agent Instructions\ntitle: Strategy rules\n---\n\nStrategy rules.\n',
    })
    const server = buildServer({ provider, readOnly: true })
    const client = new Client({ name: 'test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { resources } = await client.listResources()
    assert.deepEqual(resources.map((resource) => resource.uri), [
      'caedora://agents/AGENTS.md',
      'caedora://agents/strategy/AGENTS.md',
    ])
    const read = await client.readResource({ uri: 'caedora://agents/strategy/AGENTS.md' })
    const [content] = read.contents
    assert.match('text' in content ? String(content.text) : '', /Strategy rules\./)

    const prompt = await client.getPrompt({ name: 'agent_instructions', arguments: { path: 'strategy/decisions.md' } })
    const text = prompt.messages[0].content.type === 'text' ? prompt.messages[0].content.text : ''
    assert.ok(text.indexOf('Root rules.') < text.indexOf('Strategy rules.'))

    const { tools } = await client.listTools()
    const names = tools.map((tool) => tool.name)
    assert.ok(names.includes('read_dataset') && names.includes('query_dataset'))
    assert.ok(!names.includes('upsert_rows'), 'write tools are hidden in read only mode')
    await client.close()
  })
})

describe('headless commands', () => {
  it('lint fails on broken links and Dataset problems, and passes a clean vault', async () => {
    const provider = vault()
    assert.equal((await lintCommand(provider)).exitCode, 0)

    provider.files.set('strategy/plan.md', '---\ntype: Note\ntitle: Plan\n---\n\nSee [missing](missing.md).\n')
    const broken = await lintCommand(provider)
    assert.equal(broken.exitCode, 1)
    assert.match(broken.output, /strategy\/plan\.md: error broken-link/)

    provider.files.set('strategy/plan.md', '---\ntype: Note\ntitle: Plan\n---\n\nSee [Decisions](decisions.md).\n')
    provider.files.set('strategy/decisions.md', DECISIONS.replace('| 45.00  |', '| lots   |'))
    const dataset = await lintCommand(provider, { json: true })
    assert.equal(dataset.exitCode, 1)
    assert.equal(JSON.parse(dataset.output).failing, 1)
  })

  it('rebuild-indexes writes the indexes and then has nothing to do', async () => {
    const provider = vault()
    const first = await rebuildIndexesCommand(provider)
    assert.match(first.output, /Updated 2 indexes:\n {2}index\.md\n {2}strategy\/index\.md/)
    assert.ok(provider.files.has('strategy/index.md'))
    assert.equal((await rebuildIndexesCommand(provider)).output, 'Every index is up to date.')
  })
})

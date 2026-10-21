import { expect, test } from '@playwright/test'
import { mergeDocument, mergeText } from '@/lib/merge'
import { GitHubProvider, gitBlobSha } from '@/lib/storage/github-provider'
import { isWriteConflict } from '@/lib/storage/conflict'

const DECISIONS = `---
type: Dataset
title: Decisions
generated: { by: claude, at: 2026-10-18T20:45:00Z }
---

# Decisions

Add a row before any order is placed.

| date | ticker | action | status |
| --- | --- | --- | --- |
| 2026-10-18 | GOOGL_US_EQ | sell | proposed |
| 2026-10-18 | VWRPl_EQ | sell | proposed |
| 2026-10-18 | TSM_US_EQ | buy | proposed |
`

test.describe('mergeText', () => {
  test('keeps both changes when they touch different lines', () => {
    const mine = DECISIONS.replace('Add a row before any order is placed.', 'Add a row first.')
    const theirs = DECISIONS.replace('| TSM_US_EQ | buy | proposed |', '| TSM_US_EQ | buy | placed |')
    const merged = mergeText(DECISIONS, mine, theirs)
    expect(merged).toContain('Add a row first.')
    expect(merged).toContain('| TSM_US_EQ | buy | placed |')
  })

  test('refuses to guess when both sides change the same line', () => {
    const mine = DECISIONS.replace('| GOOGL_US_EQ | sell | proposed |', '| GOOGL_US_EQ | sell | approved |')
    const theirs = DECISIONS.replace('| GOOGL_US_EQ | sell | proposed |', '| GOOGL_US_EQ | sell | rejected |')
    expect(mergeText(DECISIONS, mine, theirs)).toBeNull()
  })

  test('treats changes to neighbouring lines as a conflict', () => {
    const mine = DECISIONS.replace('| GOOGL_US_EQ | sell | proposed |', '| GOOGL_US_EQ | sell | approved |')
    const theirs = DECISIONS.replace('| VWRPl_EQ | sell | proposed |', '| VWRPl_EQ | sell | placed |')
    expect(mergeText(DECISIONS, mine, theirs)).toBeNull()
  })

  test('accepts the same change made on both sides', () => {
    const both = DECISIONS.replace('| GOOGL_US_EQ | sell | proposed |', '| GOOGL_US_EQ | sell | approved |')
    const mine = both.replace('Add a row before any order is placed.', 'Add a row first.')
    expect(mergeText(DECISIONS, mine, both)).toBe(mine)
  })

  test('returns the other side when only one side changed', () => {
    const theirs = `${DECISIONS}| 2026-10-19 | AMD_US_EQ | buy | proposed |\n`
    expect(mergeText(DECISIONS, DECISIONS, theirs)).toBe(theirs)
    expect(mergeText(DECISIONS, theirs, DECISIONS)).toBe(theirs)
  })
})

test.describe('mergeDocument', () => {
  test('does not let the generated stamp alone cause a conflict', () => {
    const mine = DECISIONS.replace(
      'generated: { by: claude, at: 2026-10-18T20:45:00Z }',
      'generated:\n  by: human:owner\n  at: 2026-10-19T19:00:00.000Z'
    ).replace('Add a row before any order is placed.', 'Add a row first.')
    const theirs = DECISIONS.replace(
      'generated: { by: claude, at: 2026-10-18T20:45:00Z }',
      'generated: { by: claude, at: 2026-10-19T18:30:00Z }'
    ).replace('| TSM_US_EQ | buy | proposed |', '| TSM_US_EQ | buy | placed |')

    expect(mergeText(DECISIONS, mine, theirs)).toBeNull()
    const merged = mergeDocument(DECISIONS, mine, theirs)
    expect(merged).toContain('Add a row first.')
    expect(merged).toContain('| TSM_US_EQ | buy | placed |')
    expect(merged).toContain('generated:\n  by: human:owner\n  at: 2026-10-19T19:00:00.000Z\n---')
    expect(merged).not.toContain('by: claude')
  })
})

test.describe('GitHubProvider.writeFile', () => {
  test('computes the same blob SHA as git hash-object', async () => {
    expect(await gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })

  test('sends the SHA of the text the edit started from, not the newest read', async () => {
    let sent: string | undefined
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        sent = (JSON.parse(String(init.body)) as { sha?: string }).sha
        return Response.json({ content: { sha: 'new' } })
      }
      return Response.json({ sha: 'newest-read', content: Buffer.from('theirs').toString('base64') })
    }) as typeof fetch

    const provider = new GitHubProvider('token', 'owner', 'vault')
    await provider.readFile('note.md')
    await provider.writeFile('data.txt', 'mine', { baseContent: 'hello\n' })
    expect(sent).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })

  const realFetch = globalThis.fetch
  test.afterEach(() => {
    globalThis.fetch = realFetch
  })

  test('reports a 409 as a conflict carrying the newest remote text', async () => {
    const remote = DECISIONS.replace('| TSM_US_EQ | buy | proposed |', '| TSM_US_EQ | buy | placed |')
    const calls: Array<{ method: string; cache?: RequestCache }> = []
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ method, cache: init?.cache })
      if (method === 'PUT') return new Response('{"message":"conflict"}', { status: 409 })
      const content = Buffer.from(calls.length === 1 ? DECISIONS : remote).toString('base64')
      return Response.json({ sha: `sha-${calls.length}`, content })
    }) as typeof fetch

    const provider = new GitHubProvider('token', 'owner', 'vault')
    await provider.readFile('strategy/decisions.md')
    const error = await provider
      .writeFile('strategy/decisions.md', DECISIONS.replace('proposed', 'approved'))
      .catch((e: unknown) => e)

    expect(isWriteConflict(error)).toBe(true)
    if (!isWriteConflict(error)) return
    expect(error.source).toBe('GitHub')
    expect(error.remoteContent).toBe(remote)
    // The re-read skips the browser cache, which GitHub allows for a minute.
    expect(calls.at(-1)).toEqual({ method: 'GET', cache: 'no-store' })
  })
})

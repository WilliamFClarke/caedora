import { expect, test } from '@playwright/test'
import {
  combine,
  createConceptFrontmatter,
  HUMAN_ACTOR,
  lastChanged,
  markGenerated,
  parseFrontmatter,
} from '@/lib/frontmatter'
import {
  OKF_VERSION,
  conceptSources,
  isOkfDatetime,
  isStale,
  lastVerified,
  lifecycleStatus,
  trustTier,
  validateDocument,
} from '@/lib/okf'

const v02Concept = [
  '---',
  'type: Attested Computation',
  'title: Revenue for fiscal year',
  'status: stable',
  'runtime: bigquery',
  'generated: { by: reference_agent/gemini-2.5-pro, at: 2026-06-20T22:53:05Z }',
  'verified:',
  '  - { by: process:finance-nightly, at: 2026-06-26T02:00:00Z }',
  '  - { by: human:ahormati, at: 2026-06-25T09:00:00Z }',
  'stale_after: 2026-09-23T00:00:00Z',
  'sources:',
  '  - id: rev-policy',
  '    resource: https://wiki.acme/finance/revenue-recognition',
  '    title: Revenue recognition policy',
  '    last_modified: 2026-04-02T00:00:00Z',
  'usage_window: { from: 2026-06-01T00:00:00Z, to: 2026-06-30T00:00:00Z }',
  '---',
  '',
  '# Computation',
  '',
  'Revenue per the policy.[^rev-policy]',
  '',
  '[^rev-policy]: Revenue recognition policy',
  '',
].join('\n')

test('the declared OKF version is 0.2', () => {
  expect(OKF_VERSION).toBe('0.2')
})

test('a v0.2 concept parses its trust, lifecycle and provenance families', () => {
  const parsed = parseFrontmatter(v02Concept)
  expect(parsed.error).toBeNull()
  const metadata = parsed.frontmatter
  expect(metadata.generated).toEqual({ by: 'reference_agent/gemini-2.5-pro', at: '2026-06-20T22:53:05Z' })
  expect(metadata.verified).toHaveLength(2)
  expect(lastVerified(metadata)).toBe('2026-06-26T02:00:00Z')
  expect(trustTier(metadata)).toBe('human-reviewed')
  expect(lifecycleStatus(metadata)).toBe('stable')
  expect(isStale(metadata, new Date('2026-09-22T23:59:59Z'))).toBe(false)
  expect(isStale(metadata, new Date('2026-09-23T00:00:00Z'))).toBe(true)
  expect(conceptSources(metadata)).toEqual([
    { id: 'rev-policy', resource: 'https://wiki.acme/finance/revenue-recognition', title: 'Revenue recognition policy' },
  ])
  expect(validateDocument('computations/revenue.md', v02Concept)).toEqual([])
})

test('a v0.2 concept survives a rewrite byte for byte after the first save', () => {
  const parsed = parseFrontmatter(v02Concept)
  const rewritten = combine(parsed.frontmatter, parsed.body)
  expect(rewritten).toContain('generated: { by: reference_agent/gemini-2.5-pro, at: 2026-06-20T22:53:05Z }')
  expect(rewritten).toContain('  - { by: human:ahormati, at: 2026-06-25T09:00:00Z }')
  const again = parseFrontmatter(rewritten)
  expect(again.frontmatter).toEqual(parsed.frontmatter)
  expect(combine(again.frontmatter, again.body)).toBe(rewritten)
})

test('a bare verified mapping is read as a one element list', () => {
  const metadata = parseFrontmatter(
    '---\ntype: Metric\nverified: { by: process:nightly, at: 2026-06-25T09:00:00Z }\n---\n'
  ).frontmatter
  expect(metadata.verified).toEqual([{ by: 'process:nightly', at: '2026-06-25T09:00:00Z' }])
  expect(trustTier(metadata)).toBe('machine-confirmed')
})

test('trust tiers and lifecycle default sensibly when the families are absent', () => {
  const metadata = parseFrontmatter('---\ntype: Note\n---\n').frontmatter
  expect(trustTier(metadata)).toBe('unverified')
  expect(lifecycleStatus(metadata)).toBe('stable')
  expect(isStale(metadata)).toBe(false)
  expect(validateDocument('note.md', '---\ntype: Note\n---\n')).toEqual([])
})

test('a legacy v0.1 timestamp is still read and becomes generated.at on the next edit', () => {
  const raw = '---\ntype: Note\ntitle: Old\ntimestamp: 2026-05-28T22:53:05+00:00\n---\n\nBody\n'
  const parsed = parseFrontmatter(raw)
  expect(lastChanged(parsed.frontmatter)).toBe('2026-05-28T22:53:05+00:00')
  // Rewriting without an edit leaves the legacy field alone.
  expect(combine(parsed.frontmatter, parsed.body)).toContain('timestamp: 2026-05-28T22:53:05+00:00')

  const edited = combine(markGenerated(parsed.frontmatter, HUMAN_ACTOR, '2026-10-06T10:00:00Z'), parsed.body)
  expect(edited).toContain('generated: { by: human:owner, at: 2026-10-06T10:00:00Z }')
  expect(edited).not.toContain('timestamp:')
})

test('callers that still pass a v0.1 timestamp get generated instead', () => {
  const metadata = createConceptFrontmatter('Imported', 'Reference', { timestamp: '2026-06-15T12:00:00Z' })
  expect(metadata.generated).toEqual({ by: 'caedora/app', at: '2026-06-15T12:00:00Z' })
  expect(combine(metadata, '')).not.toContain('timestamp:')
})

test('malformed trust values are kept as written and flagged', () => {
  const raw = '---\ntype: Note\ngenerated: yesterday\n---\n'
  const parsed = parseFrontmatter(raw)
  expect(parsed.frontmatter.generated).toBeNull()
  expect(combine(parsed.frontmatter, parsed.body)).toContain('generated: yesterday')
  expect(validateDocument('note.md', raw).map((issue) => issue.code)).toContain('invalid-trust')
})

test('v0.2 conformance warnings never block a concept', () => {
  const raw = [
    '---',
    'type: Attested Computation',
    'status: archived',
    'generated: { by: human:will, at: 2026-06-20 }',
    'stale_after: next year',
    'sources:',
    '  - title: No resource',
    '---',
    '',
  ].join('\n')
  const issues = validateDocument('computations/x.md', raw)
  expect(issues.every((issue) => issue.severity === 'warning')).toBe(true)
  expect(issues.map((issue) => issue.code).sort()).toEqual([
    'invalid-computation',
    'invalid-sources',
    'invalid-timestamp',
    'invalid-timestamp',
  ])
})

test('workflow status values are kept, read as stable and not flagged', () => {
  const raw = '---\ntype: Project\nstatus: active\n---\n'
  const parsed = parseFrontmatter(raw)
  expect(parsed.frontmatter.status).toBe('active')
  expect(lifecycleStatus(parsed.frontmatter)).toBe('stable')
  expect(validateDocument('project.md', raw)).toEqual([])
  expect(combine(parsed.frontmatter, parsed.body)).toContain('status: active')

  const structured = '---\ntype: Project\nstatus: { phase: build }\n---\n'
  const kept = parseFrontmatter(structured)
  expect(parseFrontmatter(combine(kept.frontmatter, kept.body)).frontmatter.extra.status).toEqual({ phase: 'build' })
})

test('OKF datetimes need an explicit offset', () => {
  expect(isOkfDatetime('2026-06-30T14:00:00Z')).toBe(true)
  expect(isOkfDatetime('2026-06-30T14:00:00.123+01:00')).toBe(true)
  expect(isOkfDatetime('2026-06-30T14:00:00')).toBe(false)
  expect(isOkfDatetime('2026-06-30')).toBe(false)
})

test('the root index may declare either OKF version', () => {
  for (const version of ['0.1', '0.2']) {
    const raw = `---\nokf_version: "${version}"\n---\n\n# Index\n\n* [Welcome](welcome.md) - Start here.\n`
    expect(validateDocument('index.md', raw)).toEqual([])
  }
})

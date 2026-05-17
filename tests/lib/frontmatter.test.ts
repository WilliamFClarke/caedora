import { describe, expect, it } from 'vitest'
import {
  combine,
  normalizeTag,
  parseFrontmatter,
  serializeFrontmatter,
  slugifyFilename,
} from '@/lib/frontmatter'

describe('frontmatter helpers', () => {
  it('parses tags and preserves unknown frontmatter lines', () => {
    const parsed = parseFrontmatter(
      '---\ntags: [Project, "Active Q2"]\naliases: [Old Name]\ncssclass: callout\n---\n# Note\n'
    )

    expect(parsed.frontmatter).toEqual({
      tags: ['Project', 'Active Q2'],
      extra: ['aliases: [Old Name]', 'cssclass: callout'],
    })
    expect(parsed.body).toBe('# Note\n')
  })

  it('serializes modeled and unknown keys without losing the body', () => {
    const fm = { tags: ['project', 'active-q2'], extra: ['aliases: [Old Name]'] }
    expect(serializeFrontmatter(fm)).toBe(
      '---\ntags: [project, active-q2]\naliases: [Old Name]\n---\n'
    )
    expect(combine(fm, '# Note\n')).toBe(
      '---\ntags: [project, active-q2]\naliases: [Old Name]\n---\n# Note\n'
    )
  })

  it('normalizes tags and filename slugs', () => {
    expect(normalizeTag(' #Active Q2! ')).toBe('active-q2')
    expect(slugifyFilename('Résumé Notes')).toBe('resume-notes')
    expect(slugifyFilename('Résumé Notes.md')).toBe('resume-notes.md')
  })
})

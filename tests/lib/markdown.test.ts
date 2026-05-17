import { describe, expect, it } from 'vitest'
import { mdToTiptap, tiptapToMd } from '@/lib/markdown'

describe('markdown bridge', () => {
  it('returns an empty paragraph for an empty document', () => {
    expect(mdToTiptap('')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('round-trips the supported block and inline syntax', () => {
    const input = [
      '# Heading',
      '',
      'A **bold** _italic_ ~~strike~~ `code` [link](https://caedora.app).',
      '',
      '- [ ] open',
      '- [x] done',
      '',
      '```ts',
      'const answer = 42',
      '```',
      '',
      '| Name | Value |',
      '| ---- | ----- |',
      '| A    | B     |',
      '',
    ].join('\n')

    const output = tiptapToMd(mdToTiptap(input))
    expect(output).toContain('# Heading\n')
    expect(output).toContain('**bold**')
    expect(output).toContain('_italic_')
    expect(output).toContain('~~strike~~')
    expect(output).toContain('[link](https://caedora.app)')
    expect(output).toContain('- [ ] open')
    expect(output).toContain('- [x] done')
    expect(output).toContain('```ts\nconst answer = 42\n```')
    expect(output).toContain('| Name | Value |')
  })

  it('preserves subscript and superscript marks', () => {
    const doc = mdToTiptap('H<sub>2</sub>O and x<sup>2</sup>\n')
    expect(tiptapToMd(doc)).toBe('H<sub>2</sub>O and x<sup>2</sup>\n')
  })
})

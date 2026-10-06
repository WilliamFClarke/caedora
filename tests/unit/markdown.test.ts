import { expect, test } from '@playwright/test'
import { mdToTiptap, tiptapToMd } from '@/lib/markdown'

// Every edit goes markdown -> TipTap -> markdown, so anything that does not
// survive the round trip is silently rewritten the next time a note is saved.
// Fixtures use the serialiser's own style (`-` bullets, `_` emphasis), since
// switching style is a harmless rewrite rather than a loss.
const roundTrip = (md: string) => tiptapToMd(mdToTiptap(md))

const cases: Record<string, string> = {
  headings: '# Title\n\n## Section\n\n### Sub',
  paragraphs: 'First paragraph.\n\nSecond paragraph.',
  marks: 'Some **bold**, _italic_, ~~struck~~ and `code` text.',
  'nested marks': 'A _**bold italic**_ word.',
  links: 'See [Home Base](/personal/home-base.md) and [the spec](https://example.com "Spec").',
  'bullet list': '- one\n- two\n  - nested',
  'ordered list': '1. first\n2. second',
  'task list': '- [ ] todo\n- [x] done',
  blockquote: '> Quoted text',
  'code block': '```ts\nconst a = 1\n```',
  'thematic break': 'Above\n\n***\n\nBelow',
  table: '| Name | Amount |\n| ---- | ------ |\n| Rent | 950    |',
  'hard break': 'Line one\\\nLine two',
  'standalone image': 'Before\n\n![Chart](/finance/chart.png "Net worth")\n\nAfter',
}

for (const [name, md] of Object.entries(cases)) {
  test(`markdown round trip keeps ${name}`, () => {
    const once = roundTrip(md)
    // Stable: a second pass must not change anything further.
    expect(roundTrip(once)).toBe(once)
    // Lossless: the same document comes back, ignoring trailing whitespace.
    expect(once.trim()).toBe(md.trim())
  })
}

test('an empty document becomes one empty paragraph', () => {
  expect(mdToTiptap('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
})

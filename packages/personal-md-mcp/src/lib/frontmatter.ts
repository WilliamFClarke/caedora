/**
 * Minimal YAML-frontmatter reader/writer for .md notes.
 *
 * DUPLICATE of ../../../../lib/frontmatter.ts (the web app's copy). Keep the
 * two in sync — identical semantics are required so that the MCP server's
 * writes round-trip exactly like the editor's. When changing one, change
 * both.
 */

export interface Frontmatter {
  tags: string[]
  /** Raw YAML lines for keys we don't specifically model. */
  extra: string[]
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseFrontmatter(md: string): { frontmatter: Frontmatter; body: string } {
  const match = md.match(FENCE)
  if (!match) {
    return { frontmatter: { tags: [], extra: [] }, body: md }
  }
  const yaml = match[1]
  const tags: string[] = []
  const extra: string[] = []
  for (const line of yaml.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) {
      if (line.trim()) extra.push(line)
      continue
    }
    const key = kv[1]
    const val = kv[2].trim()
    if (key.toLowerCase() === 'tags') {
      tags.push(...parseTagList(val))
    } else {
      extra.push(line)
    }
  }
  return { frontmatter: { tags, extra }, body: md.slice(match[0].length) }
}

function parseTagList(val: string): string[] {
  if (!val) return []
  let items: string[]
  if (val.startsWith('[') && val.endsWith(']')) {
    items = val.slice(1, -1).split(',')
  } else {
    items = val.split(/[\s,]+/)
  }
  return items
    .map((s) => s.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
    .filter(Boolean)
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const hasTags = fm.tags.length > 0
  const hasExtra = fm.extra.length > 0
  if (!hasTags && !hasExtra) return ''
  const lines: string[] = ['---']
  if (hasTags) lines.push(`tags: [${fm.tags.join(', ')}]`)
  for (const line of fm.extra) lines.push(line)
  lines.push('---', '')
  return lines.join('\n')
}

export function combine(fm: Frontmatter, body: string): string {
  const head = serializeFrontmatter(fm)
  if (!head) return body
  return head + (body.startsWith('\n') ? body : body)
}

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}

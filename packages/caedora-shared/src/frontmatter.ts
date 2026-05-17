/**
 * Minimal YAML-frontmatter reader/writer for .md notes.
 * Only supports the keys we care about today: `tags` as a list.
 * Unknown keys are preserved as raw lines so third-party tools (Obsidian,
 * Dataview, etc.) don't lose metadata when we round-trip through the editor.
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
  return head + body
}

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}

export function slugifyFilename(raw: string): string {
  const hasMd = /\.md$/i.test(raw)
  const stem = hasMd ? raw.slice(0, -3) : raw
  const slug = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const safeSlug = slug || 'untitled'
  return hasMd ? `${safeSlug}.md` : safeSlug
}

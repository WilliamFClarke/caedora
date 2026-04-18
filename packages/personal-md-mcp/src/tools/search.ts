import { z } from 'zod'
import { parseFrontmatter, normalizeTag } from '../lib/frontmatter.js'
import { listFilesRecursive, type VaultProvider } from '../providers/types.js'

export const searchNotesSchema = {
  query: z.string().describe('Free-text query. Matches are case-insensitive substrings in title or body.'),
  tag: z.string().optional().describe('Filter to notes with this tag (exact, post-normalisation).'),
  limit: z.number().int().positive().max(100).optional().describe('Max results to return. Default 20.'),
}

export async function searchNotes(
  provider: VaultProvider,
  { query, tag, limit = 20 }: { query: string; tag?: string; limit?: number }
) {
  const q = query.trim().toLowerCase()
  const tagFilter = tag ? normalizeTag(tag) : null
  const all = await listFilesRecursive(provider)
  const notes = all.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
  const hits: Array<{ path: string; score: number; title: string; snippet: string; tags: string[] }> = []

  for (const note of notes) {
    const raw = await provider.readFile(note.path).catch(() => null)
    if (raw === null) continue
    const { frontmatter, body } = parseFrontmatter(raw)
    if (tagFilter && !frontmatter.tags.includes(tagFilter)) continue

    const titleMatch = note.name.slice(0, -3).toLowerCase().includes(q) ? 1 : 0
    const bodyMatches = q ? (body.toLowerCase().match(new RegExp(escapeRegex(q), 'g')) ?? []).length : 0
    const score = titleMatch * 5 + bodyMatches
    if (q && score === 0) continue

    const title = (body.match(/^\s*#\s+(.+)$/m)?.[1] ?? note.name.replace(/\.md$/, '')).trim()
    const snippet = snippetAround(body, q)
    hits.push({ path: note.path, score, title, snippet, tags: frontmatter.tags })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit)
}

export const listTagsSchema = {}

export async function listTags(provider: VaultProvider) {
  const counts = new Map<string, number>()
  const all = await listFilesRecursive(provider)
  const notes = all.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
  for (const note of notes) {
    const raw = await provider.readFile(note.path).catch(() => null)
    if (raw === null) continue
    const { frontmatter } = parseFrontmatter(raw)
    for (const tag of frontmatter.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export const notesByTagSchema = {
  tag: z.string().describe('Tag to filter by (normalised with the same rules as the editor).'),
}

export async function notesByTag(
  provider: VaultProvider,
  { tag }: { tag: string }
) {
  const target = normalizeTag(tag)
  const all = await listFilesRecursive(provider)
  const notes = all.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
  const matches: Array<{ path: string; title: string }> = []
  for (const note of notes) {
    const raw = await provider.readFile(note.path).catch(() => null)
    if (raw === null) continue
    const { frontmatter, body } = parseFrontmatter(raw)
    if (!frontmatter.tags.includes(target)) continue
    const title = (body.match(/^\s*#\s+(.+)$/m)?.[1] ?? note.name.replace(/\.md$/, '')).trim()
    matches.push({ path: note.path, title })
  }
  return matches
}

function snippetAround(body: string, q: string, radius = 60): string {
  if (!q) return body.slice(0, 120).trim()
  const idx = body.toLowerCase().indexOf(q)
  if (idx < 0) return body.slice(0, 120).trim()
  const start = Math.max(0, idx - radius)
  const end = Math.min(body.length, idx + q.length + radius)
  const prefix = start > 0 ? '… ' : ''
  const suffix = end < body.length ? ' …' : ''
  return prefix + body.slice(start, end).replace(/\s+/g, ' ').trim() + suffix
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

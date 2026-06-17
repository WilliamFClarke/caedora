import { z } from 'zod'
import { normalizeTag, parseFrontmatter } from '../lib/frontmatter.js'
import { buildConceptCatalog } from '../lib/okf.js'
import type { VaultProvider } from '../providers/types.js'

export const searchConceptsSchema = {
  query: z.string().describe('Free-text query across structured metadata and Markdown bodies.'),
  tag: z.string().optional().describe('Optional normalized tag filter.'),
  type: z.string().optional().describe('Optional exact concept type filter.'),
  limit: z.number().int().positive().max(100).optional().describe('Maximum results.'),
}

export async function searchConcepts(
  provider: VaultProvider,
  {
    query,
    tag,
    type,
    limit = 20,
  }: { query: string; tag?: string; type?: string; limit?: number }
) {
  const q = query.trim().toLowerCase()
  const tagFilter = tag ? normalizeTag(tag) : null
  const catalog = await buildConceptCatalog(provider)
  const hits = []
  for (const concept of catalog) {
    if (tagFilter && !concept.tags.includes(tagFilter)) continue
    if (type && concept.type !== type) continue
    const raw = await provider.readFile(concept.path)
    const body = parseFrontmatter(raw).body
    const metadataText = [
      concept.title,
      concept.description,
      concept.type,
      concept.resource,
      concept.tags.join(' '),
    ].join(' ').toLowerCase()
    const metadataMatches = q ? countMatches(metadataText, q) : 0
    const bodyMatches = q ? countMatches(body.toLowerCase(), q) : 0
    const score = metadataMatches * 5 + bodyMatches
    if (q && score === 0) continue
    hits.push({
      id: concept.id,
      path: concept.path,
      type: concept.type,
      title: concept.title,
      description: concept.description,
      tags: concept.tags,
      timestamp: concept.timestamp,
      score,
      snippet: snippetAround(body, q),
    })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export const listTagsSchema = {}

export async function listTags(provider: VaultProvider) {
  const counts = new Map<string, number>()
  for (const concept of await buildConceptCatalog(provider)) {
    for (const tag of concept.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
}

export const listTypesSchema = {}

export async function listTypes(provider: VaultProvider) {
  const counts = new Map<string, number>()
  for (const concept of await buildConceptCatalog(provider)) {
    counts.set(concept.type, (counts.get(concept.type) ?? 0) + 1)
  }
  return [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
}

export const conceptsByTagSchema = {
  tag: z.string().describe('Tag to filter by.'),
}

export async function conceptsByTag(provider: VaultProvider, { tag }: { tag: string }) {
  const target = normalizeTag(tag)
  return (await buildConceptCatalog(provider))
    .filter((concept) => concept.tags.includes(target))
    .map(({ id, path, type, title, description }) => ({ id, path, type, title, description }))
}

export const conceptGraphSchema = {
  path: z.string().optional().describe('Optional concept path to focus on.'),
}

export async function conceptGraph(provider: VaultProvider, { path }: { path?: string }) {
  const concepts = await buildConceptCatalog(provider)
  const nodes = path ? concepts.filter((concept) => concept.path === path) : concepts
  return nodes.map((concept) => ({
    id: concept.id,
    path: concept.path,
    title: concept.title,
    type: concept.type,
    outgoing: concept.links.filter((link) => !link.external),
    external: concept.links.filter((link) => link.external),
    backlinks: concepts
      .filter((candidate) => candidate.links.some((link) => link.targetPath === concept.path))
      .map(({ id, path: sourcePath, title }) => ({ id, path: sourcePath, title })),
  }))
}

function countMatches(text: string, query: string): number {
  if (!query) return 0
  return text.split(query).length - 1
}

function snippetAround(body: string, query: string, radius = 80): string {
  if (!query) return body.slice(0, 160).trim()
  const index = body.toLowerCase().indexOf(query)
  if (index < 0) return body.slice(0, 160).trim()
  const start = Math.max(0, index - radius)
  const end = Math.min(body.length, index + query.length + radius)
  return `${start > 0 ? '... ' : ''}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${end < body.length ? ' ...' : ''}`
}

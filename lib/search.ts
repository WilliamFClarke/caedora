import type { OkfConceptSummary } from './okf'

export interface SearchQuery {
  terms: string[]
  tags: string[]
  folder: string | null
}

export interface SearchSnippet {
  before: string
  match: string
  after: string
}

export interface SearchResult {
  concept: OkfConceptSummary
  score: number
  snippet: SearchSnippet | null
}

const SNIPPET_CONTEXT = 48

/**
 * Parse a search box string. Plain words must all match somewhere in the
 * concept. `tag:name` (or `#name`) filters by tag and `in:folder` limits
 * results to a folder.
 */
export function parseSearchQuery(input: string): SearchQuery {
  const query: SearchQuery = { terms: [], tags: [], folder: null }
  for (const token of input.trim().toLowerCase().split(/\s+/)) {
    if (!token) continue
    if (token.startsWith('tag:') && token.length > 4) query.tags.push(token.slice(4))
    else if (token.startsWith('#') && token.length > 1) query.tags.push(token.slice(1))
    else if (token.startsWith('in:') && token.length > 3) query.folder = token.slice(3).replace(/^\/+|\/+$/g, '')
    else query.terms.push(token)
  }
  return query
}

export function isEmptyQuery(query: SearchQuery): boolean {
  return query.terms.length === 0 && query.tags.length === 0 && !query.folder
}

export function searchConcepts(
  catalog: Record<string, OkfConceptSummary>,
  input: string,
  limit = 50
): SearchResult[] {
  const query = parseSearchQuery(input)
  if (isEmptyQuery(query)) return []

  const results: SearchResult[] = []
  for (const concept of Object.values(catalog)) {
    const result = scoreConcept(concept, query)
    if (result) results.push(result)
  }

  return results
    .sort((a, b) => b.score - a.score || a.concept.title.localeCompare(b.concept.title))
    .slice(0, limit)
}

/** True when the concept matches every term, tag and folder filter. */
export function conceptMatches(concept: OkfConceptSummary, input: string): boolean {
  const query = parseSearchQuery(input)
  return !isEmptyQuery(query) && scoreConcept(concept, query) !== null
}

function scoreConcept(concept: OkfConceptSummary, query: SearchQuery): SearchResult | null {
  const path = concept.path.toLowerCase()
  if (query.folder && !path.startsWith(`${query.folder}/`)) return null

  const tags = concept.tags.map((tag) => tag.toLowerCase())
  if (!query.tags.every((wanted) => tags.some((tag) => tag === wanted || tag.startsWith(`${wanted}/`)))) {
    return null
  }

  const title = concept.title.toLowerCase()
  const description = concept.description.toLowerCase()
  const type = concept.type.toLowerCase()
  const body = concept.body.toLowerCase()

  let score = query.terms.length === 0 ? 1 : 0
  for (const term of query.terms) {
    let termScore = 0
    if (title.includes(term)) termScore += title.startsWith(term) ? 12 : 8
    if (path.includes(term)) termScore += 3
    if (description.includes(term)) termScore += 4
    if (type.includes(term)) termScore += 2
    if (tags.some((tag) => tag.includes(term))) termScore += 4
    if (body.includes(term)) termScore += 1 + Math.min(countOccurrences(body, term), 5) * 0.2
    if (termScore === 0) return null
    score += termScore
  }

  return { concept, score, snippet: buildSnippet(concept.body, query.terms) }
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count++
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

export function buildSnippet(body: string, terms: string[]): SearchSnippet | null {
  if (!body || terms.length === 0) return null
  const lower = body.toLowerCase()
  let index = -1
  let term = ''
  for (const candidate of terms) {
    const found = lower.indexOf(candidate)
    if (found !== -1 && (index === -1 || found < index)) {
      index = found
      term = candidate
    }
  }
  if (index === -1) return null

  const start = Math.max(0, index - SNIPPET_CONTEXT)
  const end = Math.min(body.length, index + term.length + SNIPPET_CONTEXT)
  return {
    before: `${start > 0 ? '…' : ''}${body.slice(start, index)}`,
    match: body.slice(index, index + term.length),
    after: `${body.slice(index + term.length, end)}${end < body.length ? '…' : ''}`,
  }
}

/** Flatten Markdown into a single line of searchable text. */
export function markdownToSearchText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*/g, ' '))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

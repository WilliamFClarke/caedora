import { parseDocument, stringify } from 'yaml'

export interface Frontmatter {
  type: string
  title: string
  description: string
  resource: string
  tags: string[]
  timestamp: string
  extra: Record<string, unknown>
}

const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/
const STANDARD_KEYS = new Set([
  'type',
  'title',
  'description',
  'resource',
  'tags',
  'timestamp',
])

export function emptyFrontmatter(overrides: Partial<Frontmatter> = {}): Frontmatter {
  return {
    type: '',
    title: '',
    description: '',
    resource: '',
    tags: [],
    timestamp: '',
    extra: {},
    ...overrides,
  }
}

export function parseFrontmatter(markdown: string) {
  const match = markdown.match(FENCE)
  if (!match) {
    return {
      frontmatter: emptyFrontmatter(),
      body: markdown,
      hasFrontmatter: false,
      error: null as string | null,
    }
  }
  try {
    const document = parseDocument(match[1], { prettyErrors: false, uniqueKeys: false })
    if (document.errors.length > 0) throw new Error(document.errors[0].message)
    const value = document.toJS() as unknown
    if (!isRecord(value)) throw new Error('YAML frontmatter must be a mapping.')

    const extra: Record<string, unknown> = {}
    for (const [key, fieldValue] of Object.entries(value)) {
      if (!STANDARD_KEYS.has(key)) extra[key] = fieldValue
    }

    return {
      frontmatter: {
        type: stringValue(value.type),
        title: stringValue(value.title),
        description: stringValue(value.description),
        resource: stringValue(value.resource),
        tags: uniqueTags(Array.isArray(value.tags)
          ? value.tags.filter((item): item is string => typeof item === 'string')
          : typeof value.tags === 'string'
            ? value.tags.split(/[\s,]+/)
            : []),
        timestamp: stringValue(value.timestamp),
        extra,
      },
      body: markdown.slice(match[0].length),
      hasFrontmatter: true,
      error: null as string | null,
    }
  } catch (error) {
    return {
      frontmatter: emptyFrontmatter(),
      body: markdown.slice(match[0].length),
      hasFrontmatter: true,
      error: error instanceof Error ? error.message : 'Invalid YAML frontmatter.',
    }
  }
}

export function serializeFrontmatter(frontmatter: Frontmatter): string {
  const data: Record<string, unknown> = {}
  if (frontmatter.type.trim()) data.type = frontmatter.type.trim()
  if (frontmatter.title.trim()) data.title = frontmatter.title.trim()
  if (frontmatter.description.trim()) data.description = frontmatter.description.trim()
  if (frontmatter.resource.trim()) data.resource = frontmatter.resource.trim()
  if (frontmatter.tags.length > 0) data.tags = uniqueTags(frontmatter.tags)
  if (frontmatter.timestamp.trim()) data.timestamp = frontmatter.timestamp.trim()
  for (const [key, value] of Object.entries(frontmatter.extra)) {
    if (!STANDARD_KEYS.has(key) && value !== undefined) data[key] = value
  }
  if (Object.keys(data).length === 0) return ''
  return `---\n${stringify(data, { lineWidth: 0 }).trimEnd()}\n---\n`
}

export function combine(frontmatter: Frontmatter, body: string): string {
  return `${serializeFrontmatter(frontmatter)}\n${body.replace(/^\n+/, '')}`
}

export function createConceptFrontmatter(
  title: string,
  type: string,
  overrides: Partial<Frontmatter> = {}
): Frontmatter {
  return emptyFrontmatter({
    type: type.trim(),
    title: title.trim(),
    timestamp: new Date().toISOString(),
    ...overrides,
    tags: uniqueTags(overrides.tags ?? []),
    extra: overrides.extra ?? {},
  })
}

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}

export function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))]
}

export function slugifyFilename(raw: string): string {
  const stem = raw.replace(/\.md$/i, '')
  return stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled'
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

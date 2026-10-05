import { parseDocument, stringify } from 'yaml'

export const OKF_VERSION = '0.1'

export interface Frontmatter {
  type: string
  title: string
  description: string
  resource: string
  tags: string[]
  timestamp: string
  /** Producer-defined YAML values, preserved when Caedora rewrites metadata. */
  extra: Record<string, unknown>
}

export interface ParsedFrontmatter {
  frontmatter: Frontmatter
  body: string
  hasFrontmatter: boolean
  error: string | null
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

export function parseFrontmatter(md: string): ParsedFrontmatter {
  const match = md.match(FENCE)
  if (!match) {
    return {
      frontmatter: emptyFrontmatter(),
      body: md,
      hasFrontmatter: false,
      error: null,
    }
  }

  try {
    const document = parseDocument(match[1], {
      prettyErrors: false,
      uniqueKeys: false,
    })
    if (document.errors.length > 0) {
      throw new Error(document.errors[0].message)
    }

    const value = document.toJS() as unknown
    if (!isRecord(value)) {
      throw new Error('YAML frontmatter must be a mapping of field names to values.')
    }

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
        tags: tagList(value.tags),
        timestamp: stringValue(value.timestamp),
        extra,
      },
      body: md.slice(match[0].length),
      hasFrontmatter: true,
      error: null,
    }
  } catch (error) {
    return {
      frontmatter: emptyFrontmatter(),
      body: md.slice(match[0].length),
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

  const yaml = stringify(data, {
    lineWidth: 0,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  }).trimEnd()
  return `---\n${yaml}\n---\n`
}

export function combine(frontmatter: Frontmatter, body: string): string {
  const head = serializeFrontmatter(frontmatter)
  if (!head) return body
  return `${head}\n${body.replace(/^\n+/, '')}`
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

export function createConceptFrontmatter(
  title: string,
  type = 'Reference',
  overrides: Partial<Frontmatter> = {}
): Frontmatter {
  return emptyFrontmatter({
    type,
    title: title.trim(),
    timestamp: new Date().toISOString(),
    ...overrides,
    tags: uniqueTags(overrides.tags ?? []),
    extra: overrides.extra ?? {},
  })
}

function tagList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueTags(value.filter((item): item is string => typeof item === 'string'))
  }
  if (typeof value === 'string') {
    return uniqueTags(value.split(/[\s,]+/))
  }
  return []
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Kebab-case a user-entered filename stem so concept IDs and URLs stay clean.
 */
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
  return slug || 'untitled'
}

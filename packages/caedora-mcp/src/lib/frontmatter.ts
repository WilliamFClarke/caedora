import { Document, isMap, isSeq, parseDocument } from 'yaml'

export const OKF_VERSION = '0.2'

/** Actor for content written by a person in the Caedora editor (OKF v0.2 §7). */
export const HUMAN_ACTOR = 'human:owner'
/** Actor for content Caedora itself writes, such as starter concepts and templates. */
export const CAEDORA_ACTOR = 'caedora/app'

/** A `{ by, at }` pair, used by `generated` and each `verified` entry. */
export interface ActorStamp {
  by: string
  at: string
}

export interface Frontmatter {
  type: string
  title: string
  description: string
  resource: string
  tags: string[]
  /** Who or what produced the current content, and when it last meaningfully changed. */
  generated: ActorStamp | null
  /** Independent confirmations of the content. A bare mapping is read as one entry. */
  verified: ActorStamp[]
  /** Lifecycle status: draft, stable or deprecated. Empty means stable. */
  status: string
  /** ISO 8601 instant on or after which the content is stale. */
  staleAfter: string
  /** Legacy OKF v0.1 last change time, superseded by `generated.at`. */
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
  'generated',
  'verified',
  'status',
  'stale_after',
  'timestamp',
])

/** Standard keys whose malformed values are kept in extra rather than dropped. */
const PRESERVED_WHEN_MALFORMED = new Set(['generated', 'verified', 'status', 'stale_after'])

export function emptyFrontmatter(overrides: Partial<Frontmatter> = {}): Frontmatter {
  return {
    type: '',
    title: '',
    description: '',
    resource: '',
    tags: [],
    generated: null,
    verified: [],
    status: '',
    staleAfter: '',
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
    const generated = actorStamp(value.generated)
    const verified = verifiedList(value.verified)
    // Keep malformed trust values as written so a rewrite never loses them.
    if (value.generated != null && !generated) extra.generated = value.generated
    if (value.verified != null && !verified) extra.verified = value.verified
    for (const key of ['status', 'stale_after'] as const) {
      if (value[key] != null && typeof value[key] !== 'string') extra[key] = value[key]
    }

    return {
      frontmatter: {
        type: stringValue(value.type),
        title: stringValue(value.title),
        description: stringValue(value.description),
        resource: stringValue(value.resource),
        tags: tagList(value.tags),
        generated,
        verified: verified ?? [],
        status: typeof value.status === 'string' ? value.status : '',
        staleAfter: typeof value.stale_after === 'string' ? value.stale_after : '',
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
  if (frontmatter.status.trim()) data.status = frontmatter.status.trim()
  if (frontmatter.generated) data.generated = { ...frontmatter.generated }
  if (frontmatter.verified.length > 0) data.verified = frontmatter.verified.map((entry) => ({ ...entry }))
  if (frontmatter.staleAfter.trim()) data.stale_after = frontmatter.staleAfter.trim()
  // generated.at supersedes the v0.1 timestamp, so the legacy key is dropped once it exists.
  if (frontmatter.timestamp.trim() && !frontmatter.generated) data.timestamp = frontmatter.timestamp.trim()

  for (const [key, value] of Object.entries(frontmatter.extra)) {
    if (value === undefined || Object.hasOwn(data, key)) continue
    if (!STANDARD_KEYS.has(key) || PRESERVED_WHEN_MALFORMED.has(key)) data[key] = value
  }

  if (Object.keys(data).length === 0) return ''

  const document = new Document(data)
  // Match the compact `{ by, at }` style the OKF spec uses for trust stamps.
  const generatedNode = document.get('generated', true)
  if (isMap(generatedNode)) generatedNode.flow = true
  const verifiedNode = document.get('verified', true)
  if (isSeq(verifiedNode)) {
    for (const item of verifiedNode.items) if (isMap(item)) item.flow = true
  }
  const yaml = document
    .toString({
      lineWidth: 0,
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    })
    .trimEnd()
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
  const merged = emptyFrontmatter({
    type,
    title: title.trim(),
    ...overrides,
    tags: uniqueTags(overrides.tags ?? []),
    extra: overrides.extra ?? {},
  })
  if (merged.generated) return merged
  // A caller that still passes a v0.1 timestamp gets it carried into generated.at.
  return markGenerated(merged, CAEDORA_ACTOR, merged.timestamp || undefined)
}

/** Record a meaningful content change by `by`, replacing any legacy timestamp. */
export function markGenerated(
  frontmatter: Frontmatter,
  by: string,
  at = new Date().toISOString()
): Frontmatter {
  return { ...frontmatter, generated: { by, at }, timestamp: '' }
}

/** When the content last meaningfully changed, falling back to the v0.1 timestamp. */
export function lastChanged(frontmatter: Frontmatter): string {
  return frontmatter.generated?.at || frontmatter.timestamp
}

function actorStamp(value: unknown): ActorStamp | null {
  if (!isRecord(value)) return null
  return { by: stringValue(value.by), at: stringValue(value.at) }
}

function verifiedList(value: unknown): ActorStamp[] | null {
  if (value === null || value === undefined) return []
  // OKF v0.2 §5.2: a bare mapping is a one-element list.
  if (isRecord(value)) return [actorStamp(value)!]
  if (!Array.isArray(value)) return null
  const entries = value.map(actorStamp)
  return entries.every((entry): entry is ActorStamp => entry !== null) ? entries : null
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

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Link, Root, RootContent } from 'mdast'
import { OKF_VERSION, parseFrontmatter, type Frontmatter } from './frontmatter'
import type { FileEntry, VaultProvider } from './types'

export const INDEX_FILENAME = 'index.md'
export const LOG_FILENAME = 'log.md'
export const RESERVED_FILENAMES = new Set([INDEX_FILENAME, LOG_FILENAME])

export interface OkfConcept {
  id: string
  path: string
  metadata: Frontmatter
  body: string
  links: OkfLink[]
}

export interface OkfConceptSummary {
  id: string
  path: string
  title: string
  description: string
  type: string
  tags: string[]
  timestamp: string
  links: OkfLink[]
  conformant: boolean
}

export interface OkfLink {
  label: string
  href: string
  targetPath: string | null
  targetId: string | null
  external: boolean
}

export interface OkfIssue {
  path: string
  severity: 'error' | 'warning'
  code:
    | 'missing-frontmatter'
    | 'invalid-frontmatter'
    | 'missing-type'
    | 'invalid-timestamp'
    | 'invalid-index'
    | 'invalid-log'
    | 'broken-link'
  message: string
}

export interface OkfBundleReport {
  version: typeof OKF_VERSION
  conformant: boolean
  concepts: number
  indexes: number
  logs: number
  links: number
  brokenLinks: number
  issues: OkfIssue[]
}

export function basename(path: string): string {
  return path.split('/').pop() ?? path
}

export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md')
}

export function isReservedPath(path: string): boolean {
  return RESERVED_FILENAMES.has(basename(path).toLowerCase())
}

export function isConceptPath(path: string): boolean {
  return isMarkdownPath(path) && !isReservedPath(path)
}

export function conceptIdFromPath(path: string): string {
  return cleanPath(path).replace(/\.md$/i, '')
}

export function deriveTitleFromPath(path: string): string {
  const stem = basename(path).replace(/\.md$/i, '')
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function parseConcept(path: string, raw: string): OkfConcept {
  if (!isConceptPath(path)) {
    throw new Error(`${path} is a reserved OKF document, not a concept.`)
  }
  const parsed = parseFrontmatter(raw)
  if (!parsed.hasFrontmatter) {
    throw new Error(`${path} is missing YAML frontmatter.`)
  }
  if (parsed.error) {
    throw new Error(`${path} has invalid YAML frontmatter: ${parsed.error}`)
  }
  if (!parsed.frontmatter.type.trim()) {
    throw new Error(`${path} is missing the required type field.`)
  }
  return {
    id: conceptIdFromPath(path),
    path,
    metadata: parsed.frontmatter,
    body: parsed.body,
    links: extractLinks(parsed.body, path),
  }
}

export async function loadConceptCatalog(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<Record<string, OkfConceptSummary>> {
  const conceptEntries = entries.filter(
    (entry) => entry.type === 'file' && isConceptPath(entry.path)
  )
  const pairs = await Promise.all(
    conceptEntries.map(async (entry): Promise<[string, OkfConceptSummary]> => {
      const raw = await provider.readFile(entry.path).catch(() => '')
      const parsed = parseFrontmatter(raw)
      const metadata = parsed.frontmatter
      return [
        entry.path,
        {
          id: conceptIdFromPath(entry.path),
          path: entry.path,
          title: metadata.title || deriveTitleFromPath(entry.path),
          description: metadata.description,
          type: metadata.type || 'Unknown',
          tags: metadata.tags,
          timestamp: metadata.timestamp,
          links: parsed.error ? [] : extractLinks(parsed.body, entry.path),
          conformant:
            parsed.hasFrontmatter &&
            !parsed.error &&
            metadata.type.trim().length > 0,
        },
      ]
    })
  )
  return Object.fromEntries(pairs)
}

export function backlinksFor(
  path: string,
  catalog: Record<string, OkfConceptSummary>
): OkfConceptSummary[] {
  return Object.values(catalog)
    .filter((concept) =>
      concept.links.some((link) => link.targetPath === path)
    )
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function extractLinks(markdown: string, sourcePath: string): OkfLink[] {
  const tree = unified().use(remarkParse).parse(markdown) as Root
  const links: OkfLink[] = []
  walk(tree.children, (node) => {
    if (node.type !== 'link') return
    const link = node as Link
    const targetPath = resolveBundleLink(sourcePath, link.url)
    links.push({
      label: textContent(link.children),
      href: link.url,
      targetPath,
      targetId: targetPath && isConceptPath(targetPath) ? conceptIdFromPath(targetPath) : null,
      external: targetPath === null,
    })
  })
  return links
}

export function resolveBundleLink(sourcePath: string, href: string): string | null {
  const withoutFragment = href.split('#', 1)[0].split('?', 1)[0]
  if (!withoutFragment) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(withoutFragment) || withoutFragment.startsWith('//')) {
    return null
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(withoutFragment)
  } catch {
    decoded = withoutFragment
  }

  const sourceDir = dirname(sourcePath)
  const raw = decoded.startsWith('/') ? decoded.slice(1) : joinPath(sourceDir, decoded)
  const normalized = normalizePath(raw)
  if (!normalized || normalized.startsWith('../')) return null
  if (normalized.endsWith('/')) return `${normalized}${INDEX_FILENAME}`
  return normalized
}

export function validateConcept(path: string, raw: string): OkfIssue[] {
  const issues: OkfIssue[] = []
  const parsed = parseFrontmatter(raw)
  if (!parsed.hasFrontmatter) {
    issues.push({
      path,
      severity: 'error',
      code: 'missing-frontmatter',
      message: 'Concept documents must start with YAML frontmatter.',
    })
    return issues
  }
  if (parsed.error) {
    issues.push({
      path,
      severity: 'error',
      code: 'invalid-frontmatter',
      message: parsed.error,
    })
    return issues
  }
  if (!parsed.frontmatter.type.trim()) {
    issues.push({
      path,
      severity: 'error',
      code: 'missing-type',
      message: 'Concept frontmatter requires a non-empty type field.',
    })
  }
  if (
    parsed.frontmatter.timestamp &&
    Number.isNaN(Date.parse(parsed.frontmatter.timestamp))
  ) {
    issues.push({
      path,
      severity: 'warning',
      code: 'invalid-timestamp',
      message: 'timestamp should be an ISO 8601 datetime.',
    })
  }
  return issues
}

export function validateDocument(path: string, raw: string): OkfIssue[] {
  if (!isMarkdownPath(path)) return []
  const filename = basename(path).toLowerCase()
  if (filename === INDEX_FILENAME) return validateIndex(path, raw)
  if (filename === LOG_FILENAME) return validateLog(path, raw)
  return validateConcept(path, raw)
}

export function assertValidOkfDocument(path: string, raw: string): void {
  const errors = validateDocument(path, raw).filter((issue) => issue.severity === 'error')
  if (errors.length === 0) return
  throw new Error(errors.map((issue) => issue.message).join(' '))
}

export async function validateBundle(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<OkfBundleReport> {
  const files = entries.filter((entry) => entry.type === 'file' && isMarkdownPath(entry.path))
  const pathSet = new Set(files.map((entry) => cleanPath(entry.path)))
  const issues: OkfIssue[] = []
  let concepts = 0
  let indexes = 0
  let logs = 0
  let links = 0
  let brokenLinks = 0

  for (const entry of files) {
    const raw = await provider.readFile(entry.path).catch(() => '')
    const filename = basename(entry.path).toLowerCase()
    if (filename === INDEX_FILENAME) {
      indexes++
      issues.push(...validateDocument(entry.path, raw))
      continue
    }
    if (filename === LOG_FILENAME) {
      logs++
      issues.push(...validateDocument(entry.path, raw))
      continue
    }

    concepts++
    const conceptIssues = validateDocument(entry.path, raw)
    issues.push(...conceptIssues)
    if (conceptIssues.some((issue) => issue.severity === 'error')) continue

    const parsed = parseFrontmatter(raw)
    const conceptLinks = extractLinks(parsed.body, entry.path).filter((link) => !link.external)
    links += conceptLinks.length
    for (const link of conceptLinks) {
      if (link.targetPath && !pathSet.has(link.targetPath)) {
        brokenLinks++
        issues.push({
          path: entry.path,
          severity: 'warning',
          code: 'broken-link',
          message: `Link target does not currently exist: ${link.href}`,
        })
      }
    }
  }

  return {
    version: OKF_VERSION,
    conformant: !issues.some((issue) => issue.severity === 'error'),
    concepts,
    indexes,
    logs,
    links,
    brokenLinks,
    issues,
  }
}

function validateIndex(path: string, raw: string): OkfIssue[] {
  const parsed = parseFrontmatter(raw)
  if (parsed.hasFrontmatter) {
    if (parsed.error) {
      return [{
        path,
        severity: 'error',
        code: 'invalid-index',
        message: `index.md has invalid YAML frontmatter: ${parsed.error}`,
      }]
    }
    if (cleanPath(path) !== INDEX_FILENAME) {
      return [{
        path,
        severity: 'error',
        code: 'invalid-index',
        message: 'Only the vault-root index.md may contain frontmatter.',
      }]
    }
    const standardFieldsPresent =
      parsed.frontmatter.type ||
      parsed.frontmatter.title ||
      parsed.frontmatter.description ||
      parsed.frontmatter.resource ||
      parsed.frontmatter.tags.length > 0 ||
      parsed.frontmatter.timestamp
    const unsupportedKeys = Object.keys(parsed.frontmatter.extra).filter(
      (key) => key !== 'okf_version'
    )
    if (standardFieldsPresent || unsupportedKeys.length > 0) {
      return [{
        path,
        severity: 'error',
        code: 'invalid-index',
        message: 'Root index.md frontmatter may only declare okf_version.',
      }]
    }
  }

  const body = parsed.hasFrontmatter ? parsed.body : raw
  if (
    !/^#\s+\S/m.test(body) ||
    (!/\[[^\]]+\]\([^)]+\)/.test(body) && !/_No concepts in this scope yet\._/.test(body))
  ) {
    return [{
      path,
      severity: 'error',
      code: 'invalid-index',
      message: 'index.md must use headings and Markdown links to enumerate its scope.',
    }]
  }
  return []
}

function validateLog(path: string, raw: string): OkfIssue[] {
  const dateHeadings = [...raw.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
  if (
    !/^#\s+\S/m.test(raw) ||
    dateHeadings.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))
  ) {
    return [{
      path,
      severity: 'error',
      code: 'invalid-log',
      message: 'log.md must have a title and ISO 8601 YYYY-MM-DD date headings.',
    }]
  }
  return []
}

function walk(nodes: RootContent[], visit: (node: RootContent) => void): void {
  for (const node of nodes) {
    visit(node)
    if ('children' in node && Array.isArray(node.children)) {
      walk(node.children as RootContent[], visit)
    }
  }
}

function textContent(nodes: Array<{ type: string; value?: string; children?: unknown[] }>): string {
  return nodes
    .map((node) => {
      if (typeof node.value === 'string') return node.value
      if (Array.isArray(node.children)) {
        return textContent(node.children as Array<{ type: string; value?: string; children?: unknown[] }>)
      }
      return ''
    })
    .join('')
}

function cleanPath(path: string): string {
  return normalizePath(path.replace(/^\/+/, ''))
}

function dirname(path: string): string {
  const parts = cleanPath(path).split('/')
  parts.pop()
  return parts.join('/')
}

function joinPath(left: string, right: string): string {
  return left ? `${left}/${right}` : right
}

function normalizePath(path: string): string {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (parts.length === 0) return '../'
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

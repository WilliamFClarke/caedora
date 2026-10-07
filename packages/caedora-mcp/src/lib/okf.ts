import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { OKF_VERSION, lastChanged, parseFrontmatter, type Frontmatter } from './frontmatter.js'
import { titleFromPath } from './conventions.js'
import { listFilesRecursive, type FileEntry, type VaultProvider } from '../providers/types.js'

export { OKF_VERSION }
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
    | 'invalid-trust'
    | 'invalid-sources'
    | 'invalid-computation'
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

export function conceptId(path: string): string {
  return cleanPath(path).replace(/\.md$/i, '')
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
    id: conceptId(path),
    path,
    metadata: parsed.frontmatter,
    body: parsed.body,
    links: extractLinks(parsed.body, path),
  }
}

export function extractLinks(markdown: string, sourcePath: string): OkfLink[] {
  const tree = unified().use(remarkParse).parse(markdown) as unknown as NodeLike
  const links: OkfLink[] = []
  walk(tree, (node) => {
    if (node.type !== 'link' || typeof node.url !== 'string') return
    const targetPath = resolveBundleLink(sourcePath, node.url)
    links.push({
      label: textContent(node),
      href: node.url,
      targetPath,
      targetId: targetPath && isConceptPath(targetPath) ? conceptId(targetPath) : null,
      external: targetPath === null,
    })
  })
  return links
}

export function resolveBundleLink(sourcePath: string, href: string): string | null {
  const value = href.split('#', 1)[0].split('?', 1)[0]
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null
  const decoded = safeDecode(value)
  const sourceDir = dirname(sourcePath)
  const raw = decoded.startsWith('/') ? decoded.slice(1) : sourceDir ? `${sourceDir}/${decoded}` : decoded
  const normalized = normalizePath(raw)
  if (!normalized || normalized.startsWith('../')) return null
  return normalized.endsWith('/') ? `${normalized}${INDEX_FILENAME}` : normalized
}

export function validateConcept(path: string, raw: string): OkfIssue[] {
  const parsed = parseFrontmatter(raw)
  if (!parsed.hasFrontmatter) {
    return [{ path, severity: 'error', code: 'missing-frontmatter', message: 'Concept documents must start with YAML frontmatter.' }]
  }
  if (parsed.error) {
    return [{ path, severity: 'error', code: 'invalid-frontmatter', message: parsed.error }]
  }
  const issues: OkfIssue[] = []
  if (!parsed.frontmatter.type.trim()) {
    issues.push({ path, severity: 'error', code: 'missing-type', message: 'Concept frontmatter requires a non-empty type field.' })
  }
  return [...issues, ...v02Issues(path, parsed.frontmatter)]
}

export type LifecycleStatus = 'draft' | 'stable' | 'deprecated'
export type TrustTier = 'unverified' | 'machine-confirmed' | 'human-reviewed'

const LIFECYCLE_STATUSES = new Set<string>(['draft', 'stable', 'deprecated'])

/** OKF v0.2 §5.4: an absent status is stable; other workflow values are read as stable too. */
export function lifecycleStatus(metadata: Frontmatter): LifecycleStatus {
  const status = metadata.status.trim().toLowerCase()
  return LIFECYCLE_STATUSES.has(status) ? (status as LifecycleStatus) : 'stable'
}

/** OKF v0.2 §5.3: the trust tier is derived from `verified`, never stored. */
export function trustTier(metadata: Frontmatter): TrustTier {
  if (metadata.verified.length === 0) return 'unverified'
  return metadata.verified.some((entry) => entry.by.startsWith('human:'))
    ? 'human-reviewed'
    : 'machine-confirmed'
}

/** OKF v0.2 §5.5: a concept is stale when now >= stale_after. */
export function isStale(metadata: Frontmatter, now = new Date()): boolean {
  const staleAfter = Date.parse(metadata.staleAfter)
  return !Number.isNaN(staleAfter) && now.getTime() >= staleAfter
}

/** The latest verification time, or an empty string when unverified. */
export function lastVerified(metadata: Frontmatter): string {
  return metadata.verified
    .map((entry) => entry.at)
    .filter((at) => !Number.isNaN(Date.parse(at)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? ''
}

export interface OkfSource {
  id: string
  resource: string
  title: string
}

/** Read the `sources` provenance list (OKF v0.2 §5.1), skipping entries without a resource. */
export function conceptSources(metadata: Frontmatter): OkfSource[] {
  const sources = metadata.extra.sources
  if (!Array.isArray(sources)) return []
  return sources.flatMap((entry) => {
    if (!isPlainRecord(entry) || typeof entry.resource !== 'string' || !entry.resource.trim()) return []
    return [{
      id: typeof entry.id === 'string' ? entry.id : '',
      resource: entry.resource,
      title: typeof entry.title === 'string' ? entry.title : '',
    }]
  })
}

/** OKF v0.2 timestamps are ISO 8601 datetimes with an explicit UTC offset. */
export function isOkfDatetime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/i.test(value.trim()) &&
    !Number.isNaN(Date.parse(value))
}

function v02Issues(path: string, metadata: Frontmatter): OkfIssue[] {
  const issues: OkfIssue[] = []
  const warn = (code: OkfIssue['code'], message: string) => issues.push({ path, severity: 'warning', code, message })
  const checkDatetime = (field: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return
    if (typeof value !== 'string' || !isOkfDatetime(value)) {
      warn('invalid-timestamp', `${field} should be an ISO 8601 datetime with a UTC offset, such as 2026-06-30T14:00:00Z.`)
    }
  }

  checkDatetime('timestamp', metadata.timestamp)
  if (metadata.generated) {
    if (!metadata.generated.by.trim()) warn('invalid-trust', 'generated needs a by actor, such as human:<id> or <agent>/<version>.')
    checkDatetime('generated.at', metadata.generated.at)
  } else if (metadata.extra.generated !== undefined) {
    warn('invalid-trust', 'generated should be a { by, at } mapping.')
  }
  if (metadata.extra.verified !== undefined) {
    warn('invalid-trust', 'verified should be a { by, at } mapping or a list of them.')
  }
  metadata.verified.forEach((entry, index) => {
    if (!entry.by.trim()) warn('invalid-trust', `verified entry ${index + 1} needs a by actor.`)
    checkDatetime(`verified entry ${index + 1} at`, entry.at)
  })
  // Many vaults already use status for workflow states (active, queued). OKF
  // treats unknown values as soft guidance, so they read as stable without a warning.
  checkDatetime('stale_after', metadata.staleAfter)

  const sources = metadata.extra.sources
  if (sources !== undefined) {
    if (!Array.isArray(sources)) {
      warn('invalid-sources', 'sources should be a list of { resource, id, title } entries.')
    } else {
      sources.forEach((entry, index) => {
        if (!isPlainRecord(entry) || typeof entry.resource !== 'string' || !entry.resource.trim()) {
          warn('invalid-sources', `sources entry ${index + 1} needs a resource.`)
          return
        }
        checkDatetime(`sources entry ${index + 1} last_modified`, entry.last_modified)
        if (isPlainRecord(entry.usage_window)) {
          checkDatetime(`sources entry ${index + 1} usage_window.from`, entry.usage_window.from)
          checkDatetime(`sources entry ${index + 1} usage_window.to`, entry.usage_window.to)
        }
      })
    }
  }
  const usageWindow = metadata.extra.usage_window
  if (isPlainRecord(usageWindow)) {
    checkDatetime('usage_window.from', usageWindow.from)
    checkDatetime('usage_window.to', usageWindow.to)
  }

  if (metadata.type.trim().toLowerCase() === 'attested computation') {
    const runtime = metadata.extra.runtime
    if (typeof runtime !== 'string' || !runtime.trim()) {
      warn('invalid-computation', 'Attested Computation concepts require a runtime, such as bigquery or python.')
    }
  }
  return issues
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  entries?: FileEntry[]
): Promise<OkfBundleReport> {
  const all = entries ?? (await listFilesRecursive(provider))
  const files = all.filter((entry) => entry.type === 'file' && isMarkdownPath(entry.path))
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
    issues.push(...validateDocument(entry.path, raw))
    if (filename === INDEX_FILENAME) {
      indexes++
      continue
    }
    if (filename === LOG_FILENAME) {
      logs++
      continue
    }
    concepts++
    if (issues.some((issue) => issue.path === entry.path && issue.severity === 'error')) continue

    const conceptLinks = extractLinks(parseFrontmatter(raw).body, entry.path).filter((link) => !link.external)
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

export async function buildConceptCatalog(provider: VaultProvider, entries?: FileEntry[]) {
  const all = entries ?? (await listFilesRecursive(provider))
  const conceptEntries = all.filter((item) => item.type === 'file' && isConceptPath(item.path))
  return Promise.all(
    conceptEntries.map(async (entry) => {
      const parsed = parseFrontmatter(await provider.readFile(entry.path).catch(() => ''))
      return {
        id: conceptId(entry.path),
        path: entry.path,
        type: parsed.frontmatter.type || 'Unknown',
        title: parsed.frontmatter.title || titleFromPath(entry.path),
        description: parsed.frontmatter.description,
        resource: parsed.frontmatter.resource,
        tags: parsed.frontmatter.tags,
        lastChanged: lastChanged(parsed.frontmatter),
        status: lifecycleStatus(parsed.frontmatter),
        trust: trustTier(parsed.frontmatter),
        stale: isStale(parsed.frontmatter),
        links: parsed.error ? [] : extractLinks(parsed.body, entry.path),
        conformant: parsed.hasFrontmatter && !parsed.error && !!parsed.frontmatter.type.trim(),
      }
    })
  )
}

/** Rebuild every hierarchical index.md required for progressive disclosure. */
export async function rebuildIndexes(provider: VaultProvider, entries?: FileEntry[]) {
  const all = entries ?? (await listFilesRecursive(provider))
  const concepts = await buildConceptCatalog(provider, all)
  const directories = collectDirectories(all, concepts.map((item) => item.path))
  const changed: string[] = []
  for (const directory of directories) {
    const path = directory ? `${directory}/${INDEX_FILENAME}` : INDEX_FILENAME
    const content = renderIndex(directory, directories, concepts)
    const current = await provider.readFile(path).catch(() => null)
    if (current === content) continue
    await provider.writeFile(path, content)
    changed.push(path)
  }
  if (changed.length > 0 && !provider.writesAreCommits) {
    await provider.commit(changed.length === 1 ? `Update ${changed[0]}` : 'Update vault indexes', changed)
  }
  return { updated: changed }
}

export async function appendLog(
  provider: VaultProvider,
  action: string,
  message: string,
  scope = ''
) {
  const path = scope ? `${scope}/${LOG_FILENAME}` : LOG_FILENAME
  const date = new Date().toISOString().slice(0, 10)
  const current = await provider.readFile(path).catch(() => '# Vault Update Log\n')
  const next = insertNewestEntry(current, date, `* **${action}**: ${message}`)
  if (next !== current) {
    await provider.writeFile(path, next)
    if (!provider.writesAreCommits) await provider.commit(`Update ${path}`, [path])
  }
  return { path, action, recorded: true }
}

export function insertNewestEntry(log: string, date: string, entry: string): string {
  const normalized = log.trimEnd()
  const heading = `## ${date}`
  if (normalized.includes(`${heading}\n`)) {
    const marker = `${heading}\n`
    const index = normalized.indexOf(marker) + marker.length
    return `${normalized.slice(0, index)}${entry}\n${normalized.slice(index).replace(/^\n*/, '')}\n`
  }

  const titleMatch = normalized.match(/^#\s+.+$/m)
  if (!titleMatch || titleMatch.index === undefined) {
    return `# Vault Update Log\n\n${heading}\n${entry}\n`
  }
  const titleEnd = titleMatch.index + titleMatch[0].length
  return `${normalized.slice(0, titleEnd)}\n\n${heading}\n${entry}\n${normalized.slice(titleEnd).replace(/^\s*/, '')}\n`
}

function renderIndex(
  directory: string,
  directories: string[],
  concepts: Array<{ path: string; title: string; description: string; type: string; tags: string[] }>
): string {
  const childDirectories = directories.filter((candidate) => candidate && dirname(candidate) === directory).sort()
  const childConcepts = concepts
    .filter((concept) => dirname(concept.path) === directory)
    .sort((a, b) => a.title.localeCompare(b.title))

  const lines: string[] = []
  if (!directory) lines.push('---', `okf_version: "${OKF_VERSION}"`, '---', '')
  lines.push('# Index', '')
  if (!directory) {
    lines.push(
      'Progressive-disclosure map of this Open Knowledge Format vault.',
      'Open the most relevant concept rather than loading the entire vault.',
      ''
    )
  }
  if (childDirectories.length > 0) {
    lines.push('### Directories', '')
    for (const child of childDirectories) {
      const name = child.split('/').pop() ?? child
      lines.push(`* [${titleFromPath(name)}](${encodeURI(`${name}/${INDEX_FILENAME}`)}) - Browse this section.`)
    }
    lines.push('')
  }
  if (childConcepts.length > 0) {
    lines.push('### Concepts', '')
    for (const concept of childConcepts) {
      const relative = concept.path.slice(directory ? directory.length + 1 : 0)
      const description = concept.description || `${concept.type} concept.`
      const tags = concept.tags.length > 0 ? ` Tags: ${concept.tags.join(', ')}.` : ''
      lines.push(`* [${concept.title}](${encodeURI(relative)}) - ${description}${tags}`)
    }
    lines.push('')
  }
  if (childDirectories.length === 0 && childConcepts.length === 0) {
    lines.push('_No concepts in this scope yet._', '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function collectDirectories(entries: FileEntry[], conceptPaths: string[]) {
  const directories = new Set<string>([''])
  for (const entry of entries) {
    if (entry.type === 'dir') addParents(directories, entry.path)
  }
  for (const path of conceptPaths) addParents(directories, dirname(path))
  return [...directories].sort((a, b) => {
    const depth = a.split('/').filter(Boolean).length - b.split('/').filter(Boolean).length
    return depth || a.localeCompare(b)
  })
}

function addParents(target: Set<string>, path: string) {
  if (!path) return
  const parts = path.split('/')
  for (let index = 1; index <= parts.length; index++) target.add(parts.slice(0, index).join('/'))
}

function validateIndex(path: string, raw: string): OkfIssue[] {
  const invalid = (message: string): OkfIssue[] => [{ path, severity: 'error', code: 'invalid-index', message }]
  const parsed = parseFrontmatter(raw)
  if (parsed.hasFrontmatter) {
    if (parsed.error) return invalid(`index.md has invalid YAML frontmatter: ${parsed.error}`)
    if (cleanPath(path) !== INDEX_FILENAME) return invalid('Only the vault-root index.md may contain frontmatter.')
    const standardFieldsPresent =
      parsed.frontmatter.type ||
      parsed.frontmatter.title ||
      parsed.frontmatter.description ||
      parsed.frontmatter.resource ||
      parsed.frontmatter.tags.length > 0 ||
      parsed.frontmatter.generated ||
      parsed.frontmatter.verified.length > 0 ||
      parsed.frontmatter.status ||
      parsed.frontmatter.staleAfter ||
      parsed.frontmatter.timestamp
    const unsupportedKeys = Object.keys(parsed.frontmatter.extra).filter((key) => key !== 'okf_version')
    if (standardFieldsPresent || unsupportedKeys.length > 0) {
      return invalid('Root index.md frontmatter may only declare okf_version.')
    }
  }
  const body = parsed.hasFrontmatter ? parsed.body : raw
  if (
    !/^#\s+\S/m.test(body) ||
    (!/\[[^\]]+\]\([^)]+\)/.test(body) && !/_No concepts in this scope yet\._/.test(body))
  ) {
    return invalid('index.md must use headings and Markdown links to enumerate its scope.')
  }
  return []
}

function validateLog(path: string, raw: string): OkfIssue[] {
  const dates = [...raw.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
  if (!/^#\s+\S/m.test(raw) || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return [{ path, severity: 'error', code: 'invalid-log', message: 'log.md must have a title and ISO 8601 YYYY-MM-DD date headings.' }]
  }
  return []
}

interface NodeLike {
  type: string
  value?: string
  url?: string
  children?: NodeLike[]
}

function walk(node: NodeLike, visit: (node: NodeLike) => void) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

function textContent(node: NodeLike): string {
  if (node.value) return node.value
  return (node.children ?? []).map(textContent).join('')
}

function cleanPath(path: string): string {
  return normalizePath(path.replace(/^\/+/, ''))
}

function dirname(path: string): string {
  const parts = cleanPath(path).split('/')
  parts.pop()
  return parts.join('/')
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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

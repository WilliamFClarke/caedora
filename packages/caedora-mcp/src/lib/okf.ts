import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { parseFrontmatter } from './frontmatter.js'
import { titleFromPath } from './conventions.js'
import { listFilesRecursive, type FileEntry, type VaultProvider } from '../providers/types.js'

export const OKF_VERSION = '0.1'
export const INDEX_FILENAME = 'index.md'
export const LOG_FILENAME = 'log.md'

export function isReservedPath(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase()
  return name === INDEX_FILENAME || name === LOG_FILENAME
}

export function isConceptPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md') && !isReservedPath(path)
}

export function conceptId(path: string): string {
  return path.replace(/^\/+/, '').replace(/\.md$/i, '')
}

export function extractLinks(markdown: string, sourcePath: string) {
  const tree = unified().use(remarkParse).parse(markdown) as unknown as NodeLike
  const links: Array<{
    label: string
    href: string
    targetPath: string | null
    targetId: string | null
    external: boolean
  }> = []
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

export async function validateBundle(provider: VaultProvider) {
  const entries = await listFilesRecursive(provider)
  const markdown = entries.filter((entry) => entry.type === 'file' && entry.path.endsWith('.md'))
  const paths = new Set(markdown.map((entry) => entry.path))
  const issues: Array<{ path: string; severity: 'error' | 'warning'; code: string; message: string }> = []
  let concepts = 0
  let links = 0
  let brokenLinks = 0

  for (const entry of markdown) {
    const raw = await provider.readFile(entry.path)
    if (isReservedPath(entry.path)) {
      validateReserved(entry.path, raw, issues)
      continue
    }
    concepts++
    const parsed = parseFrontmatter(raw)
    if (!parsed.hasFrontmatter) {
      issues.push({ path: entry.path, severity: 'error', code: 'missing-frontmatter', message: 'Concept requires YAML frontmatter.' })
      continue
    }
    if (parsed.error) {
      issues.push({ path: entry.path, severity: 'error', code: 'invalid-frontmatter', message: parsed.error })
      continue
    }
    if (!parsed.frontmatter.type.trim()) {
      issues.push({ path: entry.path, severity: 'error', code: 'missing-type', message: 'Concept requires a non-empty type.' })
    }
    if (parsed.frontmatter.timestamp && Number.isNaN(Date.parse(parsed.frontmatter.timestamp))) {
      issues.push({ path: entry.path, severity: 'warning', code: 'invalid-timestamp', message: 'timestamp should be ISO 8601.' })
    }
    for (const link of extractLinks(parsed.body, entry.path).filter((item) => !item.external)) {
      links++
      if (link.targetPath && !paths.has(link.targetPath)) {
        brokenLinks++
        issues.push({ path: entry.path, severity: 'warning', code: 'broken-link', message: `Missing target ${link.href}` })
      }
    }
  }

  return {
    version: OKF_VERSION,
    conformant: !issues.some((issue) => issue.severity === 'error'),
    concepts,
    links,
    brokenLinks,
    issues,
  }
}

export async function buildConceptCatalog(provider: VaultProvider) {
  const entries = await listFilesRecursive(provider)
  const concepts = []
  for (const entry of entries.filter((item) => item.type === 'file' && isConceptPath(item.path))) {
    const raw = await provider.readFile(entry.path)
    const parsed = parseFrontmatter(raw)
    concepts.push({
      id: conceptId(entry.path),
      path: entry.path,
      type: parsed.frontmatter.type || 'Unknown',
      title: parsed.frontmatter.title || titleFromPath(entry.path),
      description: parsed.frontmatter.description,
      resource: parsed.frontmatter.resource,
      tags: parsed.frontmatter.tags,
      timestamp: parsed.frontmatter.timestamp,
      links: parsed.error ? [] : extractLinks(parsed.body, entry.path),
      conformant: parsed.hasFrontmatter && !parsed.error && !!parsed.frontmatter.type.trim(),
    })
  }
  return concepts
}

export async function rebuildIndexes(provider: VaultProvider) {
  const entries = await listFilesRecursive(provider)
  const concepts = await buildConceptCatalog(provider)
  const directories = collectDirectories(entries, concepts.map((item) => item.path))
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
    await provider.commit('Update bundle indexes', changed)
  }
  return { updated: changed }
}

export async function appendLog(
  provider: VaultProvider,
  action: string,
  message: string
) {
  const date = new Date().toISOString().slice(0, 10)
  const entry = `* **${action}**: ${message}`
  const current = await provider.readFile(LOG_FILENAME).catch(() => '# Bundle Update Log\n')
  const heading = `## ${date}`
  let next: string
  if (current.includes(`${heading}\n`)) {
    const marker = `${heading}\n`
    const index = current.indexOf(marker) + marker.length
    next = `${current.slice(0, index)}${entry}\n${current.slice(index).replace(/^\n*/, '')}`
  } else {
    const title = current.match(/^#\s+.+$/m)?.[0] ?? '# Bundle Update Log'
    const rest = current.replace(/^#\s+.+\s*/m, '').trim()
    next = `${title}\n\n${heading}\n${entry}\n${rest ? `\n${rest}\n` : ''}`
  }
  await provider.writeFile(LOG_FILENAME, next)
  if (!provider.writesAreCommits) await provider.commit(`Update ${LOG_FILENAME}`, [LOG_FILENAME])
  return { path: LOG_FILENAME, action, recorded: true }
}

function renderIndex(
  directory: string,
  directories: string[],
  concepts: Awaited<ReturnType<typeof buildConceptCatalog>>
): string {
  const lines = directory
    ? [`# ${titleFromPath(directory)} Index`, '']
    : ['---', `okf_version: "${OKF_VERSION}"`, '---', '', '# Knowledge Bundle', '', 'Progressive-disclosure map of this OKF bundle.', '']
  const children = directories.filter((candidate) => candidate && dirname(candidate) === directory)
  if (children.length > 0) {
    lines.push('# Directories', '')
    for (const child of children.sort()) {
      const name = child.split('/').pop() ?? child
      lines.push(`* [${titleFromPath(name)}](${encodeURI(`${name}/${INDEX_FILENAME}`)}) - Browse this section.`)
    }
    lines.push('')
  }
  const local = concepts.filter((item) => dirname(item.path) === directory).sort((a, b) => a.title.localeCompare(b.title))
  if (local.length > 0) {
    lines.push('# Concepts', '')
    for (const item of local) {
      const relative = item.path.slice(directory ? directory.length + 1 : 0)
      lines.push(`* [${item.title}](${encodeURI(relative)}) - ${item.description || `${item.type} concept.`}`)
    }
    lines.push('')
  }
  if (children.length === 0 && local.length === 0) lines.push('_No concepts in this scope yet._', '')
  return `${lines.join('\n').trimEnd()}\n`
}

function collectDirectories(entries: FileEntry[], conceptPaths: string[]) {
  const directories = new Set<string>([''])
  for (const entry of entries) {
    if (entry.type === 'dir') addParents(directories, entry.path)
  }
  for (const path of conceptPaths) addParents(directories, dirname(path))
  return [...directories]
}

function addParents(target: Set<string>, path: string) {
  if (!path) return
  const parts = path.split('/')
  for (let index = 1; index <= parts.length; index++) target.add(parts.slice(0, index).join('/'))
}

function validateReserved(
  path: string,
  raw: string,
  issues: Array<{ path: string; severity: 'error' | 'warning'; code: string; message: string }>
) {
  const name = path.split('/').pop()?.toLowerCase()
  if (name === INDEX_FILENAME) {
    const parsed = parseFrontmatter(raw)
    if (parsed.hasFrontmatter && parsed.error) {
      issues.push({ path, severity: 'error', code: 'invalid-index', message: `Index has invalid YAML frontmatter: ${parsed.error}` })
      return
    }
    if (parsed.hasFrontmatter && path.replace(/^\/+/, '') !== INDEX_FILENAME) {
      issues.push({ path, severity: 'error', code: 'invalid-index', message: 'Only the bundle-root index.md may contain frontmatter.' })
      return
    }
    if (parsed.hasFrontmatter) {
      const standardFieldsPresent =
        parsed.frontmatter.type ||
        parsed.frontmatter.title ||
        parsed.frontmatter.description ||
        parsed.frontmatter.resource ||
        parsed.frontmatter.tags.length > 0 ||
        parsed.frontmatter.timestamp
      const unsupportedKeys = Object.keys(parsed.frontmatter.extra).filter((key) => key !== 'okf_version')
      if (standardFieldsPresent || unsupportedKeys.length > 0) {
        issues.push({ path, severity: 'error', code: 'invalid-index', message: 'Root index.md frontmatter may only declare okf_version.' })
        return
      }
    }
    const body = parsed.hasFrontmatter ? parsed.body : raw
    if (
      !/^#\s+\S/m.test(body) ||
      (!/\[[^\]]+\]\([^)]+\)/.test(body) && !/_No concepts in this scope yet\._/.test(body))
    ) {
      issues.push({ path, severity: 'error', code: 'invalid-index', message: 'Index requires headings and links.' })
    }
  }
  if (name === LOG_FILENAME) {
    const dates = [...raw.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
    if (!/^#\s+\S/m.test(raw) || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      issues.push({ path, severity: 'error', code: 'invalid-log', message: 'Log date headings must use YYYY-MM-DD.' })
    }
  }
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

function dirname(path: string): string {
  const parts = path.split('/')
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

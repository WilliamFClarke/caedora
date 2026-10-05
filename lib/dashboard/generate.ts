import { parseFrontmatter } from '../frontmatter'
import { isDatasetFrontmatter } from '../dataset'
import { isDashboardFrontmatter, DASHBOARD_FENCE } from './spec'

interface MarkdownFile {
  path: string
  content: string
}

/**
 * Builds a default dashboard.md that shows every Dataset in a set of files as
 * a table. Returns null when the files already include a dashboard or have no
 * Datasets.
 */
export function generateDefaultDashboard(files: MarkdownFile[], name: string): MarkdownFile | null {
  const parsed = files
    .filter((file) => file.path.toLowerCase().endsWith('.md'))
    .map((file) => ({ file, frontmatter: parseFrontmatter(file.content).frontmatter }))
  if (parsed.some(({ frontmatter }) => isDashboardFrontmatter(frontmatter))) return null

  const datasets = parsed.filter(({ frontmatter }) => isDatasetFrontmatter(frontmatter))
  if (datasets.length === 0) return null

  const root = commonDirectory(files.map((file) => file.path))
  const path = root ? `${root}/dashboard.md` : 'dashboard.md'
  if (files.some((file) => file.path === path)) return null

  const aliases = new Set<string>()
  const sources = datasets.map(({ file, frontmatter }) => {
    const relative = root ? file.path.slice(root.length + 1) : file.path
    let alias = relative.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    while (aliases.has(alias)) alias = `${alias}_2`
    aliases.add(alias)
    const title = frontmatter.title || titleFromPath(file.path)
    return { alias, relative, title }
  })

  const links = sources.map((source) => `[${source.title}](${encodeURI(source.relative)})`).join(', ')
  const yaml = [
    'data:',
    ...sources.map((source) => `  ${source.alias}: ${JSON.stringify(source.relative)}`),
    'rows:',
    ...sources.flatMap((source) => [
      '  - columns: 1',
      '    items:',
      `      - table: { title: ${JSON.stringify(source.title)}, source: ${source.alias} }`,
    ]),
  ].join('\n')

  const content = `---
type: Dashboard
title: ${JSON.stringify(`${name} dashboard`)}
description: ${JSON.stringify(`Every ${name} Dataset at a glance.`)}
tags: [dashboard]
---

# ${name} dashboard

Reads ${links}. Switch to Source to add charts and summary cards.

\`\`\`${DASHBOARD_FENCE}
${yaml}
\`\`\`
`
  return { path, content }
}

function commonDirectory(paths: string[]): string {
  const dirs = paths.map((path) => path.split('/').slice(0, -1))
  if (dirs.length === 0) return ''
  const first = dirs[0]
  let length = first.length
  for (const dir of dirs.slice(1)) {
    let index = 0
    while (index < length && dir[index] === first[index]) index++
    length = index
  }
  return first.slice(0, length).join('/')
}

function titleFromPath(path: string): string {
  const stem = (path.split('/').pop() ?? path).replace(/\.md$/i, '')
  const words = stem.split(/[-_]+/).filter(Boolean).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

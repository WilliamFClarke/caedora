import { z } from 'zod'
import { parseFrontmatter } from '../lib/frontmatter.js'
import { conceptId, isConceptPath } from '../lib/okf.js'
import { listFilesRecursive, type VaultProvider } from '../providers/types.js'

export const listConceptsSchema = {
  folder: z.string().optional().describe('Directory path relative to the bundle root.'),
  type: z.string().optional().describe('Optional exact concept type filter.'),
}

export async function listConcepts(
  provider: VaultProvider,
  { folder, type }: { folder?: string; type?: string }
) {
  const entries = await listFilesRecursive(provider)
  const concepts = []
  for (const entry of entries) {
    if (entry.type !== 'file' || !isConceptPath(entry.path)) continue
    if (folder && entry.path !== folder && !entry.path.startsWith(`${folder}/`)) continue
    const raw = await provider.readFile(entry.path)
    const parsed = parseFrontmatter(raw)
    if (type && parsed.frontmatter.type !== type) continue
    concepts.push({
      id: conceptId(entry.path),
      path: entry.path,
      type: parsed.frontmatter.type || 'Unknown',
      title: parsed.frontmatter.title,
      description: parsed.frontmatter.description,
      tags: parsed.frontmatter.tags,
      timestamp: parsed.frontmatter.timestamp,
      conformant: parsed.hasFrontmatter && !parsed.error && !!parsed.frontmatter.type.trim(),
      size: entry.size,
      lastModified: entry.lastModified,
    })
  }
  return concepts
}

export const readConceptSchema = {
  path: z.string().describe('Concept path relative to the bundle root.'),
}

export async function readConcept(
  provider: VaultProvider,
  { path }: { path: string }
) {
  if (!isConceptPath(path)) throw new Error(`${path} is not an OKF concept path.`)
  const raw = await provider.readFile(path)
  const parsed = parseFrontmatter(raw)
  return {
    id: conceptId(path),
    path,
    metadata: parsed.frontmatter,
    body: parsed.body,
    conformant: parsed.hasFrontmatter && !parsed.error && !!parsed.frontmatter.type.trim(),
    parseError: parsed.error,
  }
}

export const grepConceptsSchema = {
  regex: z.string().describe('JavaScript regular expression to search for.'),
  flags: z.string().optional().describe('Regex flags. Defaults to "i".'),
  limit: z.number().int().positive().max(500).optional().describe('Maximum matches.'),
}

export async function grepConcepts(
  provider: VaultProvider,
  { regex, flags = 'i', limit = 100 }: { regex: string; flags?: string; limit?: number }
) {
  const re = new RegExp(regex, flags.includes('g') ? flags : `${flags}g`)
  const entries = await listFilesRecursive(provider)
  const hits: Array<{ path: string; line: number; text: string }> = []
  for (const entry of entries.filter((item) => item.type === 'file' && isConceptPath(item.path))) {
    const lines = (await provider.readFile(entry.path)).split(/\r?\n/)
    for (let index = 0; index < lines.length && hits.length < limit; index++) {
      if (re.test(lines[index])) hits.push({ path: entry.path, line: index + 1, text: lines[index].trim() })
      re.lastIndex = 0
    }
    if (hits.length >= limit) break
  }
  return hits
}

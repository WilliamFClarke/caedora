import { z } from 'zod'
import {
  combine,
  createConceptFrontmatter,
  markGenerated,
  parseFrontmatter,
  uniqueTags,
  type Frontmatter,
} from '../lib/frontmatter.js'
import {
  appendLog,
  isConceptPath,
  isReservedPath,
  rebuildIndexes,
} from '../lib/okf.js'
import { titleFromPath } from '../lib/conventions.js'
import type { VaultProvider } from '../providers/types.js'

/** Default OKF actor for content written through caedora-mcp. */
export const MCP_ACTOR = 'caedora-mcp/0.2.0'

const generatedBySchema = z
  .string()
  .optional()
  .describe(`OKF actor recorded in generated.by, such as <agent>/<model> or human:<id>. Defaults to ${MCP_ACTOR}.`)

const metadataShape = {
  type: z.string().min(1).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  resource: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'stable', 'deprecated']).optional(),
  staleAfter: z.string().optional().describe('ISO 8601 datetime with a UTC offset, written as stale_after.'),
  timestamp: z.string().optional().describe('ISO 8601 datetime of this change, written as generated.at.'),
}

export const createConceptSchema = {
  path: z.string().describe('New concept path ending in .md. The path is the concept ID.'),
  type: z.string().min(1).describe('Required descriptive concept type.'),
  title: z.string().optional().describe('Display title. Derived from the path when omitted.'),
  description: z.string().optional().describe('One-sentence summary for indexes and retrieval.'),
  resource: z.string().optional().describe('Canonical URI for the described asset or source.'),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'stable', 'deprecated']).optional(),
  timestamp: z.string().optional().describe('ISO 8601 datetime written as generated.at. Defaults to now.'),
  generatedBy: generatedBySchema,
  sources: z
    .array(z.object({ resource: z.string(), id: z.string().optional(), title: z.string().optional() }))
    .optional()
    .describe('OKF provenance: the materials this concept derives from.'),
  body: z.string().describe('Standard Markdown body.'),
}

export async function createConcept(
  provider: VaultProvider,
  args: {
    path: string
    type: string
    title?: string
    description?: string
    resource?: string
    tags?: string[]
    status?: string
    timestamp?: string
    generatedBy?: string
    sources?: Array<{ resource: string; id?: string; title?: string }>
    body: string
  }
) {
  if (!isConceptPath(args.path)) throw new Error('Path must be a non-reserved .md concept path.')
  if (!args.type.trim()) throw new Error('Concept type cannot be empty.')
  await assertMissing(provider, args.path)
  const title = args.title?.trim() || titleFromPath(args.path)
  const metadata = createConceptFrontmatter(title, args.type, {
    description: args.description ?? '',
    resource: args.resource ?? '',
    tags: args.tags ?? [],
    status: args.status ?? '',
    generated: { by: args.generatedBy || MCP_ACTOR, at: args.timestamp ?? new Date().toISOString() },
    extra: args.sources?.length ? { sources: args.sources } : {},
  })
  await provider.writeFile(args.path, combine(metadata, args.body))
  if (!provider.writesAreCommits) await provider.commit(`Create ${args.path}`, [args.path])
  await appendLog(provider, 'Creation', `Created [${title}](/${args.path}).`)
  await rebuildIndexes(provider)
  return { id: args.path.replace(/\.md$/i, ''), path: args.path, created: true, metadata }
}

export const updateConceptSchema = {
  path: z.string().describe('Concept path to update.'),
  body: z.string().optional().describe('Replacement Markdown body.'),
  metadata: z.object(metadataShape).optional().describe('Standard OKF fields to merge.'),
  extra: z.record(z.unknown()).optional().describe('Producer-defined YAML fields to merge, including sources.'),
  generatedBy: generatedBySchema,
  mergeTags: z.boolean().optional().describe('Merge metadata.tags rather than replacing them.'),
}

export async function updateConcept(
  provider: VaultProvider,
  {
    path,
    body,
    metadata,
    extra,
    generatedBy,
    mergeTags = false,
  }: {
    path: string
    body?: string
    metadata?: Partial<Omit<Frontmatter, 'extra' | 'generated' | 'verified'>>
    extra?: Record<string, unknown>
    generatedBy?: string
    mergeTags?: boolean
  }
) {
  if (!isConceptPath(path)) throw new Error('Only concept documents can be updated with this tool.')
  const raw = await provider.readFile(path)
  const parsed = parseFrontmatter(raw)
  if (!parsed.hasFrontmatter || parsed.error) throw new Error(`Cannot update invalid OKF frontmatter: ${parsed.error ?? 'missing frontmatter'}`)
  const next: Frontmatter = markGenerated(
    {
      ...parsed.frontmatter,
      ...metadata,
      tags: metadata?.tags
        ? mergeTags
          ? uniqueTags([...parsed.frontmatter.tags, ...metadata.tags])
          : uniqueTags(metadata.tags)
        : parsed.frontmatter.tags,
      extra: { ...parsed.frontmatter.extra, ...extra },
    },
    generatedBy || MCP_ACTOR,
    metadata?.timestamp || undefined
  )
  if (!next.type.trim()) throw new Error('Concept type cannot be empty.')
  await provider.writeFile(path, combine(next, body ?? parsed.body))
  if (!provider.writesAreCommits) await provider.commit(`Update ${path}`, [path])
  await appendLog(provider, 'Update', `Updated [${next.title || titleFromPath(path)}](/${path}).`)
  await rebuildIndexes(provider)
  return { path, updated: true, metadata: next }
}

export const renameConceptSchema = {
  from: z.string().describe('Current concept path.'),
  to: z.string().describe('New non-reserved .md concept path.'),
}

export async function renameConcept(
  provider: VaultProvider,
  { from, to }: { from: string; to: string }
) {
  if (!isConceptPath(from) || !isConceptPath(to)) throw new Error('Both paths must be concept paths.')
  await provider.renamePath(from, to)
  if (!provider.writesAreCommits) await provider.commit(`Move ${from} to ${to}`, [to])
  await appendLog(provider, 'Move', `Moved \`${from}\` to [${titleFromPath(to)}](/${to}).`)
  await rebuildIndexes(provider)
  return { from, to, renamed: true }
}

export const deleteConceptSchema = {
  path: z.string().describe('Concept path or concept directory to delete.'),
}

export async function deleteConcept(provider: VaultProvider, { path }: { path: string }) {
  if (isReservedPath(path)) throw new Error('Reserved OKF documents cannot be deleted.')
  await provider.deletePath(path)
  if (!provider.writesAreCommits) await provider.commit(`Delete ${path}`, [])
  await appendLog(provider, 'Deletion', `Deleted \`${path}\`.`)
  await rebuildIndexes(provider)
  return { path, deleted: true }
}

async function assertMissing(provider: VaultProvider, path: string) {
  try {
    await provider.readFile(path)
    throw new Error(`Concept already exists at ${path}.`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Concept already exists')) throw error
  }
}

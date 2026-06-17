import { z } from 'zod'
import { appendLog, rebuildIndexes, validateBundle } from '../lib/okf.js'
import type { VaultProvider } from '../providers/types.js'
import { createConcept } from './write.js'

export const validateBundleSchema = {
  recordLint: z.boolean().optional().describe('Append the lint result to log.md. Defaults to false.'),
}

export async function lintBundle(
  provider: VaultProvider,
  { recordLint = false }: { recordLint?: boolean }
) {
  const report = await validateBundle(provider)
  if (recordLint) {
    await appendLog(
      provider,
      'Lint',
      `${report.conformant ? 'Passed' : 'Found issues'}: ${report.concepts} concepts, ${report.issues.length} issues, ${report.brokenLinks} broken links.`
    )
  }
  return report
}

export const rebuildIndexesSchema = {}

export async function rebuildBundleIndexes(provider: VaultProvider) {
  return rebuildIndexes(provider)
}

export const ingestSourceSchema = {
  path: z.string().describe('Source concept path, normally under sources/, ending in .md.'),
  title: z.string().describe('Source title.'),
  sourceType: z.string().optional().describe('Concept type. Defaults to Source.'),
  description: z.string().describe('One-sentence source summary.'),
  resource: z.string().optional().describe('Canonical URI for the source.'),
  tags: z.array(z.string()).optional(),
  body: z.string().describe('Source notes, claims, quotations, and citations in Markdown.'),
}

export async function ingestSource(
  provider: VaultProvider,
  args: {
    path: string
    title: string
    sourceType?: string
    description: string
    resource?: string
    tags?: string[]
    body: string
  }
) {
  const result = await createConcept(provider, {
    path: args.path,
    type: args.sourceType ?? 'Source',
    title: args.title,
    description: args.description,
    resource: args.resource,
    tags: ['source', ...(args.tags ?? [])],
    body: args.body,
  })
  await appendLog(provider, 'Ingest', `Ingested [${args.title}](/${args.path}).`)
  return result
}

export const recordQuerySchema = {
  summary: z.string().describe('Concise description of the query or durable synthesis produced.'),
  conceptPaths: z.array(z.string()).optional().describe('Concept paths used or created.'),
}

export async function recordQuery(
  provider: VaultProvider,
  { summary, conceptPaths = [] }: { summary: string; conceptPaths?: string[] }
) {
  const links = conceptPaths.map((path) => `[${path.replace(/\.md$/i, '')}](/${path})`).join(', ')
  return appendLog(provider, 'Query', links ? `${summary} Concepts: ${links}.` : summary)
}

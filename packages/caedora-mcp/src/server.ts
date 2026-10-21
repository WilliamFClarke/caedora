import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { VaultProvider } from './providers/types.js'
import { rebuildIndexes } from './lib/okf.js'
import {
  grepConcepts,
  grepConceptsSchema,
  listConcepts,
  listConceptsSchema,
  readConcept,
  readConceptSchema,
} from './tools/read.js'
import {
  conceptGraph,
  conceptGraphSchema,
  conceptsByTag,
  conceptsByTagSchema,
  listTags,
  listTagsSchema,
  listTypes,
  listTypesSchema,
  searchConcepts,
  searchConceptsSchema,
} from './tools/search.js'
import {
  createConcept,
  createConceptSchema,
  deleteConcept,
  deleteConceptSchema,
  renameConcept,
  renameConceptSchema,
  updateConcept,
  updateConceptSchema,
} from './tools/write.js'
import {
  ingestSource,
  ingestSourceSchema,
  lintBundle,
  recordQuery,
  recordQuerySchema,
  validateBundleSchema,
} from './tools/operations.js'
import {
  logEntry,
  logEntrySchema,
  queryDataset,
  queryDatasetSchema,
  readDataset,
  readDatasetSchema,
  updateRow,
  updateRowSchema,
  upsertRows,
  upsertRowsSchema,
} from './tools/datasets.js'
import {
  AGENTS_URI_PREFIX,
  agentInstructionsFor,
  agentInstructionsSchema,
  isAgentsPath,
  listAgentInstructions,
} from './tools/agents.js'

export interface BuildServerOptions {
  provider: VaultProvider
  readOnly?: boolean
}

export function buildServer({ provider, readOnly = false }: BuildServerOptions): McpServer {
  const server = new McpServer({
    name: 'caedora-mcp',
    version: '0.2.0',
  })

  server.tool(
    'list_concepts',
    'List OKF concepts with structured metadata, optionally filtered by directory or type.',
    listConceptsSchema,
    async (args) => textResult(await listConcepts(provider, args))
  )
  server.tool(
    'read_concept',
    'Read one OKF concept and return its concept ID, metadata, body, and conformance state.',
    readConceptSchema,
    async (args) => textResult(await readConcept(provider, args))
  )
  server.tool(
    'search_concepts',
    'Ranked search across concept metadata and Markdown bodies, with type and tag filters.',
    searchConceptsSchema,
    async (args) => textResult(await searchConcepts(provider, args))
  )
  server.tool(
    'grep_concepts',
    'Run a regular expression across all concept documents.',
    grepConceptsSchema,
    async (args) => textResult(await grepConcepts(provider, args))
  )
  server.tool(
    'list_tags',
    'List bundle tags and concept counts.',
    listTagsSchema,
    async () => textResult(await listTags(provider))
  )
  server.tool(
    'list_types',
    'List concept types and usage counts.',
    listTypesSchema,
    async () => textResult(await listTypes(provider))
  )
  server.tool(
    'concepts_by_tag',
    'List concepts carrying a normalized tag.',
    conceptsByTagSchema,
    async (args) => textResult(await conceptsByTag(provider, args))
  )
  server.tool(
    'concept_graph',
    'Return outgoing links, external references, and backlinks for one concept or the full bundle.',
    conceptGraphSchema,
    async (args) => textResult(await conceptGraph(provider, args))
  )
  server.tool(
    'lint_bundle',
    'Validate OKF v0.2 conformance and report invalid metadata, reserved files, and broken links.',
    validateBundleSchema,
    async (args) =>
      textResult(
        await lintBundle(provider, {
          ...args,
          recordLint: readOnly ? false : args.recordLint,
        })
      )
  )

  server.tool(
    'read_dataset',
    'Read a Dataset concept and return its schema, key, generated stamp and typed rows.',
    readDatasetSchema,
    async (args) => textResult(await readDataset(provider, args))
  )
  server.tool(
    'query_dataset',
    'Filter, aggregate and group a Dataset with the same expressions Caedora dashboards use.',
    queryDatasetSchema,
    async (args) => textResult(await queryDataset(provider, args))
  )

  server.registerResource(
    'agent_instructions',
    new ResourceTemplate(`${AGENTS_URI_PREFIX}{+path}`, {
      list: async () => ({
        resources: (await listAgentInstructions(provider)).map((file) => ({
          uri: file.uri,
          name: file.path,
          title: file.title,
          description: file.description,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    {
      title: 'Agent instructions',
      description: 'The vault root and folder AGENTS.md files.',
      mimeType: 'text/markdown',
    },
    async (uri, { path }) => {
      const file = String(path)
      if (!isAgentsPath(file)) throw new Error(`${file} is not an AGENTS.md file.`)
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: await provider.readFile(file) }] }
    }
  )
  server.registerPrompt(
    'agent_instructions',
    {
      title: 'Agent instructions',
      description: 'The root AGENTS.md and every folder AGENTS.md that applies to a path, root first.',
      argsSchema: agentInstructionsSchema,
    },
    async ({ path }) => {
      const files = await agentInstructionsFor(provider, path)
      const text = files.length
        ? files.map((file) => `<!-- ${file.path} -->\n${file.text.trim()}`).join('\n\n')
        : 'This vault has no AGENTS.md files.'
      return {
        description: files.length ? `Instructions from ${files.map((file) => file.path).join(', ')}` : undefined,
        messages: [{ role: 'user', content: { type: 'text', text } }],
      }
    }
  )

  if (!readOnly) {
    server.tool(
      'upsert_rows',
      'Add rows to a Dataset, or update the cells given for rows whose key already exists. Values are checked against the schema and only those cells change.',
      upsertRowsSchema,
      async (args) => textResult(await upsertRows(provider, args))
    )
    server.tool(
      'update_row',
      'Set fields of the one Dataset row whose key matches. Only those cells change.',
      updateRowSchema,
      async (args) => textResult(await updateRow(provider, args))
    )
    server.tool(
      'log_entry',
      'Append a one line entry to log.md, under today\'s date, in the format Caedora writes.',
      logEntrySchema,
      async (args) => textResult(await logEntry(provider, args))
    )
    server.tool(
      'create_concept',
      'Create a conformant OKF concept and update bundle indexes and log.',
      createConceptSchema,
      async (args) => textResult(await createConcept(provider, args))
    )
    server.tool(
      'update_concept',
      'Update a concept body or metadata while preserving producer-defined YAML fields.',
      updateConceptSchema,
      async (args) => textResult(await updateConcept(provider, args))
    )
    server.tool(
      'rename_concept',
      'Move a concept to a new path-based concept ID, then rebuild indexes and log the move.',
      renameConceptSchema,
      async (args) => textResult(await renameConcept(provider, args))
    )
    server.tool(
      'delete_concept',
      'Delete a concept or concept directory while protecting reserved OKF documents.',
      deleteConceptSchema,
      async (args) => textResult(await deleteConcept(provider, args))
    )
    server.tool(
      'ingest_source',
      'Create a source concept with provenance metadata and record an ingest operation.',
      ingestSourceSchema,
      async (args) => textResult(await ingestSource(provider, args))
    )
    server.tool(
      'rebuild_indexes',
      'Regenerate hierarchical index.md files for progressive disclosure.',
      {},
      async () => textResult(await rebuildIndexes(provider))
    )
    server.tool(
      'record_query',
      'Append a durable query or synthesis operation to the bundle log.',
      recordQuerySchema,
      async (args) => textResult(await recordQuery(provider, args))
    )
  }

  return server
}

function textResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  }
}

export type { VaultProvider } from './providers/types.js'
export { LocalNodeProvider } from './providers/local-node.js'
export { GitHubNodeProvider } from './providers/github.js'
export { z }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { VaultProvider } from './providers/types.js'
import {
  grepNotes,
  grepNotesSchema,
  listNotes,
  listNotesSchema,
  readNote,
  readNoteSchema,
} from './tools/read.js'
import {
  listTags,
  listTagsSchema,
  notesByTag,
  notesByTagSchema,
  searchNotes,
  searchNotesSchema,
} from './tools/search.js'
import {
  createNote,
  createNoteSchema,
  deleteNote,
  deleteNoteSchema,
  renameNote,
  renameNoteSchema,
  updateNote,
  updateNoteSchema,
} from './tools/write.js'

export interface BuildServerOptions {
  provider: VaultProvider
  /** Disable all write tools (e.g. for a read-only deployment). */
  readOnly?: boolean
}

export function buildServer({ provider, readOnly = false }: BuildServerOptions): McpServer {
  const server = new McpServer({
    name: 'personal-md-mcp',
    version: '0.1.0',
  })

  // Read tools
  server.tool(
    'list_notes',
    'List every markdown note in the vault (optionally scoped to a folder).',
    listNotesSchema,
    async (args) => textResult(await listNotes(provider, args))
  )
  server.tool(
    'read_note',
    'Read a note and return its parsed frontmatter and body.',
    readNoteSchema,
    async (args) => textResult(await readNote(provider, args))
  )
  server.tool(
    'search_notes',
    'Full-text search across notes, with optional tag filter. Returns ranked hits with snippets.',
    searchNotesSchema,
    async (args) => textResult(await searchNotes(provider, args))
  )
  server.tool(
    'grep_notes',
    'Run a regex against every note body and return matching line numbers.',
    grepNotesSchema,
    async (args) => textResult(await grepNotes(provider, args))
  )
  server.tool(
    'list_tags',
    'Return every distinct tag used in the vault and how many notes use it.',
    listTagsSchema,
    async () => textResult(await listTags(provider))
  )
  server.tool(
    'notes_by_tag',
    'Return every note that carries the given tag (exact, post-normalisation).',
    notesByTagSchema,
    async (args) => textResult(await notesByTag(provider, args))
  )

  if (!readOnly) {
    server.tool(
      'create_note',
      'Create a new note. Auto-prepends an H1 from the filename if the body lacks one, normalises tags, and writes YAML frontmatter.',
      createNoteSchema,
      async (args) => textResult(await createNote(provider, args))
    )
    server.tool(
      'update_note',
      'Update a note body and/or tags. Unknown frontmatter keys are preserved.',
      updateNoteSchema,
      async (args) => textResult(await updateNote(provider, args))
    )
    server.tool(
      'rename_note',
      'Rename a note, optionally syncing its H1 to the new filename.',
      renameNoteSchema,
      async (args) => textResult(await renameNote(provider, args))
    )
    server.tool(
      'delete_note',
      'Delete a note or folder.',
      deleteNoteSchema,
      async (args) => textResult(await deleteNote(provider, args))
    )
  }

  return server
}

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  }
}

// Re-export for programmatic use.
export type { VaultProvider } from './providers/types.js'
export { LocalNodeProvider } from './providers/local-node.js'
export { GitHubNodeProvider } from './providers/github.js'
export { z }

import { z } from 'zod'
import { parseFrontmatter } from '../lib/frontmatter.js'
import { listFilesRecursive, type VaultProvider } from '../providers/types.js'

/**
 * AGENTS.md files hold a vault's instructions for agents: the root one for
 * the whole vault, and folder ones for the concepts beneath them. They are
 * exposed as resources, and as a prompt that gathers every file that applies
 * to a path, root first.
 */

export const AGENTS_FILENAME = 'AGENTS.md'
export const AGENTS_URI_PREFIX = 'caedora://agents/'

export function isAgentsPath(path: string): boolean {
  return (path.split('/').pop() ?? '').toLowerCase() === AGENTS_FILENAME.toLowerCase()
}

export async function listAgentInstructions(provider: VaultProvider) {
  const entries = await listFilesRecursive(provider)
  const paths = entries
    .filter((entry) => entry.type === 'file' && isAgentsPath(entry.path))
    .map((entry) => entry.path)
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  return Promise.all(
    paths.map(async (path) => {
      const { frontmatter } = parseFrontmatter(await provider.readFile(path).catch(() => ''))
      return {
        path,
        uri: `${AGENTS_URI_PREFIX}${path}`,
        title: frontmatter.title || (path.includes('/') ? `Agent instructions for ${folderOf(path)}` : 'Agent instructions'),
        description: frontmatter.description || undefined,
      }
    })
  )
}

export const agentInstructionsSchema = {
  path: z
    .string()
    .optional()
    .describe('A concept or folder path. The root AGENTS.md and each folder AGENTS.md above it are returned.'),
}

/** The AGENTS.md files that apply to `path`, root first. */
export async function agentInstructionsFor(provider: VaultProvider, path = '') {
  const all = await listAgentInstructions(provider)
  const target = path.replace(/^\/+|\/+$/g, '')
  const applies = all.filter((file) => {
    const folder = folderOf(file.path)
    return folder === '' || target === folder || target.startsWith(`${folder}/`)
  })
  return Promise.all(
    applies.map(async (file) => ({ path: file.path, text: await provider.readFile(file.path) }))
  )
}

function folderOf(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

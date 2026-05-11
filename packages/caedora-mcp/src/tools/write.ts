import { z } from 'zod'
import {
  combine,
  normalizeTag,
  parseFrontmatter,
  type Frontmatter,
} from '../lib/frontmatter.js'
import {
  ensureH1,
  extractH1,
  filenameFromH1,
  stemFromPath,
} from '../lib/conventions.js'
import type { VaultProvider } from '../providers/types.js'

export const createNoteSchema = {
  path: z.string().describe('Desired path for the new note, relative to vault root. Must end with .md.'),
  body: z.string().describe('Markdown body. If it lacks a top-level H1, one will be added from the filename.'),
  tags: z.array(z.string()).optional().describe('Tags to write into YAML frontmatter.'),
}

export async function createNote(
  provider: VaultProvider,
  { path, body, tags }: { path: string; body: string; tags?: string[] }
) {
  if (!path.endsWith('.md')) {
    throw new Error('create_note: path must end with .md')
  }
  // Fail fast if the file already exists.
  try {
    await provider.readFile(path)
    throw new Error(`create_note: file already exists at ${path}`)
  } catch (e) {
    if (e instanceof Error && /already exists/.test(e.message)) throw e
    // Otherwise the read failure means the file doesn't exist — good.
  }

  const stem = stemFromPath(path)
  const ensuredBody = ensureH1(body, stem)
  const fm: Frontmatter = {
    tags: [...new Set((tags ?? []).map(normalizeTag).filter(Boolean))],
    extra: [],
  }
  const content = combine(fm, ensuredBody)
  await provider.writeFile(path, content)
  if (!provider.writesAreCommits) {
    await provider.commit(`Create ${path}`, [path])
  }
  return { path, created: true }
}

export const updateNoteSchema = {
  path: z.string().describe('Path of the note to update.'),
  body: z.string().optional().describe('Replacement body. Omit to only touch tags.'),
  tags: z.array(z.string()).optional().describe('Replacement tag list. Omit to leave tags unchanged.'),
  mergeTags: z.boolean().optional().describe('When true, merge `tags` into the existing set instead of replacing.'),
}

export async function updateNote(
  provider: VaultProvider,
  {
    path,
    body,
    tags,
    mergeTags = false,
  }: { path: string; body?: string; tags?: string[]; mergeTags?: boolean }
) {
  const raw = await provider.readFile(path)
  const { frontmatter, body: oldBody } = parseFrontmatter(raw)

  const nextBody = body ?? oldBody
  let nextTags = frontmatter.tags
  if (tags !== undefined) {
    const normalised = tags.map(normalizeTag).filter(Boolean)
    nextTags = mergeTags
      ? [...new Set([...frontmatter.tags, ...normalised])]
      : normalised
  }
  const nextFm: Frontmatter = { tags: nextTags, extra: frontmatter.extra }
  const content = combine(nextFm, nextBody)
  await provider.writeFile(path, content)
  if (!provider.writesAreCommits) {
    await provider.commit(`Update ${path}`, [path])
  }
  return { path, updated: true }
}

export const renameNoteSchema = {
  from: z.string().describe('Current path.'),
  to: z.string().describe('New path. Must end with .md.'),
  syncH1: z
    .boolean()
    .optional()
    .describe(
      'When true, rewrite the note body so its H1 matches the new filename stem (default false — expects caller has already aligned them).'
    ),
}

export async function renameNote(
  provider: VaultProvider,
  { from, to, syncH1 = false }: { from: string; to: string; syncH1?: boolean }
) {
  if (!to.endsWith('.md')) {
    throw new Error('rename_note: `to` must end with .md')
  }
  if (syncH1) {
    const raw = await provider.readFile(from)
    const { frontmatter, body } = parseFrontmatter(raw)
    const desiredH1 = stemFromPath(to)
    const currentH1 = extractH1(body)
    if (currentH1 !== desiredH1) {
      const newBody = currentH1
        ? body.replace(/^\s*#\s+.+?$/m, `# ${desiredH1}`)
        : ensureH1(body, desiredH1)
      const next = combine(frontmatter, newBody)
      await provider.writeFile(from, next)
    }
  }
  await provider.renamePath(from, to)
  if (!provider.writesAreCommits) {
    await provider.commit(`Rename ${from} -> ${to}`, [to])
  }
  return { from, to, renamed: true, syncedH1: syncH1 }
}

export const deleteNoteSchema = {
  path: z.string().describe('Path of the note (or folder) to delete.'),
}

export async function deleteNote(
  provider: VaultProvider,
  { path }: { path: string }
) {
  await provider.deletePath(path)
  if (!provider.writesAreCommits) {
    await provider.commit(`Delete ${path}`, [])
  }
  return { path, deleted: true }
}

export { filenameFromH1 }

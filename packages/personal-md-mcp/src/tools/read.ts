import { z } from 'zod'
import { parseFrontmatter } from '../lib/frontmatter.js'
import { listFilesRecursive, type VaultProvider } from '../providers/types.js'

export const listNotesSchema = {
  folder: z.string().optional().describe('Folder path relative to vault root. Omit for the whole vault.'),
}

export async function listNotes(
  provider: VaultProvider,
  { folder }: { folder?: string }
) {
  const all = await listFilesRecursive(provider)
  const filtered = folder
    ? all.filter((e) => e.path === folder || e.path.startsWith(`${folder}/`))
    : all
  const notes = filtered.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
  return notes.map((e) => ({
    path: e.path,
    name: e.name,
    size: e.size,
    lastModified: e.lastModified,
  }))
}

export const readNoteSchema = {
  path: z.string().describe('Path to the note, relative to vault root (e.g. "Projects/Atlas.md").'),
}

export async function readNote(
  provider: VaultProvider,
  { path }: { path: string }
) {
  const raw = await provider.readFile(path)
  const { frontmatter, body } = parseFrontmatter(raw)
  return {
    path,
    frontmatter,
    body,
  }
}

export const grepNotesSchema = {
  regex: z.string().describe('Regular expression (JavaScript flavour) to search for.'),
  flags: z.string().optional().describe('Regex flags (e.g. "i" for case-insensitive). Defaults to "i".'),
  limit: z.number().int().positive().max(500).optional().describe('Max matches to return. Default 100.'),
}

export async function grepNotes(
  provider: VaultProvider,
  { regex, flags = 'i', limit = 100 }: { regex: string; flags?: string; limit?: number }
) {
  const re = new RegExp(regex, flags.includes('g') ? flags : flags + 'g')
  const all = await listFilesRecursive(provider)
  const notes = all.filter((e) => e.type === 'file' && e.name.endsWith('.md'))
  const hits: Array<{ path: string; line: number; text: string }> = []
  for (const note of notes) {
    if (hits.length >= limit) break
    const content = await provider.readFile(note.path).catch(() => '')
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= limit) break
      const line = lines[i]
      if (re.test(line)) {
        hits.push({ path: note.path, line: i + 1, text: line.trim() })
      }
      re.lastIndex = 0
    }
  }
  return hits
}

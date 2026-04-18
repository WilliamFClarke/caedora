/**
 * Shared helpers that enforce personal-md vault conventions. Any write path
 * that creates or modifies a note should go through these so files the MCP
 * server produces are indistinguishable from files the editor produces.
 */

export function stemFromPath(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

/** Strips characters that are illegal in file paths on common filesystems. */
export function sanitizeFilename(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, '').trim()
}

/** Extracts the first H1 text from a markdown body, or null if none. */
export function extractH1(markdown: string): string | null {
  const m = markdown.match(/^\s*#\s+(.+?)\s*$/m)
  return m ? m[1].trim() : null
}

/**
 * Ensures the body starts with an H1. If none exists, prepends one derived
 * from the filename stem so the file follows the "every note has an H1"
 * convention.
 */
export function ensureH1(body: string, stem: string): string {
  if (/^\s*#\s+/.test(body)) return body
  const separator = body.startsWith('\n') ? '' : '\n\n'
  return `# ${stem}${separator}${body}`
}

/**
 * Given a desired H1, produce the filename (without `.md`) that matches it.
 * Mirrors the editor's H1 → filename sync logic.
 */
export function filenameFromH1(h1: string): string {
  return sanitizeFilename(h1) || 'Untitled'
}

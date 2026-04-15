import { structuredPatch } from 'diff'
import type { DiffResult } from './types'

export function buildDiffResult(
  oldContent: string,
  newContent: string,
  path: string
): DiffResult {
  const patch = structuredPatch(path, path, oldContent, newContent, '', '', { context: 3 })
  return {
    hunks: patch.hunks.map((h) => ({
      header: `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
      lines: h.lines.map((l) => ({
        type: l[0] === '+' ? 'add' : l[0] === '-' ? 'remove' : 'context',
        content: l.slice(1),
      })) as Array<{ type: 'context' | 'add' | 'remove'; content: string }>,
    })),
    oldContent,
    newContent,
  }
}

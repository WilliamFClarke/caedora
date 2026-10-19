import { rebuildIndexes, validateBundle, type OkfBundleReport, type OkfIssue } from './lib/okf.js'
import type { VaultProvider } from './providers/types.js'

/**
 * Headless commands for scripts and CI, such as a workflow that checks a
 * vault after it writes to it. Each returns the text to print and the exit
 * code, so the CLI stays a thin wrapper.
 */

export interface CommandResult {
  output: string
  exitCode: number
}

/** Issues that fail `lint`: frontmatter errors, broken links and Dataset problems. */
export function isFailingIssue(issue: OkfIssue): boolean {
  return issue.severity === 'error' || issue.code === 'broken-link' || issue.code === 'invalid-dataset'
}

export async function lintCommand(provider: VaultProvider, { json = false } = {}): Promise<CommandResult> {
  const report = await validateBundle(provider)
  const failing = report.issues.filter(isFailingIssue)
  const exitCode = failing.length > 0 ? 1 : 0
  if (json) return { output: JSON.stringify({ ...report, failing: failing.length }, null, 2), exitCode }
  return { output: formatReport(report, failing.length), exitCode }
}

export async function rebuildIndexesCommand(provider: VaultProvider): Promise<CommandResult> {
  const { updated } = await rebuildIndexes(provider)
  const output = updated.length
    ? [`Updated ${updated.length} ${updated.length === 1 ? 'index' : 'indexes'}:`, ...updated.map((path) => `  ${path}`)].join('\n')
    : 'Every index is up to date.'
  return { output, exitCode: 0 }
}

function formatReport(report: OkfBundleReport, failing: number): string {
  const lines = [...report.issues]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((issue) => `${issue.path}: ${isFailingIssue(issue) ? 'error' : 'warning'} ${issue.code}: ${issue.message}`)
  const warnings = report.issues.length - failing
  lines.push(
    `${report.concepts} concepts, ${report.links} links checked. ` +
      `${failing} ${failing === 1 ? 'problem' : 'problems'}, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}.`
  )
  return lines.join('\n')
}

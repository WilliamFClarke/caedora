import { parseFrontmatter } from './frontmatter'
import {
  conceptId,
  extractLinks,
  isConceptPath,
  validateDocument as validateOkfDocument,
  type OkfIssue as CoreOkfIssue,
  type OkfLink,
} from '@/packages/caedora-mcp/src/lib/okf'
import { titleFromPath } from '@/packages/caedora-mcp/src/lib/conventions'
import type { FileEntry, VaultProvider } from './types'
import { describeDatasetIssue, isDatasetFrontmatter, validateDatasetDocument } from './dataset'
import { markdownToSearchText } from './search'

export * from '@/packages/caedora-mcp/src/lib/okf'
export { titleFromPath as deriveTitleFromPath }

export interface OkfIssue extends Omit<CoreOkfIssue, 'code'> {
  code: CoreOkfIssue['code'] | 'invalid-dataset'
}

const MAX_DATASET_ISSUES = 5

/** The shared OKF checks, plus schema warnings for Dataset concepts. */
export function validateDocument(path: string, raw: string): OkfIssue[] {
  const issues: OkfIssue[] = validateOkfDocument(path, raw)
  if (issues.some((issue) => issue.severity === 'error') || !isConceptPath(path)) return issues
  const parsed = parseFrontmatter(raw)
  if (!isDatasetFrontmatter(parsed.frontmatter)) return issues
  return [...issues, ...datasetIssues(path, raw)]
}

function datasetIssues(path: string, raw: string): OkfIssue[] {
  const found = validateDatasetDocument(path, raw)
  const shown = found.slice(0, MAX_DATASET_ISSUES).map((issue): OkfIssue => ({
    path,
    severity: 'warning',
    code: 'invalid-dataset',
    message: describeDatasetIssue(issue),
  }))
  if (found.length > MAX_DATASET_ISSUES) {
    shown.push({
      path,
      severity: 'warning',
      code: 'invalid-dataset',
      message: `${found.length - MAX_DATASET_ISSUES} more dataset warnings.`,
    })
  }
  return shown
}

export interface OkfConceptSummary {
  id: string
  path: string
  title: string
  description: string
  type: string
  tags: string[]
  timestamp: string
  links: OkfLink[]
  conformant: boolean
  /** Concept body flattened to plain text, used for full text search. */
  body: string
}

export async function loadConceptCatalog(
  provider: VaultProvider,
  entries: FileEntry[]
): Promise<Record<string, OkfConceptSummary>> {
  const conceptEntries = entries.filter(
    (entry) => entry.type === 'file' && isConceptPath(entry.path)
  )
  const pairs = await Promise.all(
    conceptEntries.map(async (entry): Promise<[string, OkfConceptSummary]> => {
      const raw = await provider.readFile(entry.path).catch(() => '')
      const parsed = parseFrontmatter(raw)
      const metadata = parsed.frontmatter
      return [
        entry.path,
        {
          id: conceptId(entry.path),
          path: entry.path,
          title: metadata.title || titleFromPath(entry.path),
          description: metadata.description,
          type: metadata.type || 'Unknown',
          tags: metadata.tags,
          timestamp: metadata.timestamp,
          links: parsed.error ? [] : extractLinks(parsed.body, entry.path),
          conformant:
            parsed.hasFrontmatter &&
            !parsed.error &&
            metadata.type.trim().length > 0,
          body: markdownToSearchText(parsed.body),
        },
      ]
    })
  )
  return Object.fromEntries(pairs)
}

export function backlinksFor(
  path: string,
  catalog: Record<string, OkfConceptSummary>
): OkfConceptSummary[] {
  return Object.values(catalog)
    .filter((concept) =>
      concept.links.some((link) => link.targetPath === path)
    )
    .sort((a, b) => a.title.localeCompare(b.title))
}

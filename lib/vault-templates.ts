import type { VaultProvider } from './types'
import {
  combine,
  createConceptFrontmatter,
  parseFrontmatter,
  uniqueTags,
} from './frontmatter'
import { isReservedPath } from './okf'
import { rebuildBundleIndexes } from './vault-index'
import { appendBundleLog } from './bundle-log'
import { listFilesRecursive } from './storage'
import { extractFirstTable, DATASET_TYPE } from './dataset'
import { generateDefaultDashboard } from './dashboard/generate'
import { UK_PERSONAL_FINANCE_FILES } from './templates/uk-personal-finance'
import { FITNESS_PLANNER_FILES } from './templates/fitness-planner'
import { READING_SYSTEM_FILES } from './templates/reading-system'
import { DAILY_JOURNAL_FILES } from './templates/daily-journal'
import { PROJECT_HUB_FILES } from './templates/project-hub'
import { JOB_SEARCH_FILES } from './templates/job-search'
import { PERSONAL_CRM_FILES } from './templates/personal-crm'
import { HOME_OPERATIONS_FILES } from './templates/home-operations'
import { TRAVEL_PLANNER_FILES } from './templates/travel-planner'
import { INVESTMENT_TRACKER_FILES } from './templates/investment-tracker'
import { UK_STUDENT_LOAN_FILES } from './templates/uk-student-loan'
import { SIDE_BUSINESS_FILES } from './templates/side-business'

export interface TemplateFile {
  path: string
  content: string
}

export interface VaultTemplate {
  id: string
  name: string
  description: string
  category: string
  repository: string
  ref?: string
  root?: string
  skills: string[]
  conventions: string[]
  tags: string[]
  files?: TemplateFile[]
}

export interface TemplateImportResult {
  imported: string[]
  skipped: string[]
}

export const CURATED_TEMPLATES: VaultTemplate[] = [
  {
    id: 'fitness-planner',
    name: 'Fitness planner',
    description: 'Workouts, measurements, nutrition notes, and coaching prompts.',
    category: 'Fitness',
    repository: 'WilliamFClarke/caedora-template-fitness',
    skills: ['AGENTS.md coaching guidance'],
    conventions: ['workout logs', 'measurement frontmatter', 'nutrition tags'],
    tags: ['fitness', 'health', 'planning'],
    files: FITNESS_PLANNER_FILES,
  },
  {
    id: 'reading-system',
    name: 'Reading system',
    description: 'Books, article notes, source queues, and review workflows.',
    category: 'Learning',
    repository: 'WilliamFClarke/caedora-template-reading',
    skills: ['AGENTS.md synthesis guidance'],
    conventions: ['source status', 'author frontmatter', 'review tags'],
    tags: ['reading', 'research', 'learning'],
    files: READING_SYSTEM_FILES,
  },
  {
    id: 'daily-journal',
    name: 'Daily journal',
    description: 'Daily notes, weekly reviews, decisions, and lightweight habit tracking.',
    category: 'Personal OS',
    repository: 'WilliamFClarke/caedora-template-journal',
    skills: ['AGENTS.md reflection guidance'],
    conventions: ['daily note dates', 'weekly reviews', 'decision logs'],
    tags: ['journal', 'review', 'habits'],
    files: DAILY_JOURNAL_FILES,
  },
  {
    id: 'project-hub',
    name: 'Project hub',
    description: 'Active projects, specs, milestones, meeting notes, and retrospectives.',
    category: 'Work',
    repository: 'WilliamFClarke/caedora-template-projects',
    skills: ['AGENTS.md project planning guidance'],
    conventions: ['project status', 'spec templates', 'retrospective notes'],
    tags: ['projects', 'planning', 'work'],
    files: PROJECT_HUB_FILES,
  },
  {
    id: 'job-search',
    name: 'Career and job search',
    description: 'Salary history, applications, interviews and company research, with a career dashboard.',
    category: 'Career',
    repository: 'WilliamFClarke/caedora-template-job-search',
    skills: ['AGENTS.md interview prep guidance'],
    conventions: ['salary history', 'application funnel', 'interview notes'],
    tags: ['career', 'jobs', 'salary'],
    files: JOB_SEARCH_FILES,
  },
  {
    id: 'personal-crm',
    name: 'Personal CRM',
    description: 'People notes, follow-ups, conversations, and relationship context.',
    category: 'Relationships',
    repository: 'WilliamFClarke/caedora-template-crm',
    skills: ['AGENTS.md relationship context guidance'],
    conventions: ['person notes', 'follow-up dates', 'conversation logs'],
    tags: ['crm', 'people', 'relationships'],
    files: PERSONAL_CRM_FILES,
  },
  {
    id: 'home-operations',
    name: 'Home operations',
    description: 'Maintenance, documents, inventory, recurring chores, and vendor notes.',
    category: 'Home',
    repository: 'WilliamFClarke/caedora-template-home',
    skills: ['AGENTS.md household operations guidance'],
    conventions: ['maintenance logs', 'inventory tables', 'vendor notes'],
    tags: ['home', 'maintenance', 'operations'],
    files: HOME_OPERATIONS_FILES,
  },
  {
    id: 'travel-planner',
    name: 'Travel planner',
    description: 'Trips, itineraries, packing lists, reservations, and post-trip notes.',
    category: 'Travel',
    repository: 'WilliamFClarke/caedora-template-travel',
    skills: ['AGENTS.md travel planning guidance'],
    conventions: ['trip folders', 'reservation tables', 'packing lists'],
    tags: ['travel', 'planning', 'itinerary'],
    files: TRAVEL_PLANNER_FILES,
  },
  {
    id: 'side-business',
    name: 'Freelance and side business',
    description: 'Clients, invoices, hours and expenses for freelance work, with a business dashboard.',
    category: 'Work',
    repository: 'WilliamFClarke/caedora',
    skills: ['AGENTS.md business guidance'],
    conventions: ['invoice log', 'tax year revenue', 'expense categories'],
    tags: ['business', 'freelance', 'invoices'],
    files: SIDE_BUSINESS_FILES,
  },
  {
    id: 'uk-personal-finance',
    name: 'UK personal finance',
    description: 'Bank accounts, ISAs, mortgage, pensions and net worth with a finance dashboard.',
    category: 'Finance',
    repository: 'WilliamFClarke/caedora',
    skills: ['AGENTS.md finance Dataset guidance'],
    conventions: ['balance snapshots', 'ISA allowance by tax year', 'finance dashboard'],
    tags: ['finance', 'uk', 'net-worth', 'isa', 'mortgage'],
    files: UK_PERSONAL_FINANCE_FILES,
  },
  {
    id: 'investment-tracker',
    name: 'Investment tracker',
    description: 'Portfolio notes, investment thesis tracking, contributions, allocation reviews, and watchlists.',
    category: 'Finance',
    repository: 'WilliamFClarke/caedora-template-investments',
    skills: ['AGENTS.md investment tracking guidance'],
    conventions: ['portfolio snapshots', 'thesis notes', 'allocation reviews'],
    tags: ['finance', 'investments', 'portfolio'],
    files: INVESTMENT_TRACKER_FILES,
  },
  {
    id: 'uk-student-loan-tracker',
    name: 'UK student loan tracker',
    description: 'UK student loan plan notes, statements, repayments, interest changes, and annual reviews.',
    category: 'Finance',
    repository: 'WilliamFClarke/caedora-template-uk-student-loan',
    skills: ['AGENTS.md UK student loan tracking guidance'],
    conventions: ['statement logs', 'plan details', 'repayment reviews'],
    tags: ['finance', 'student-loan', 'uk'],
    files: UK_STUDENT_LOAN_FILES,
  },
]

export function parseTemplateRepository(input: string): string | null {
  const value = input.trim()
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) return value
  try {
    const url = new URL(value)
    if (url.hostname !== 'github.com') return null
    const [owner, repo] = url.pathname.replace(/^\/+/, '').split('/')
    return owner && repo ? `${owner}/${repo.replace(/\.git$/, '')}` : null
  } catch {
    return null
  }
}

export async function loadGitHubTemplate(repository: string): Promise<VaultTemplate> {
  const [owner, repo] = repository.split('/')
  if (!owner || !repo) throw new Error('Use owner/repo or a GitHub repository URL.')

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  })
  if (!res.ok) throw new Error(`Could not read ${repository} (${res.status}).`)
  const repoData = (await res.json()) as { default_branch?: string }
  const ref = repoData.default_branch ?? 'main'
  const manifest = await readManifest(repository, ref)

  return {
    id: repository,
    name: manifest?.name ?? repo.replace(/[-_]/g, ' '),
    description: manifest?.description ?? `Public template from ${repository}.`,
    category: manifest?.category ?? 'Community',
    repository,
    ref,
    root: cleanPath(manifest?.root ?? ''),
    skills: stringList(manifest?.skills),
    conventions: stringList(manifest?.conventions),
    tags: stringList(manifest?.tags),
  }
}

export async function fetchTemplateFiles(template: VaultTemplate): Promise<TemplateFile[]> {
  if (template.files) {
    return withDefaultDashboard(normalizeCuratedTemplateFiles(template), template.name, (file) =>
      normalizeTemplateConcept(file, { templateId: template.id, templateTags: template.tags })
    )
  }

  const [owner, repo] = template.repository.split('/')
  const ref = template.ref ?? 'main'
  const root = cleanPath(template.root ?? '')
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: githubHeaders() }
  )
  if (!treeRes.ok) throw new Error(`Could not list template files (${treeRes.status}).`)

  const data = (await treeRes.json()) as { tree: Array<{ path: string; type: string }> }
  const files = data.tree
    .filter((item) => item.type === 'blob' && isImportable(item.path, root))
    .map((item) => item.path)

  const out: TemplateFile[] = []
  for (const path of files) {
    const rawPath = path.split('/').map(encodeURIComponent).join('/')
    const raw = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${rawPath}`
    )
    if (raw.ok) out.push({ path: root ? path.slice(root.length + 1) : path, content: await raw.text() })
  }
  return withDefaultDashboard(
    out.map((file) => ({ ...file, content: normalizeTemplateConcept(file) })),
    template.name
  )
}

/** Every template ships with a dashboard; generate a table dashboard when it has none. */
function withDefaultDashboard(
  files: TemplateFile[],
  name: string,
  normalize: (file: TemplateFile) => string = (file) => normalizeTemplateConcept(file)
): TemplateFile[] {
  const dashboard = generateDefaultDashboard(files, name)
  return dashboard ? [...files, { ...dashboard, content: normalize(dashboard) }] : files
}

export async function importTemplateFiles(
  provider: VaultProvider,
  files: TemplateFile[],
  existingPaths: Iterable<string>
): Promise<TemplateImportResult> {
  const existing = new Set(existingPaths)
  const imported: string[] = []
  const skipped: string[] = []

  for (const file of files) {
    if (existing.has(file.path)) {
      skipped.push(file.path)
      continue
    }
    if (isReservedPath(file.path)) {
      skipped.push(file.path)
      continue
    }
    await provider.writeFile(file.path, normalizeTemplateConcept(file))
    imported.push(file.path)
    existing.add(file.path)
  }

  if (imported.length > 0 && !provider.writesAreCommits) {
    await provider.commit('Import vault template', imported)
  }
  if (imported.length > 0) {
    await appendBundleLog(
      provider,
      'Ingest',
      `Imported ${imported.length} concept${imported.length === 1 ? '' : 's'} from a vault template.`
    )
    await rebuildBundleIndexes(provider, await listFilesRecursive(provider))
  }
  return { imported, skipped }
}

async function readManifest(repository: string, ref: string) {
  const [owner, repo] = repository.split('/')
  for (const path of ['caedora-template.json', 'template.json']) {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path}`,
      { cache: 'no-store' }
    )
    if (res.status === 404) continue
    if (!res.ok) return null
    try {
      return (await res.json()) as {
        name?: string
        description?: string
        category?: string
        skills?: string[]
        conventions?: string[]
        tags?: string[]
        root?: string
      }
    } catch {
      return null
    }
  }
  return null
}

function normalizeCuratedTemplateFiles(template: VaultTemplate): TemplateFile[] {
  const conceptPaths = (template.files ?? [])
    .map((file) => file.path)
    .filter((path) => path.endsWith('.md'))

  return (template.files ?? []).map((file) => ({
    ...file,
    content: normalizeTemplateConcept(file, {
      templateId: template.id,
      templateTags: template.tags,
      relatedPaths: conceptPaths.filter((path) => path !== file.path),
    }),
  }))
}

function normalizeTemplateConcept(
  file: TemplateFile,
  context: {
    templateId?: string
    templateTags?: string[]
    relatedPaths?: string[]
  } = {}
): string {
  const parsed = parseFrontmatter(file.content)
  const rawBody = parsed.error ? file.content : parsed.body
  const title =
    parsed.frontmatter.title ||
    rawBody.match(/^\s*#\s+(.+)$/m)?.[1]?.trim() ||
    displayTitle(file.path)
  const type =
    parsed.frontmatter.type ||
    (file.path.endsWith('AGENTS.md')
      ? 'Agent Instructions'
      : /(^|\/)templates?\//i.test(file.path)
        ? 'Template'
        : /(^|\/)readme\.md$/i.test(file.path)
          ? 'Overview'
          : extractFirstTable(rawBody)
            ? DATASET_TYPE
            : 'Reference')
  const description =
    parsed.frontmatter.description ||
    (context.templateId ? defaultTemplateDescription(file.path, title, type) : firstParagraph(rawBody)) ||
    `${type} concept imported from a Caedora vault template.`
  const resource =
    parsed.frontmatter.resource ||
    (context.templateId
      ? `https://caedora.app/templates/${context.templateId}#${conceptAnchor(file.path)}`
      : '')
  const tags = uniqueTags([
    ...(context.templateTags ?? []),
    ...parsed.frontmatter.tags,
    ...pathTags(file.path),
    type,
  ])
  const body = appendRelatedLinks(rawBody, file.path, context.relatedPaths ?? [])

  return combine(
    createConceptFrontmatter(title, type, {
      ...parsed.frontmatter,
      type,
      title,
      description,
      resource,
      tags,
      timestamp: new Date().toISOString(),
    }),
    body
  )
}

function displayTitle(path: string): string {
  return (path.split('/').pop() ?? path)
    .replace(/\.md$/i, '')
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function defaultTemplateDescription(path: string, title: string, type: string): string {
  const scope = path
    .split('/')
    .filter((part) => part && !/^(readme|agents)\.md$/i.test(part))
    .slice(0, -1)
    .join(' / ')
  if (/\/?readme\.md$/i.test(path)) {
    return `Overview for the ${scope || title} template concepts and how they connect.`
  }
  if (/\/?agents\.md$/i.test(path)) {
    return `Agent guidance for working with the ${scope || title} template concepts.`
  }
  return `${title} ${type.toLowerCase()} for the ${scope || 'template'} vault.`
}

function conceptAnchor(path: string): string {
  return path
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pathTags(path: string): string[] {
  return path
    .replace(/\.md$/i, '')
    .split(/[\/_-]+/)
    .filter((part) => part && !/^(readme|agents|template|templates)$/i.test(part))
}

function appendRelatedLinks(body: string, sourcePath: string, relatedPaths: string[]): string {
  if (relatedPaths.length === 0 || /^##\s+Related concepts\b/im.test(body)) return body
  const links = relatedPaths
    .slice(0, 6)
    .map((path) => `- [${displayTitle(path)}](/${path})`)
    .join('\n')
  return `${body.replace(/\s+$/, '')}\n\n## Related concepts\n\n${links}\n`
}

function firstParagraph(body: string): string {
  return body
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.replace(/^#+\s+.*$/gm, '').trim())
    .find(Boolean)
    ?.replace(/\s+/g, ' ')
    .slice(0, 240) ?? ''
}

function githubHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function isImportable(path: string, root: string): boolean {
  if (root && path !== root && !path.startsWith(`${root}/`)) return false
  const rel = root ? path.slice(root.length + 1) : path
  if (!rel || rel.startsWith('.github/')) return false
  if (rel === 'caedora-template.json' || rel === 'template.json') return false
  return rel.endsWith('.md') || rel === 'SKILL.md' || rel === 'AGENTS.md'
}

function cleanPath(path: string): string {
  return path.trim().replace(/^\/+|\/+$/g, '')
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

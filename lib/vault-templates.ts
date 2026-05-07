import type { VaultProvider } from './types'

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
    repository: 'WilliamFClarke/personal-md-template-fitness',
    skills: ['AGENTS.md coaching guidance'],
    conventions: ['workout logs', 'measurement frontmatter', 'nutrition tags'],
    tags: ['fitness', 'health', 'planning'],
    files: [
      file('fitness/README.md', '# Fitness planner\n\nUse this folder for training plans, nutrition notes, measurements, and weekly reviews.\n'),
      file('fitness/workouts/workout-log.md', '---\ntags: [fitness, workout]\nstatus: active\n---\n\n# Workout log\n\n- Warmup:\n- Main work:\n- Accessories:\n- Notes:\n'),
      file('fitness/measurements.md', '---\ntags: [fitness, measurements]\n---\n\n# Measurements\n\n| Date | Weight | Waist | Notes |\n| --- | --- | --- | --- |\n'),
      file('fitness/AGENTS.md', '# Fitness coaching guidance\n\nUse workout logs, nutrition notes, and measurements as context. Prefer practical plans and ask before changing goals.\n'),
    ],
  },
  {
    id: 'reading-system',
    name: 'Reading system',
    description: 'Books, article notes, source queues, and review workflows.',
    category: 'Learning',
    repository: 'WilliamFClarke/personal-md-template-reading',
    skills: ['AGENTS.md synthesis guidance'],
    conventions: ['source status', 'author frontmatter', 'review tags'],
    tags: ['reading', 'research', 'learning'],
    files: [
      file('reading/README.md', '# Reading system\n\nTrack books, articles, source notes, and review queues here.\n'),
      file('reading/books.md', '---\ntags: [reading, books]\n---\n\n# Books\n\n| Title | Author | Status | Notes |\n| --- | --- | --- | --- |\n'),
      file('reading/source-notes/template.md', '---\ntags: [reading, source]\nstatus: queued\n---\n\n# Source title\n\n## Key ideas\n\n## Useful quotes\n\n## Follow-up\n'),
      file('reading/AGENTS.md', '# Reading synthesis guidance\n\nSummarize sources into durable notes, preserve citations, and separate direct quotes from interpretation.\n'),
    ],
  },
  {
    id: 'job-search',
    name: 'Job search tracker',
    description: 'Applications, company research, interviews, and follow-up notes.',
    category: 'Career',
    repository: 'WilliamFClarke/personal-md-template-job-search',
    skills: ['AGENTS.md interview prep guidance'],
    conventions: ['application status', 'company tags', 'contact logs'],
    tags: ['career', 'jobs', 'crm'],
    files: [
      file('career/job-search/README.md', '# Job search tracker\n\nTrack opportunities, company research, interviews, and follow-ups here.\n'),
      file('career/job-search/applications.md', '---\ntags: [career, applications]\n---\n\n# Applications\n\n| Company | Role | Status | Next step |\n| --- | --- | --- | --- |\n'),
      file('career/job-search/company-research/template.md', '---\ntags: [career, company]\nstatus: researching\n---\n\n# Company\n\n## Role fit\n\n## People\n\n## Questions\n'),
      file('career/job-search/AGENTS.md', '# Job search guidance\n\nUse application status, company notes, and interview history to prepare concise next actions and tailored interview prep.\n'),
    ],
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
  if (template.files) return template.files

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
  return out
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
    await provider.writeFile(file.path, file.content)
    imported.push(file.path)
    existing.add(file.path)
  }

  if (imported.length > 0 && !provider.writesAreCommits) {
    await provider.commit('Import vault template', imported)
  }
  return { imported, skipped }
}

async function readManifest(repository: string, ref: string) {
  const [owner, repo] = repository.split('/')
  for (const path of ['personal-md-template.json', 'template.json']) {
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

function file(path: string, content: string): TemplateFile {
  return { path, content }
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
  if (rel === 'personal-md-template.json' || rel === 'template.json') return false
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

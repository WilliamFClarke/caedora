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
    id: 'daily-journal',
    name: 'Daily journal',
    description: 'Daily notes, weekly reviews, decisions, and lightweight habit tracking.',
    category: 'Personal OS',
    repository: 'WilliamFClarke/personal-md-template-journal',
    skills: ['AGENTS.md reflection guidance'],
    conventions: ['daily note dates', 'weekly reviews', 'decision logs'],
    tags: ['journal', 'review', 'habits'],
    files: [
      file('journal/README.md', '# Daily journal\n\nUse this folder for daily notes, weekly reviews, decisions, and small habit loops.\n'),
      file('journal/daily/template.md', '---\ntags: [journal, daily]\ndate:\n---\n\n# Daily note\n\n## Plan\n\n- \n\n## Notes\n\n## Done\n\n## Follow-up\n'),
      file('journal/weekly-review.md', '---\ntags: [journal, review]\n---\n\n# Weekly review\n\n## Wins\n\n## Open loops\n\n## Decisions\n\n## Next week\n'),
      file('journal/decisions.md', '---\ntags: [journal, decisions]\n---\n\n# Decisions\n\n| Date | Decision | Why | Revisit |\n| --- | --- | --- | --- |\n'),
      file('journal/AGENTS.md', '# Journal guidance\n\nHelp identify patterns across daily notes, preserve uncertainty, and turn repeated open loops into clear next actions.\n'),
    ],
  },
  {
    id: 'project-hub',
    name: 'Project hub',
    description: 'Active projects, specs, milestones, meeting notes, and retrospectives.',
    category: 'Work',
    repository: 'WilliamFClarke/personal-md-template-projects',
    skills: ['AGENTS.md project planning guidance'],
    conventions: ['project status', 'spec templates', 'retrospective notes'],
    tags: ['projects', 'planning', 'work'],
    files: [
      file('projects/README.md', '# Project hub\n\nTrack active projects, specs, decisions, milestones, and retrospectives here.\n'),
      file('projects/index.md', '---\ntags: [projects]\n---\n\n# Projects\n\n| Project | Status | Next milestone | Notes |\n| --- | --- | --- | --- |\n'),
      file('projects/templates/project-brief.md', '---\ntags: [projects, brief]\nstatus: proposed\n---\n\n# Project brief\n\n## Outcome\n\n## Scope\n\n## Milestones\n\n## Risks\n'),
      file('projects/templates/retro.md', '---\ntags: [projects, retro]\n---\n\n# Retrospective\n\n## What changed\n\n## What worked\n\n## What to improve\n\n## Follow-ups\n'),
      file('projects/AGENTS.md', '# Project planning guidance\n\nUse briefs, milestones, and retrospectives to keep recommendations grounded in current project state and documented decisions.\n'),
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
  {
    id: 'personal-crm',
    name: 'Personal CRM',
    description: 'People notes, follow-ups, conversations, and relationship context.',
    category: 'Relationships',
    repository: 'WilliamFClarke/personal-md-template-crm',
    skills: ['AGENTS.md relationship context guidance'],
    conventions: ['person notes', 'follow-up dates', 'conversation logs'],
    tags: ['crm', 'people', 'relationships'],
    files: [
      file('people/README.md', '# Personal CRM\n\nKeep people notes, conversations, follow-ups, and useful context here.\n'),
      file('people/index.md', '---\ntags: [people]\n---\n\n# People\n\n| Name | Context | Last contact | Follow-up |\n| --- | --- | --- | --- |\n'),
      file('people/templates/person.md', '---\ntags: [people]\nstatus: active\n---\n\n# Person name\n\n## Context\n\n## Conversations\n\n## Follow-ups\n\n## Notes\n'),
      file('people/follow-ups.md', '---\ntags: [people, follow-up]\n---\n\n# Follow-ups\n\n| Person | Topic | Due | Done |\n| --- | --- | --- | --- |\n'),
      file('people/AGENTS.md', '# Relationship context guidance\n\nUse people notes respectfully, avoid inventing personal details, and surface follow-ups only from documented context.\n'),
    ],
  },
  {
    id: 'home-operations',
    name: 'Home operations',
    description: 'Maintenance, documents, inventory, recurring chores, and vendor notes.',
    category: 'Home',
    repository: 'WilliamFClarke/personal-md-template-home',
    skills: ['AGENTS.md household operations guidance'],
    conventions: ['maintenance logs', 'inventory tables', 'vendor notes'],
    tags: ['home', 'maintenance', 'operations'],
    files: [
      file('home/README.md', '# Home operations\n\nTrack maintenance, household documents, inventory, chores, and vendors here.\n'),
      file('home/maintenance.md', '---\ntags: [home, maintenance]\n---\n\n# Maintenance\n\n| Date | Area | Work done | Next check |\n| --- | --- | --- | --- |\n'),
      file('home/inventory.md', '---\ntags: [home, inventory]\n---\n\n# Inventory\n\n| Item | Location | Warranty | Notes |\n| --- | --- | --- | --- |\n'),
      file('home/vendors.md', '---\ntags: [home, vendors]\n---\n\n# Vendors\n\n| Vendor | Service | Contact | Notes |\n| --- | --- | --- | --- |\n'),
      file('home/AGENTS.md', '# Household operations guidance\n\nHelp summarize maintenance history, prepare checklists, and keep household recommendations grounded in recorded facts.\n'),
    ],
  },
  {
    id: 'travel-planner',
    name: 'Travel planner',
    description: 'Trips, itineraries, packing lists, reservations, and post-trip notes.',
    category: 'Travel',
    repository: 'WilliamFClarke/personal-md-template-travel',
    skills: ['AGENTS.md travel planning guidance'],
    conventions: ['trip folders', 'reservation tables', 'packing lists'],
    tags: ['travel', 'planning', 'itinerary'],
    files: [
      file('travel/README.md', '# Travel planner\n\nPlan trips, itineraries, reservations, packing, and post-trip notes here.\n'),
      file('travel/trips.md', '---\ntags: [travel, trips]\n---\n\n# Trips\n\n| Trip | Dates | Status | Notes |\n| --- | --- | --- | --- |\n'),
      file('travel/templates/trip-plan.md', '---\ntags: [travel, trip]\nstatus: planning\n---\n\n# Trip name\n\n## Itinerary\n\n## Reservations\n\n## Packing\n\n## Notes\n'),
      file('travel/packing-list.md', '---\ntags: [travel, packing]\n---\n\n# Packing list\n\n- Documents\n- Clothes\n- Electronics\n- Health\n'),
      file('travel/AGENTS.md', '# Travel planning guidance\n\nUse documented dates, preferences, reservations, and constraints before suggesting plans. Do not assume private travel details that are not recorded.\n'),
    ],
  },
  {
    id: 'finance-tracker',
    name: 'Finance tracker',
    description: 'Budgets, subscriptions, savings goals, and recurring money reviews.',
    category: 'Finance',
    repository: 'WilliamFClarke/personal-md-template-finance',
    skills: ['AGENTS.md finance review guidance'],
    conventions: ['budget tables', 'subscription lists', 'monthly reviews'],
    tags: ['finance', 'budget', 'subscriptions'],
    files: [
      file('finance/README.md', '# Finance tracker\n\nTrack budgets, subscriptions, savings goals, and recurring reviews here.\n'),
      file('finance/budget.md', '---\ntags: [finance, budget]\n---\n\n# Budget\n\n| Category | Planned | Actual | Notes |\n| --- | --- | --- | --- |\n'),
      file('finance/subscriptions.md', '---\ntags: [finance, subscriptions]\n---\n\n# Subscriptions\n\n| Service | Cost | Renewal | Keep? |\n| --- | --- | --- | --- |\n'),
      file('finance/monthly-review.md', '---\ntags: [finance, review]\n---\n\n# Monthly finance review\n\n## Summary\n\n## Changes\n\n## Upcoming\n\n## Actions\n'),
      file('finance/AGENTS.md', '# Finance review guidance\n\nHelp organize recorded financial notes and recurring reviews. Do not provide regulated financial advice or infer account details.\n'),
    ],
  },
  {
    id: 'investment-tracker',
    name: 'Investment tracker',
    description: 'Portfolio notes, investment thesis tracking, contributions, allocation reviews, and watchlists.',
    category: 'Finance',
    repository: 'WilliamFClarke/personal-md-template-investments',
    skills: ['AGENTS.md investment tracking guidance'],
    conventions: ['portfolio snapshots', 'thesis notes', 'allocation reviews'],
    tags: ['finance', 'investments', 'portfolio'],
    files: [
      file('finance/investments/README.md', '# Investment tracker\n\nTrack portfolio snapshots, contributions, allocation reviews, watchlists, and investment notes here.\n'),
      file('finance/investments/portfolio.md', '---\ntags: [finance, investments, portfolio]\n---\n\n# Portfolio\n\n| Date | Account | Asset | Units | Value | Notes |\n| --- | --- | --- | --- | --- | --- |\n'),
      file('finance/investments/watchlist.md', '---\ntags: [finance, investments, watchlist]\n---\n\n# Watchlist\n\n| Asset | Reason watching | Trigger to review | Notes |\n| --- | --- | --- | --- |\n'),
      file('finance/investments/templates/investment-thesis.md', '---\ntags: [finance, investments, thesis]\nstatus: draft\n---\n\n# Investment thesis\n\n## What it is\n\n## Why it may be attractive\n\n## Risks\n\n## Review triggers\n\n## Decision log\n'),
      file('finance/investments/allocation-review.md', '---\ntags: [finance, investments, allocation]\n---\n\n# Allocation review\n\n## Current allocation\n\n| Asset class | Target | Current | Action |\n| --- | --- | --- | --- |\n\n## Notes\n\n## Follow-ups\n'),
      file('finance/investments/AGENTS.md', '# Investment tracking guidance\n\nHelp organize recorded portfolio notes, contribution history, and review prompts. Do not provide regulated financial advice, price predictions, or personalized buy/sell recommendations.\n'),
    ],
  },
  {
    id: 'uk-student-loan-tracker',
    name: 'UK student loan tracker',
    description: 'UK student loan plan notes, statements, repayments, interest changes, and annual reviews.',
    category: 'Finance',
    repository: 'WilliamFClarke/personal-md-template-uk-student-loan',
    skills: ['AGENTS.md UK student loan tracking guidance'],
    conventions: ['statement logs', 'plan details', 'repayment reviews'],
    tags: ['finance', 'student-loan', 'uk'],
    files: [
      file('finance/uk-student-loan/README.md', '# UK student loan tracker\n\nTrack plan details, statements, repayments, interest changes, and annual reviews here. Verify current rules with official Student Loans Company or GOV.UK sources before acting.\n'),
      file('finance/uk-student-loan/plan-details.md', '---\ntags: [finance, student-loan, uk]\n---\n\n# Plan details\n\n| Field | Value | Source/date checked |\n| --- | --- | --- |\n| Plan type |  |  |\n| Repayment status |  |  |\n| Current balance |  |  |\n| Interest rate |  |  |\n| Repayment threshold |  |  |\n| Write-off date estimate |  |  |\n'),
      file('finance/uk-student-loan/statements.md', '---\ntags: [finance, student-loan, statements]\n---\n\n# Statements\n\n| Statement date | Opening balance | Repayments | Interest | Closing balance | Notes |\n| --- | --- | --- | --- | --- | --- |\n'),
      file('finance/uk-student-loan/repayments.md', '---\ntags: [finance, student-loan, repayments]\n---\n\n# Repayments\n\n| Date | Source | Amount | Tax year | Notes |\n| --- | --- | --- | --- | --- |\n'),
      file('finance/uk-student-loan/annual-review.md', '---\ntags: [finance, student-loan, review]\n---\n\n# Annual student loan review\n\n## Balance movement\n\n## Repayments checked\n\n## Interest or threshold changes\n\n## Questions to verify\n\n## Follow-ups\n'),
      file('finance/uk-student-loan/AGENTS.md', '# UK student loan tracking guidance\n\nUse only recorded statements, plan notes, and user-provided official sources. Do not assume current UK thresholds, rates, or write-off rules; ask the user to verify against official sources before acting.\n'),
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

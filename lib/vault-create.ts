import {
  combine,
  createConceptFrontmatter,
} from './frontmatter'
import {
  rebuildBundleIndexes,
  INDEX_PATH,
  LOG_PATH,
} from './vault-index'
import { savePinned, loadPinned } from './storage/idb'
import type { VaultProvider } from './types'

export { INDEX_PATH, LOG_PATH }

export const WELCOME_PATH = 'welcome.md'
export const PERSONAL_CONCEPT_PATH = 'personal/home-base.md'
export const WORK_CONCEPT_PATH = 'projects/project-brief.md'
export const EXAMPLE_CONCEPT_PATH = WORK_CONCEPT_PATH

export type BundleTemplate = 'personal' | 'work' | 'blank' | 'default'
/** @deprecated Internal compatibility alias. New UI should say vault. */
export type VaultTemplate = BundleTemplate

function welcomeMarkdown(starter?: { title: string; path: string; label: string }) {
  return combine(
  createConceptFrontmatter('Welcome to Caedora', 'Guide', {
    description: 'How to use Caedora as an Open Knowledge Format knowledge vault.',
    resource: 'https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf',
    tags: ['guide', 'okf'],
  }),
  `Caedora stores your knowledge as ordinary Markdown files in storage you
control. Every concept is portable, readable without Caedora, and identified by
its path.

# The concept format

Every concept starts with YAML frontmatter. The only required field is a
non-empty \`type\`; the other standard fields make concepts easier for people
and agents to discover.

\`\`\`yaml
---
type: Reference
title: Human-readable title
description: One sentence explaining when to open this concept.
resource: https://example.com/canonical-resource
tags: [topic, status]
timestamp: 2026-06-15T12:00:00Z
---
\`\`\`

Write the durable knowledge in the Markdown body. Link related concepts with
normal Markdown links such as \`[Related concept](/concepts/example.md)\`.

# Linking concepts

Links are first-class vault structure. Use root-relative Markdown links when
you connect concepts, for example
\`[Customer Orders](/example/customer-orders.md)\`. Caedora reads those links
and backlinks to draw the link map from the bottom status bar, so clusters,
orphans, and important hubs stay visible while the vault grows.

# How Caedora maintains the vault

- \`index.md\` is generated as the progressive-disclosure map of the vault.
- Folder \`index.md\` files are also generated, so every folder has a small
  local map.
- \`log.md\` is created when Caedora records a meaningful operation.
- New concepts and in-app saves are blocked until they are OKF compliant.
- Files changed outside Caedora remain readable and show a red OKF indicator
  until their metadata is repaired.
- Unknown YAML fields are preserved when Caedora rewrites a concept.
- Generated index files are managed by Caedora and should not be hand-edited.

# Working with agents

Ask Argus or an MCP-connected assistant to search before creating, preserve
source links, add citations for external claims, maintain cross-links, and
surface contradictions instead of hiding them.

# References

[Open Knowledge Format specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

[LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
${starter
  ? `
# Your starter concept

This vault started from the ${starter.label} preset. Open
[${starter.title}](/${starter.path}) to see the first editable concept and how
links appear in the link map.
`
  : `
# Blank vault

This vault starts with only this guide and generated indexes. Create your first
concept when you are ready.
`}
`
  )
}

export const WELCOME_MARKDOWN = welcomeMarkdown({
  title: 'Home Base',
  path: PERSONAL_CONCEPT_PATH,
  label: 'personal',
})

export const PERSONAL_CONCEPT_MARKDOWN = combine(
  createConceptFrontmatter('Home Base', 'Personal Hub', {
    description: 'A private starting point for personal priorities, routines, and references.',
    resource: 'https://caedora.app/templates/personal#home-base',
    tags: ['personal', 'home', 'priorities'],
  }),
  `Use this concept as a calm home base for personal knowledge. Keep it short,
link outward to the areas that matter, and let the vault grow gradually.

### Starting points

- Current priorities
- Useful routines
- People and relationships
- Health, learning, finance, or travel notes

### Related concepts

- [Welcome to Caedora](/welcome.md)
`
)

export const WORK_CONCEPT_MARKDOWN = combine(
  createConceptFrontmatter('Project Brief', 'Project Hub', {
    description: 'A lightweight starting point for a project, client, or workstream.',
    resource: 'https://caedora.app/templates/work#project-brief',
    tags: ['work', 'project', 'planning'],
  }),
  `Use this concept as the first hub for a project. Keep decisions, links, and
next actions close to the work they affect.

### What to notice

- The title, description, tags, and resource live in YAML frontmatter.
- The body stays ordinary Markdown.
- The link below points back to another concept and appears in the link map.

### Project sections

- Outcomes
- Decisions
- Risks
- Key references
- Next actions

### Related concepts

- [Welcome to Caedora](/welcome.md)
`
)

/**
 * Every new vault starts from the same minimal OKF structure. The template
 * parameter remains for persisted UI compatibility.
 */
export function bundleSeedFiles(template: BundleTemplate): Array<[string, string]> {
  const preset = template === 'default' ? 'personal' : template
  if (preset === 'blank') {
    return [[WELCOME_PATH, welcomeMarkdown()]]
  }
  if (preset === 'work') {
    return [
      [WELCOME_PATH, welcomeMarkdown({
        title: 'Project Brief',
        path: WORK_CONCEPT_PATH,
        label: 'work/project',
      })],
      [WORK_CONCEPT_PATH, WORK_CONCEPT_MARKDOWN],
    ]
  }
  return [
    [WELCOME_PATH, WELCOME_MARKDOWN],
    [PERSONAL_CONCEPT_PATH, PERSONAL_CONCEPT_MARKDOWN],
  ]
}

export async function seedLocalBundle(
  provider: VaultProvider,
  template: BundleTemplate = 'default'
): Promise<void> {
  const seeded = await seedCore(provider, template)
  if (seeded.length > 0 && !provider.writesAreCommits) {
    await provider.commit('Initialize OKF knowledge vault', seeded)
  }
  if (seeded.includes(WELCOME_PATH)) await pinInitial(WELCOME_PATH)
  const entries = await listFilesRecursive(provider)
  await rebuildBundleIndexes(provider, entries)
}

/** @deprecated Use seedLocalBundle. */
export const seedLocalVault = seedLocalBundle

export async function seedEmptyBundle(provider: VaultProvider): Promise<string[]> {
  const seeded = await seedCore(provider, 'default')
  if (seeded.length > 0 && !provider.writesAreCommits) {
    await provider.commit('Initialize OKF knowledge vault', seeded)
  }
  if (seeded.includes(WELCOME_PATH)) await pinInitial(WELCOME_PATH)
  if (seeded.length > 0) {
    const entries = await listFilesRecursive(provider)
    await rebuildBundleIndexes(provider, entries)
  }
  return seeded
}

/** @deprecated Use seedEmptyBundle. */
export const seedEmptyVault = seedEmptyBundle

async function seedCore(
  provider: VaultProvider,
  template: BundleTemplate
): Promise<string[]> {
  const seeded: string[] = []
  for (const [path, content] of bundleSeedFiles(template)) {
    if (await fileExists(provider, path)) continue
    await provider.writeFile(path, content)
    seeded.push(path)
  }
  return seeded
}

export async function pinInitial(path: string): Promise<void> {
  try {
    const existing = await loadPinned()
    if (existing.length === 0) await savePinned([path])
  } catch {
    // Pinning is convenience state and must not block vault creation.
  }
}

export async function isFolderEmpty(provider: VaultProvider): Promise<boolean> {
  return (await provider.listFiles('')).length === 0
}

async function fileExists(provider: VaultProvider, path: string): Promise<boolean> {
  try {
    await provider.readFile(path)
    return true
  } catch {
    return false
  }
}

async function listFilesRecursive(provider: VaultProvider) {
  const entries: Array<{
    path: string
    name: string
    type: 'file' | 'dir'
    size?: number
    lastModified?: number
  }> = []
  if (provider.type === 'local' || provider.type === 'browser') {
    return provider.listFiles('')
  }
  const queue = ['']
  while (queue.length > 0) {
    const directory = queue.shift() ?? ''
    for (const entry of await provider.listFiles(directory)) {
      entries.push(entry)
      if (entry.type === 'dir') queue.push(entry.path)
    }
  }
  return entries
}

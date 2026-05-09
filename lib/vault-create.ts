/**
 * Seed a new local vault: ensure .git exists, write a welcome note and
 * .gitignore, commit them.
 */
import { savePinned, loadPinned } from './storage/idb'
import { rebuildVaultIndex, INDEX_PATH } from './vault-index'
import type { VaultProvider } from './types'

export { INDEX_PATH }

// Filename matches the H1 title slug so the sidebar label and the title are in sync.
export const WELCOME_PATH = 'welcome-to-your-vault.md'
const WELCOME_BODY = `---
tags: [example-tag]
---
# Welcome to your vault

This vault is yours. Everything here is a plain markdown file stored on your
own computer or in your own GitHub repository — never on our servers.

## Formatting cheatsheet

You can write **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.
Combine them for ***bold italics*** when you need emphasis on emphasis.

### Headings

Use \`#\`, \`##\`, \`###\`, \`####\` for heading levels 1–4. Every note gets
an H1 — rename it here and the file renames itself.

### Lists

- Unordered lists use dashes
- Nest them by indenting
  - Like this
  - And this
- Back out to continue at the top level

1. Ordered lists use numbers
2. They renumber themselves
3. Mix in **formatting** as you go

- [ ] Checkboxes work too
- [x] Tick them off as you finish

### Quotes & callouts

> Block quotes lean left and set off a voice that isn't yours — a citation,
> a reminder, something you want to sit apart from the flow.

### Code

Inline \`const answer = 42\` sits flush with the text. For anything longer,
fence a block:

\`\`\`ts
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

### Links & images

Links look like [this](https://example.com). Images use the same syntax
with a leading \`!\`:

![A placeholder](https://placehold.co/600x200)

### Tables

| Thing        | Why it's useful              |
| ------------ | ---------------------------- |
| Shopping     | Stop forgetting the milk     |
| Meetings     | Searchable past decisions    |
| Reading list | Everything you want to read  |

### Horizontal rules

Three dashes on their own line draw a divider:

---

## What this vault is for

Think of this as your **life OS** — one place for the long-running details
about your work, projects, health, home, and anything else you'd otherwise
forget or scatter across Notes apps and Google Docs.

### Work

- **Meeting notes** — agendas, decisions, who said what, action items
- **1:1 running docs** — one file per person, appended over time
- **Week in review** — a Friday note summarising what shipped and what didn't
- **Team glossary** — jargon, acronyms, who owns which service
- **Onboarding notes** — your first 90 days, saved for the next new hire

### Projects

- **Project briefs** — goals, scope, deadlines, stakeholders
- **Specs & design docs** — link to Figma, embed diagrams, capture tradeoffs
- **Decision log** — why you chose X over Y, so future-you doesn't redo it
- **Open questions** — a scratchpad of things that still need an answer
- **Retrospectives** — what went well, what didn't, what to try next time

### Life

- **Medical & health** — past appointments, medications, family history
- **Home** — appliance manuals, warranties, paint colours, Wi-Fi password
- **Finances** — subscriptions, bills, renewal dates, account nicknames
- **Travel** — passport numbers, loyalty accounts, places you want to go
- **Recipes & cooking** — the ones you actually make, with your tweaks

## Your vault as an AI source-of-truth

Because notes are plain markdown in your own storage, an AI assistant with
access to them can ground its answers in **your** life instead of generic
advice. We're building an MCP server (shipping separately) that exposes
this vault read-only to Claude, ChatGPT, and other assistants — so you can
ask:

- *"What did we decide about the payments migration last month?"*
- *"Draft a follow-up email to Priya based on our last 1:1."*
- *"Summarise everything I've written about Project Atlas this quarter."*
- *"What's my running list of books to read, grouped by topic?"*

The more you write here, the more useful your assistant becomes — and
none of it ever leaves your device or your repo.

## Tips

- Add tags via the **+ tag** chip under the title. They're stored as YAML
  frontmatter so Obsidian, Dataview, and friends can read them too.
- Star a note to pin it to the top of the sidebar.
- Press **+ New note** or **+ New folder** in the sidebar to grow the vault.
- Everything saves automatically — no Cmd-S muscle memory required.
`

const GITIGNORE_PATH = '.gitignore'
const GITIGNORE_BODY = `.DS_Store
Thumbs.db
*.swp
`

export const SKILL_PATH = 'AGENTS.md'
// Instructions for any AI assistant (Claude Code, Claude Desktop, claude.ai
// GitHub connector, Cursor, Codex, etc.) that is pointed at a vault.
// AGENTS.md is the emerging cross-tool convention for agent-readable project
// instructions (Codex, Cursor); Claude Code auto-loads CLAUDE.md so users
// targeting Claude Code can symlink AGENTS.md -> CLAUDE.md. Keep in sync
// with conventions enforced by the editor and the personal-md-mcp package.
export const SKILL_MARKDOWN = `# AGENTS.md — instructions for AI assistants

You are looking at a **personal-md vault**. This repository is one person's
"life OS": a private, markdown-first wiki of work, projects, health, finances,
travel, reading, and anything else worth remembering. Your job is to help the
owner read, maintain, and extend it.

Everything lives in plain markdown files — no database, no server, no lock-in.

## File layout

- Every note is a \`.md\` file somewhere in this repo.
- Folders are topical and created freely by the owner (e.g. \`Work/\`,
  \`Projects/\`, \`Health/\`, \`Daily/\`). Nesting is allowed.
- \`welcome.md\` / \`Welcome to your vault.md\` at the root is the onboarding
  note; don't treat it as load-bearing content.
- \`index.md\` at the root is a machine-maintained map of the vault — see
  "How to find things" below.
- \`.gitignore\`, \`.git/\`, and any \`.personal-md/\` folder are system files;
  ignore them unless asked.

## Conventions every note follows

1. **The first H1 is the title.** A note starts with \`# Title of note\`.
   New notes are seeded with an H1 derived from the filename, but the two
   are **independent** afterwards — editing the H1 doesn't rename the file,
   and vice versa. Change whichever you want; the other stays put.

2. **YAML frontmatter for metadata.** If a note has tags or other metadata,
   it starts with a \`---\` fence:

   \`\`\`
   ---
   tags: [project, active, q2-2026]
   ---
   # Title
   ...
   \`\`\`

   - \`tags\` is a flat list of lowercase kebab-case strings.
   - **Preserve any unknown frontmatter keys** you encounter (e.g. \`cssclass:\`
     or \`aliases:\` from Obsidian). Round-trip them untouched.

3. **Tags live in frontmatter, not inline.** Prefer \`tags: [fitness]\` over
   \`#fitness\` sprinkled in the body. You may add tags when useful; always
   normalise (trim, lowercase, replace spaces with \`-\`, strip leading \`#\`).

4. **Filenames are kebab-case slugs.** \`welcome.md\`,
   \`project-atlas-brief.md\`, \`2026-04-15-daily.md\`. URLs stay clean; the
   H1 inside carries the display title with spaces and capitals
   ("# Project Atlas Brief").

5. **No \`.gitkeep\`.** Empty folders are virtual in the UI and shouldn't be
   committed.

## How to find things

**Start with \`index.md\`.** It's an auto-maintained map of the whole vault: a
folder tree plus a flat table of every note with its path, folder, and tags.
Read it first to orient yourself — it tells you what exists and where, so you
don't have to scan the whole tree. It's rewritten automatically whenever a
note is created, renamed, moved, or deleted, so you can trust it to be fresh.

After \`index.md\` narrows down candidates, open specific notes for detail:

- **By tag**: scan the Tags column in \`index.md\`, or (if you have the
  \`personal-md-mcp\` tools) call \`notes_by_tag(name)\`.
- **Full-text**: \`grep -r "query" .\` or the \`search_notes\` MCP tool.
- **By folder**: use the Folder structure tree in \`index.md\`, or \`ls Projects/\`.
- **Recent work**: \`git log --oneline -20\` shows what's been edited lately.

\`index.md\` and \`AGENTS.md\` are **locked** in the UI — the owner can edit
their contents but they can't be renamed, moved, or deleted. Treat their
paths as stable anchors.

## How to write / maintain

When you create or update a note:

- **Always open with an H1.** If you're creating a note from scratch, the
  first line is \`# Some Title\`. Seed it from the intended filename.
- **Filename and H1 are independent.** Don't auto-rename a file when the H1
  changes, and don't rewrite the H1 when a file is renamed — the user edits
  them on their own terms.
- **Preserve existing frontmatter \`extra\` keys.** Read, modify, write back.
- **Don't rewrite a file to rename it.** Use git \`mv\` (or the \`rename_note\`
  MCP tool) so history follows.
- **Use real commits.** If you're running via the \`personal-md-mcp\` server
  against a GitHub repo, writes become commits automatically. Against a local
  folder, stage + commit as you go with a descriptive message.
- **Leave \`welcome.md\` and this \`AGENTS.md\` alone** unless the owner asks
  you to update them.

## What you're good for

- Answering questions grounded in the owner's actual notes ("what did we
  decide about the payments migration last month?").
- Drafting from prior material ("follow-up email to Priya based on our last
  1:1").
- Ongoing maintenance — retagging, fixing formatting drift, merging duplicate
  notes, extracting themes across many notes.
- Pulling summaries across whole topics ("everything I've written about
  Project Atlas this quarter").

Stay in scope. Don't invent facts you can't cite to a note.
`


// ─── Template system ─────────────────────────────────────────────────────────

export type VaultTemplate = 'personal' | 'work' | 'default'

const SHOPPING_LIST_BODY = `---
tags: [shopping, lists]
---
# Shopping List

Use this note to keep a running shopping list. An AI assistant with access
to your vault can add, remove, or tick items off on your behalf.

## Groceries

- [ ] Milk
- [ ] Bread
- [ ] Eggs
- [ ] Butter
- [ ] Coffee

## Household

- [ ] Washing-up liquid
- [ ] Bin bags
- [ ] Toilet roll

## Pharmacy

- [ ] (add items here)

## Other

- [ ] (add items here)
`

const HEALTH_BODY_BODY = `---
tags: [health, personal, reference]
---
# Health & Body

A private reference for your health metrics and sizing details. An AI
assistant reading this vault can use these to give personalised
recommendations without you having to repeat yourself every time.

## Body measurements

| Measurement | Value |
| ----------- | ----- |
| Height      |       |
| Weight      |       |
| Waist       |       |

## Clothing sizes

| Item        | Size | Notes |
| ----------- | ---- | ----- |
| Top / shirt |      |       |
| Trousers    |      |       |
| Shoes       |      |       |
| Jacket      |      |       |
| Jeans waist |      |       |
| Jeans leg   |      |       |

## Medical

| Detail               | Value |
| -------------------- | ----- |
| Blood type           |       |
| Allergies            |       |
| Dietary requirements |       |
| GP / Doctor name     |       |
| GP phone             |       |

## Current medications

| Medication | Dose | Frequency | Notes |
| ---------- | ---- | --------- | ----- |
|            |      |           |       |

## Vaccinations

| Vaccine | Date received | Next due |
| ------- | ------------- | -------- |
|         |               |          |

## Past conditions / operations

(Add any significant medical history here)
`

const EMERGENCY_CONTACTS_BODY = `---
tags: [contacts, emergency, personal, reference]
---
# Emergency Contacts

Key contacts for emergencies. An AI assistant can look these up quickly
when you need them.

## Family

| Name | Relationship | Phone | Notes |
| ---- | ------------ | ----- | ----- |
|      |              |       |       |

## Doctor / GP

| Name | Phone | Address |
| ---- | ----- | ------- |
|      |       |         |

## Other important contacts

| Who                       | Phone | Notes |
| ------------------------- | ----- | ----- |
| Dentist                   |       |       |
| Vet                       |       |       |
| Landlord / property agent |       |       |
| Solicitor / lawyer        |       |       |
`

const TRAVEL_DOCS_BODY = `---
tags: [travel, documents, personal, reference]
---
# Travel Documents

A private record of travel document details and loyalty programme accounts.

> **Security note:** This file lives in your own storage only — never on
> personal-md servers. Treat it like a locked drawer.

## Passport

| Detail          | Value |
| --------------- | ----- |
| Full name       |       |
| Passport number |       |
| Nationality     |       |
| Issued          |       |
| Expires         |       |

## Driving licence

| Detail  | Value |
| ------- | ----- |
| Number  |       |
| Expires |       |

## Loyalty programmes

| Programme | Number / username | Status | Notes |
| --------- | ----------------- | ------ | ----- |
|           |                   |        |       |
|           |                   |        |       |

## Upcoming travel

| Trip | Dates | Booking ref | Notes |
| ---- | ----- | ----------- | ----- |
|      |       |             |       |
`

const MEETING_NOTES_TEMPLATE_BODY = `---
tags: [meetings, template, work]
---
# Meeting Notes Template

Copy this file for each meeting. Rename it to something like
\`2026-04-19-team-standup.md\` and move it into a \`Meetings/\` folder.

---

## Meeting: [Name / Topic]

**Date:** YYYY-MM-DD
**Attendees:**

- Name (role)
- Name (role)

## Agenda

1. Item one
2. Item two

## Notes

(Write as the meeting progresses)

## Decisions

- Decision 1
- Decision 2

## Action items

| Action | Owner | Due |
| ------ | ----- | --- |
|        |       |     |

## Next meeting

**Date:**
**Agenda preview:**
`

const PROJECT_BRIEF_TEMPLATE_BODY = `---
tags: [project, brief, template, work]
---
# Project Brief Template

Copy this file for each project. Rename it to \`project-name-brief.md\`
and move it into a \`Projects/\` folder.

---

## Project: [Name]

**Owner:**
**Start date:**
**Target date:**
**Status:** Planning / Active / Complete / On hold

## Problem statement

(What problem are we solving, and for whom?)

## Goals

- Goal 1
- Goal 2

## Out of scope

- (What we are explicitly not doing)

## Stakeholders

| Name | Role | Input needed |
| ---- | ---- | ------------ |
|      |      |              |

## Key decisions

| Decision | Rationale | Date |
| -------- | --------- | ---- |
|          |           |      |

## Open questions

- [ ] Question 1
- [ ] Question 2

## Milestones

| Milestone | Due | Status |
| --------- | --- | ------ |
|           |     |        |

## Links

- Design / Figma:
- Repo / code:
- Tickets:
`

const WEEKLY_REVIEW_BODY = `---
tags: [review, weekly, work]
---
# Weekly Review

A running log of weekly reviews. Add a new entry each Friday (or whenever
suits you). An AI assistant can summarise patterns across entries or help
draft the next one.

---

## Week of YYYY-MM-DD

### What shipped

-

### What didn't ship (and why)

-

### Highlights

-

### Challenges

-

### Next week's priorities

- [ ]
- [ ]
- [ ]

---

(Copy the section above for each new week)
`

const PERSONAL_TEMPLATE_FILES: Array<[string, string]> = [
  ['shopping-list.md', SHOPPING_LIST_BODY],
  ['health-and-body.md', HEALTH_BODY_BODY],
  ['emergency-contacts.md', EMERGENCY_CONTACTS_BODY],
  ['travel-documents.md', TRAVEL_DOCS_BODY],
]

const WORK_TEMPLATE_FILES: Array<[string, string]> = [
  ['meeting-notes-template.md', MEETING_NOTES_TEMPLATE_BODY],
  ['project-brief-template.md', PROJECT_BRIEF_TEMPLATE_BODY],
  ['weekly-review.md', WEEKLY_REVIEW_BODY],
]

export function templateFilesFor(template: VaultTemplate): Array<[string, string]> {
  if (template === 'personal') return PERSONAL_TEMPLATE_FILES
  if (template === 'work') return WORK_TEMPLATE_FILES
  return []
}

// ─── Seeding ─────────────────────────────────────────────────────────────────

/**
 * Run once for a freshly-created local vault. Idempotent — safe to call even
 * if the folder already has a welcome.md (it won't overwrite existing files).
 */
export async function seedLocalVault(
  provider: VaultProvider,
  template: VaultTemplate = 'default'
): Promise<void> {
  const seeded: string[] = []

  if (!(await fileExists(provider, WELCOME_PATH))) {
    await provider.writeFile(WELCOME_PATH, WELCOME_BODY)
    seeded.push(WELCOME_PATH)
  }
  if (!(await fileExists(provider, SKILL_PATH))) {
    await provider.writeFile(SKILL_PATH, SKILL_MARKDOWN)
    seeded.push(SKILL_PATH)
  }
  if (!(await fileExists(provider, GITIGNORE_PATH))) {
    await provider.writeFile(GITIGNORE_PATH, GITIGNORE_BODY)
    seeded.push(GITIGNORE_PATH)
  }
  for (const [path, body] of templateFilesFor(template)) {
    if (!(await fileExists(provider, path))) {
      await provider.writeFile(path, body)
      seeded.push(path)
    }
  }
  if (seeded.length > 0) {
    await provider.commit('Initial vault setup', seeded)
  }
  if (seeded.includes(WELCOME_PATH)) {
    await pinInitial(WELCOME_PATH)
  }
  // Build initial index so the LLM can discover files from the first open.
  await rebuildVaultIndex(provider, seeded.filter(p => p.endsWith('.md') && p !== INDEX_PATH).map(p => ({
    path: p, name: p.split('/').pop() ?? p, type: 'file' as const,
  })))
}

/**
 * Seed an empty vault through the generic VaultProvider interface — writes
 * welcome.md and AGENTS.md if they're missing. Used when the user opens a
 * pre-existing-but-empty vault (e.g. a GitHub repo they created manually)
 * so they get the same out-of-the-box experience as Create.
 */
export async function seedEmptyVault(provider: VaultProvider): Promise<string[]> {
  const seeded: string[] = []
  if (!(await providerHasFile(provider, WELCOME_PATH))) {
    await provider.writeFile(WELCOME_PATH, WELCOME_BODY)
    seeded.push(WELCOME_PATH)
  }
  if (!(await providerHasFile(provider, SKILL_PATH))) {
    await provider.writeFile(SKILL_PATH, SKILL_MARKDOWN)
    seeded.push(SKILL_PATH)
  }
  if (seeded.length > 0 && !provider.writesAreCommits) {
    await provider.commit('Initial vault setup', seeded)
  }
  if (seeded.includes(WELCOME_PATH)) {
    await pinInitial(WELCOME_PATH)
  }
  if (seeded.length > 0) {
    await rebuildVaultIndex(provider, seeded.filter(p => p.endsWith('.md') && p !== INDEX_PATH).map(p => ({
      path: p, name: p.split('/').pop() ?? p, type: 'file' as const,
    })))
  }
  return seeded
}

async function providerHasFile(provider: VaultProvider, path: string): Promise<boolean> {
  try {
    await provider.readFile(path)
    return true
  } catch {
    return false
  }
}

/** Welcome markdown body — exported so the GitHub seed flow can reuse it. */
export const WELCOME_MARKDOWN = WELCOME_BODY

/** Pin a note on first vault creation if nothing is pinned yet. */
export async function pinInitial(path: string): Promise<void> {
  try {
    const existing = await loadPinned()
    if (existing.length > 0) return
    await savePinned([path])
  } catch {
    // ignore
  }
}

/**
 * True if the folder is empty (no user files besides .git).
 */
export async function isFolderEmpty(provider: VaultProvider): Promise<boolean> {
  const files = await provider.listFiles('')
  // listFiles already skips .git
  return files.length === 0
}

async function fileExists(provider: VaultProvider, path: string): Promise<boolean> {
  try {
    await provider.readFile(path)
    return true
  } catch {
    return false
  }
}

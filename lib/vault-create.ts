/**
 * Seed a new local vault: ensure .git exists, write a welcome note and
 * .gitignore, commit them.
 */
import { LocalGitProvider } from './storage/local-provider'
import { savePinned, loadPinned } from './storage/idb'

// Filename matches the H1 so the editor's H1 → filename sync doesn't
// immediately rename the seeded note on first load (which briefly shows
// two entries in the sidebar while the rename settles).
export const WELCOME_PATH = 'Welcome to your vault.md'
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

/**
 * Run once for a freshly-created local vault. Idempotent — safe to call even
 * if the folder already has a welcome.md (it won't overwrite existing files).
 */
export async function seedLocalVault(provider: LocalGitProvider): Promise<void> {
  const seeded: string[] = []

  if (!(await fileExists(provider, WELCOME_PATH))) {
    await provider.writeFile(WELCOME_PATH, WELCOME_BODY)
    seeded.push(WELCOME_PATH)
  }
  if (!(await fileExists(provider, GITIGNORE_PATH))) {
    await provider.writeFile(GITIGNORE_PATH, GITIGNORE_BODY)
    seeded.push(GITIGNORE_PATH)
  }
  if (seeded.length > 0) {
    await provider.commit('Initial vault setup', seeded)
  }
  if (seeded.includes(WELCOME_PATH)) {
    await pinInitial(WELCOME_PATH)
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
export async function isFolderEmpty(provider: LocalGitProvider): Promise<boolean> {
  const files = await provider.listFiles('')
  // listFiles already skips .git
  return files.length === 0
}

async function fileExists(provider: LocalGitProvider, path: string): Promise<boolean> {
  try {
    await provider.readFile(path)
    return true
  } catch {
    return false
  }
}

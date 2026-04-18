/**
 * Seed a new local vault: ensure .git exists, write a welcome note and
 * .gitignore, commit them.
 */
import { LocalGitProvider } from './storage/local-provider'

const WELCOME_PATH = 'welcome.md'
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

## Ideas to get started

- A shopping list
- Your favourite foods
- An inventory of what you own
- Your bills and subscriptions
- Health notes and medications

Add tags to any note via the **+ tag** chip under the title — they're stored
as YAML frontmatter so Obsidian, Dataview, and friends can see them too.
Click **+ New note** in the sidebar to create your first note. Your changes
save automatically.
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

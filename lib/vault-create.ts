/**
 * Seed a new local vault: ensure .git exists, write a welcome note and
 * .gitignore, commit them.
 */
import { LocalGitProvider } from './storage/local-provider'

const WELCOME_PATH = 'welcome.md'
const WELCOME_BODY = `# Getting started

Welcome to the Simple Editor template! This template integrates open source UI components and Tiptap extensions licensed under MIT.

Integrate it by following the Tiptap UI Components docs or using our CLI tool.

\`\`\`
npx @tiptap/cli init
\`\`\`

## Features

A fully responsive rich text editor with built-in support for common formatting and layout tools. Type markdown \`**\` or use keyboard shortcuts \`⌘+B\` for most all common markdown marks. 🪄

Add images, customize alignment, and apply advanced formatting to make your writing more engaging and professional.

- Superscript (x2) and Subscript (H2O) for precision.
- Typographic conversion: automatically convert to -> an arrow →.

→ Learn more

## Make it your own

Switch between light and dark modes, and tailor the editor's appearance with customizable CSS to match your style.

- Test template
- Integrate the free template
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

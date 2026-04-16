/**
 * Seed a new local vault: ensure .git exists, write a welcome note and
 * .gitignore, commit them.
 */
import { LocalGitProvider } from './storage/local-provider'

const WELCOME_PATH = 'welcome.md'
const WELCOME_BODY = `# Welcome to your vault

This vault is yours. Everything you write here is a plain markdown file stored
on your own computer or in your own GitHub repository — never on our servers.

## Ideas to get started

- A shopping list
- Your favourite foods
- An inventory of what you own
- Your bills and subscriptions
- Health notes and medications

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

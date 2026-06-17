#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import path from 'node:path'
import { buildServer } from './server.js'
import { LocalNodeProvider } from './providers/local-node.js'
import { GitHubNodeProvider } from './providers/github.js'
import type { VaultProvider } from './providers/types.js'

interface ParsedArgs {
  bundle?: string
  github?: string
  pat?: string
  readOnly: boolean
  help: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { readOnly: false, help: false }
  for (let index = 0; index < argv.length; index++) {
    switch (argv[index]) {
      case '--bundle':
      case '--vault':
        out.bundle = argv[++index]
        break
      case '--github':
        out.github = argv[++index]
        break
      case '--pat':
        out.pat = argv[++index]
        break
      case '--read-only':
        out.readOnly = true
        break
      case '-h':
      case '--help':
        out.help = true
        break
      default:
        if (argv[index].startsWith('--')) {
          console.error(`Unknown flag: ${argv[index]}`)
          process.exit(2)
        }
    }
  }
  return out
}

function printHelp(): void {
  console.error(`caedora-mcp - MCP server for OKF knowledge bundles

Usage:
  caedora-mcp --bundle <path>
  caedora-mcp --github <owner>/<repo> --pat <token>
  caedora-mcp --bundle <path> --read-only

Options:
  --bundle <path>      Serve a local OKF bundle.
  --vault <path>       Legacy alias for --bundle.
  --github owner/repo  Serve a GitHub-hosted OKF bundle.
  --pat <token>        GitHub personal access token. Falls back to GITHUB_TOKEN.
  --read-only          Disable all write tools.
  -h, --help           Show this help.

The server speaks stdio. Example MCP configuration:

  {
    "mcpServers": {
      "caedora": {
        "command": "npx",
        "args": ["-y", "caedora-mcp", "--bundle", "/path/to/bundle"]
      }
    }
  }
`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    process.exit(0)
  }

  let provider: VaultProvider
  if (args.bundle) {
    provider = new LocalNodeProvider(path.resolve(args.bundle))
  } else if (args.github) {
    const [owner, repo] = args.github.split('/')
    if (!owner || !repo) {
      console.error('--github must be in the form owner/repo')
      process.exit(2)
    }
    const token = args.pat ?? process.env.GITHUB_TOKEN
    if (!token) {
      console.error('Missing --pat (or GITHUB_TOKEN) for --github mode')
      process.exit(2)
    }
    provider = new GitHubNodeProvider(token, owner, repo)
  } else {
    console.error('Must provide either --bundle <path> or --github owner/repo')
    printHelp()
    process.exit(2)
  }

  const server = buildServer({ provider, readOnly: args.readOnly })
  await server.connect(new StdioServerTransport())
}

main().catch((error: unknown) => {
  console.error(`caedora-mcp: fatal error - ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

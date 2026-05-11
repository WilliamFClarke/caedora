#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import path from 'node:path'
import { buildServer } from './server.js'
import { LocalNodeProvider } from './providers/local-node.js'
import { GitHubNodeProvider } from './providers/github.js'
import type { VaultProvider } from './providers/types.js'

interface ParsedArgs {
  vault?: string
  github?: string
  pat?: string
  readOnly: boolean
  help: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { readOnly: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--vault':
        out.vault = argv[++i]
        break
      case '--github':
        out.github = argv[++i]
        break
      case '--pat':
        out.pat = argv[++i]
        break
      case '--read-only':
        out.readOnly = true
        break
      case '-h':
      case '--help':
        out.help = true
        break
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown flag: ${arg}`)
          process.exit(2)
        }
    }
  }
  return out
}

function printHelp(): void {
  console.error(`caedora-mcp — MCP server for Caedora vaults

Usage:
  caedora-mcp --vault <path>
  caedora-mcp --github <owner>/<repo> --pat <token>
  caedora-mcp --vault <path> --read-only

Options:
  --vault <path>       Serve a local folder (absolute path recommended).
  --github owner/repo  Serve a GitHub-hosted vault.
  --pat <token>        GitHub personal access token (required with --github).
                       Falls back to $GITHUB_TOKEN if omitted.
  --read-only          Disable all write tools.
  -h, --help           Show this help.

The server speaks stdio. Wire it into your AI client's MCP config:

  {
    "mcpServers": {
      "caedora": {
        "command": "npx",
        "args": ["-y", "caedora-mcp", "--vault", "/path/to/vault"]
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
  if (args.vault) {
    provider = new LocalNodeProvider(path.resolve(args.vault))
  } else if (args.github) {
    const [owner, repo] = args.github.split('/')
    if (!owner || !repo) {
      console.error('--github must be in the form owner/repo')
      process.exit(2)
    }
    const token = args.pat ?? process.env.GITHUB_TOKEN
    if (!token) {
      console.error('Missing --pat (or $GITHUB_TOKEN) for --github mode')
      process.exit(2)
    }
    provider = new GitHubNodeProvider(token, owner, repo)
  } else {
    console.error('Must provide either --vault <path> or --github owner/repo')
    printHelp()
    process.exit(2)
  }

  const server = buildServer({ provider, readOnly: args.readOnly })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Server runs until transport closes.
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`caedora-mcp: fatal error — ${message}`)
  process.exit(1)
})

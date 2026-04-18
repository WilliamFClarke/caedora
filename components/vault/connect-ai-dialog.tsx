'use client'

import { useState } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LocalGitProvider } from '@/lib/storage/local-provider'
import { GitHubProvider } from '@/lib/storage/github-provider'
import type { VaultProvider } from '@/lib/types'

interface ConnectAiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: VaultProvider
}

export function ConnectAiDialog({ open, onOpenChange, provider }: ConnectAiDialogProps) {
  const isLocal = provider.type === 'local'
  const folderName = isLocal ? (provider as LocalGitProvider).folderName : null
  const gh = !isLocal ? (provider as GitHubProvider) : null
  const defaultTab = isLocal ? 'claude-code' : 'claude-web'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            Connect your AI
          </DialogTitle>
          <DialogDescription>
            Point your AI assistant at this vault so it can answer questions,
            draft notes, and help maintain it.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
            <TabsTrigger value="claude-desktop">Desktop / Cursor</TabsTrigger>
            <TabsTrigger value="claude-web" disabled={isLocal}>
              claude.ai
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude-code" className="mt-4">
            <ClaudeCodeTab folderName={folderName} gh={gh} />
          </TabsContent>
          <TabsContent value="claude-desktop" className="mt-4">
            <DesktopTab folderName={folderName} gh={gh} />
          </TabsContent>
          <TabsContent value="claude-web" className="mt-4">
            <WebTab gh={gh} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ClaudeCodeTab({
  folderName,
  gh,
}: {
  folderName: string | null
  gh: GitHubProvider | null
}) {
  const cdCommand = folderName
    ? `cd "${folderName}" && claude`
    : gh
      ? `gh repo clone ${gh.owner}/${gh.repo} && cd ${gh.repo} && claude`
      : 'claude'

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Claude Code already has file tools. Open your vault folder and start
        a session — the <code className="bg-muted rounded px-1">AGENTS.md</code>{' '}
        at the root tells it how your vault is structured.
      </p>
      <Snippet label="Terminal" value={cdCommand} />
      <p className="text-muted-foreground text-xs">
        For richer tag-indexed search and maintenance-quality writes, also wire
        up <code className="bg-muted rounded px-1">personal-md-mcp</code> —
        see the <em>Desktop / Cursor</em> tab for the same config.
      </p>
    </div>
  )
}

function DesktopTab({
  folderName,
  gh,
}: {
  folderName: string | null
  gh: GitHubProvider | null
}) {
  const localConfig = `{
  "mcpServers": {
    "personal-md": {
      "command": "npx",
      "args": ["-y", "personal-md-mcp", "--vault", "/path/to/${folderName ?? 'your-vault'}"]
    }
  }
}`
  const githubConfig = gh
    ? `{
  "mcpServers": {
    "personal-md": {
      "command": "npx",
      "args": [
        "-y", "personal-md-mcp",
        "--github", "${gh.owner}/${gh.repo}",
        "--pat", "<your-github-pat>"
      ]
    }
  }
}`
    : null

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Add this block to your Claude Desktop or Cursor MCP config. The server
        exposes vault-aware search and write tools that preserve frontmatter,
        H1↔filename, and tag conventions.
      </p>
      {folderName && <Snippet label="Local vault" value={localConfig} multiline />}
      {githubConfig && <Snippet label="GitHub vault" value={githubConfig} multiline />}
      <p className="text-muted-foreground text-xs">
        Config location: <code className="bg-muted rounded px-1">~/Library/Application Support/Claude/claude_desktop_config.json</code>{' '}
        (macOS) or <code className="bg-muted rounded px-1">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows).
      </p>
    </div>
  )
}

function WebTab({ gh }: { gh: GitHubProvider | null }) {
  if (!gh) {
    return (
      <p className="text-muted-foreground text-sm">
        claude.ai&apos;s GitHub connector only works for vaults hosted on GitHub.
        Switch to Claude Code or Desktop for local vaults.
      </p>
    )
  }
  const repoUrl = `https://github.com/${gh.owner}/${gh.repo}`
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        claude.ai can read your vault directly via its GitHub connector:
      </p>
      <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
        <li>
          Open <a href="https://claude.ai/settings/connectors" target="_blank" rel="noopener noreferrer" className="underline">claude.ai → Settings → Connectors</a>.
        </li>
        <li>Add the GitHub connector and grant access to this repo.</li>
        <li>Start a new chat and ask about anything in your vault.</li>
      </ol>
      <Snippet label="Repo" value={repoUrl} />
      <p className="text-muted-foreground text-xs">
        The <code className="bg-muted rounded px-1">AGENTS.md</code> at the root
        of your vault gets picked up automatically — Claude will use it to
        understand your conventions.
      </p>
    </div>
  )
}

function Snippet({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="border-border bg-muted/40 relative rounded-md border">
      <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
          {label}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={copy}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre
        className={cn(
          'px-3 py-2 font-mono text-[11px] leading-relaxed',
          multiline ? 'whitespace-pre' : 'whitespace-pre-wrap break-all'
        )}
      >
        {value}
      </pre>
    </div>
  )
}

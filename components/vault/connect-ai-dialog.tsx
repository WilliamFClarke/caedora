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
            Connect external AI
          </DialogTitle>
          <DialogDescription>
            Connect an external AI assistant to this OKF bundle so it can query,
            ingest, link, and maintain concepts.
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
        Claude Code already has file tools. Open your bundle folder and start a
        session. The welcome concept explains the OKF structure, and an optional{' '}
        <code className="bg-muted rounded px-1">AGENTS.md</code> can add
        bundle-specific operating rules.
      </p>
      <Snippet label="Terminal" value={cdCommand} />
      <p className="text-muted-foreground text-xs">
        For indexed search, graph traversal, validation, and conformant writes,
        also wire up <code className="bg-muted rounded px-1">caedora-mcp</code>.
        See the <em>Desktop / Cursor</em> tab for the config.
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
    "caedora": {
      "command": "npx",
      "args": ["-y", "caedora-mcp", "--bundle", "/path/to/${folderName ?? 'your-bundle'}"]
    }
  }
}`
  const githubConfig = gh
    ? `{
  "mcpServers": {
    "caedora": {
      "command": "npx",
      "args": [
        "-y", "caedora-mcp",
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
        exposes OKF concept search, graph, validation, ingest, and write tools
        while preserving producer-defined YAML fields.
      </p>
      {folderName && <Snippet label="Local bundle" value={localConfig} multiline />}
      {githubConfig && <Snippet label="GitHub bundle" value={githubConfig} multiline />}
      <p className="text-muted-foreground text-xs">
        Config location:{' '}
        <code className="bg-muted rounded px-1">
          ~/Library/Application Support/Claude/claude_desktop_config.json
        </code>{' '}
        (macOS) or{' '}
        <code className="bg-muted rounded px-1">
          %APPDATA%\Claude\claude_desktop_config.json
        </code>{' '}
        (Windows).
      </p>
    </div>
  )
}

function WebTab({ gh }: { gh: GitHubProvider | null }) {
  if (!gh) {
    return (
      <p className="text-muted-foreground text-sm">
        claude.ai&apos;s GitHub connector only works for bundles hosted on GitHub.
        Switch to Claude Code or Desktop for local bundles.
      </p>
    )
  }
  const repoUrl = `https://github.com/${gh.owner}/${gh.repo}`
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        claude.ai can read your bundle directly through its GitHub connector:
      </p>
      <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
        <li>
          Open{' '}
          <a
            href="https://claude.ai/settings/connectors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            claude.ai Settings, then Connectors
          </a>
          .
        </li>
        <li>Add the GitHub connector and grant access to this repository.</li>
        <li>Start a new chat and ask about concepts in your bundle.</li>
      </ol>
      <Snippet label="Repository" value={repoUrl} />
      <p className="text-muted-foreground text-xs">
        Claude can follow the conventions in the welcome concept and any
        optional <code className="bg-muted rounded px-1">AGENTS.md</code> you add.
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

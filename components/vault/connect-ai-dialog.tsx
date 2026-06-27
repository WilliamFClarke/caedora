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
  // Desktop (Electron) local vaults expose a real filesystem path; browser
  // File System Access vaults only expose a name (see ElectronLocalProvider).
  const localPath =
    isLocal && 'directoryPath' in provider
      ? (provider as { directoryPath: string }).directoryPath
      : null
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
            Connect an external AI assistant to this OKF vault so it can query,
            ingest, link, and maintain concepts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
            <TabsTrigger value="claude-desktop">Desktop / CLI</TabsTrigger>
            <TabsTrigger value="claude-web" disabled={isLocal}>
              claude.ai
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude-code" className="mt-4">
            <ClaudeCodeTab localPath={localPath} folderName={folderName} gh={gh} />
          </TabsContent>
          <TabsContent value="claude-desktop" className="mt-4">
            <DesktopTab localPath={localPath} folderName={folderName} gh={gh} />
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
  localPath,
  folderName,
  gh,
}: {
  localPath: string | null
  folderName: string | null
  gh: GitHubProvider | null
}) {
  const vaultPath = localPath ?? `/absolute/path/to/${folderName ?? 'your-vault'}`
  const addCommand = gh
    ? `claude mcp add caedora -- npx -y caedora-mcp --github ${gh.owner}/${gh.repo} --pat <your-github-pat>`
    : `claude mcp add caedora -- npx -y caedora-mcp --bundle "${vaultPath}"`

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Register the OKF tools — indexed search, graph traversal, validation, and
        conformant writes — with Claude Code, then start a session and run{' '}
        <code className="bg-muted rounded px-1">/mcp</code> to confirm{' '}
        <code className="bg-muted rounded px-1">caedora</code> is connected.
      </p>
      <Snippet label="Terminal" value={addCommand} />
      {!gh && !localPath && (
        <p className="text-muted-foreground text-xs">
          The browser doesn&apos;t expose your folder&apos;s full path — replace{' '}
          <code className="bg-muted rounded px-1">{vaultPath}</code> with the real
          path from your file manager. The Caedora desktop app fills this in
          automatically.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Append <code className="bg-muted rounded px-1">--read-only</code> to let
        Claude read but not edit. Claude Code also has built-in file tools, so you
        can just run <code className="bg-muted rounded px-1">claude</code> inside
        the vault folder — the welcome concept and an optional{' '}
        <code className="bg-muted rounded px-1">AGENTS.md</code> explain the OKF
        structure.
      </p>
    </div>
  )
}

function DesktopTab({
  localPath,
  folderName,
  gh,
}: {
  localPath: string | null
  folderName: string | null
  gh: GitHubProvider | null
}) {
  const vaultPath = localPath ?? `/absolute/path/to/${folderName ?? 'your-vault'}`
  const localConfig = `{
  "mcpServers": {
    "caedora": {
      "command": "npx",
      "args": ["-y", "caedora-mcp", "--bundle", "${vaultPath}"]
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
        Caedora speaks the Model Context Protocol, so any MCP-aware client uses
        the same config block. It exposes OKF concept search, graph, validation,
        ingest, and write tools while preserving producer-defined YAML fields.
      </p>
      {folderName && <Snippet label="Local vault" value={localConfig} multiline />}
      {githubConfig && <Snippet label="GitHub vault" value={githubConfig} multiline />}
      {folderName && !localPath && (
        <p className="text-muted-foreground text-xs">
          Replace <code className="bg-muted rounded px-1">{vaultPath}</code> with
          your vault folder&apos;s absolute path (the desktop app knows it
          automatically).
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Add <code className="bg-muted rounded px-1">--read-only</code> to the{' '}
        <code className="bg-muted rounded px-1">args</code> array to let the AI
        read but not write.
      </p>
      <div className="text-muted-foreground space-y-1 text-xs">
        <p className="font-medium">Config location by client:</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>
            Claude Desktop —{' '}
            <code className="bg-muted rounded px-1">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </code>{' '}
            (macOS),{' '}
            <code className="bg-muted rounded px-1">
              %APPDATA%\Claude\claude_desktop_config.json
            </code>{' '}
            (Windows)
          </li>
          <li>
            Cursor —{' '}
            <code className="bg-muted rounded px-1">~/.cursor/mcp.json</code>
          </li>
          <li>
            Gemini CLI —{' '}
            <code className="bg-muted rounded px-1">~/.gemini/settings.json</code>
          </li>
          <li>
            Other MCP clients — use the same{' '}
            <code className="bg-muted rounded px-1">mcpServers</code> block.
          </li>
        </ul>
      </div>
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
        claude.ai can read your vault directly through its GitHub connector:
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
        <li>Start a new chat and ask about concepts in your vault.</li>
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

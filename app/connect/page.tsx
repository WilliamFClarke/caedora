import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'
import {
  FileText,
  FolderOpen,
  Terminal,
  Brain,
  ArrowLeft,
  Shield,
  Github,
  Copy,
  CheckCircle,
} from 'lucide-react'

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-geist-sans)]">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-bold tracking-tight">personal-md</span>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">Set up your vault</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your vault is just a folder of markdown files on your computer.
            No accounts, no cloud sync, no credentials.
          </p>
        </div>

        {/* Step 1 */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <div>
                  <CardTitle className="text-base">Create your vault folder</CardTitle>
                  <CardDescription>A regular folder that will hold your markdown files</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-[family-name:var(--font-geist-mono)] text-sm">
                <div className="text-muted-foreground text-xs mb-2 flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" />
                  Terminal
                </div>
                <pre className="text-foreground">{'mkdir -p ~/.personal-md\ncd ~/.personal-md\ngit init'}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                You can put this anywhere and name it whatever you like. Git init is optional but recommended for version history.
              </p>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <div>
                  <CardTitle className="text-base">Add some notes</CardTitle>
                  <CardDescription>Start with whatever matters most to you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-[family-name:var(--font-geist-mono)] text-sm">
                <div className="text-muted-foreground text-xs mb-2 flex items-center gap-1.5">
                  <FolderOpen className="h-3 w-3" />
                  ~/.personal-md/
                </div>
                <pre className="text-foreground">{'health/\n  overview.md      # Side sleeper, allergies, blood type\n  medications.md   # Current prescriptions\nfinance/\n  portfolio.md     # Investment allocations\n  goals.md         # Savings targets\npreferences/\n  food.md          # Oat milk flat white, no cilantro\n  travel.md        # Aisle seat, warm climates\ndaily/\n  2026-04-15.md    # Today\'s log'}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Use any structure you like. Folders, flat files, nested — it all works.
              </p>
            </CardContent>
          </Card>

          {/* Step 3 — MCP */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  3
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Connect your AI via MCP
                  </CardTitle>
                  <CardDescription>The magic part — your AI now knows everything about you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Add this to your AI client&apos;s MCP config (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/.claude/claude_desktop_config.json</code> for Claude Desktop):
              </p>
              <div className="bg-muted rounded-lg p-4 font-[family-name:var(--font-geist-mono)] text-sm relative">
                <pre className="text-foreground leading-relaxed">{'\n{\n  "mcpServers": {\n    "personal-md": {\n      "command": "npx",\n      "args": [\n        "personal-md-mcp",\n        "--vault",\n        "~/.personal-md"\n      ]\n    }\n  }\n}'}</pre>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Update the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">--vault</code> path to wherever you created your folder.
                Works with Claude Desktop, Cursor, and any MCP-compatible client.
              </p>
            </CardContent>
          </Card>

          {/* Done */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">That&apos;s it!</p>
              <p className="text-sm text-muted-foreground">
                Your AI assistant can now search, read, and reference everything in your vault.
                Ask it anything about yourself.
              </p>
            </div>
          </div>

          <Separator />

          {/* Optional: GitHub backup */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Github className="h-4 w-4" />
              Optional: back up to GitHub
            </h3>
            <p className="text-sm text-muted-foreground">
              If you want cloud backup and access across machines, push your vault to a <strong>private</strong> GitHub repo:
            </p>
            <div className="bg-muted rounded-lg p-4 font-[family-name:var(--font-geist-mono)] text-sm">
              <pre className="text-foreground">{'cd ~/.personal-md\ngit remote add origin git@github.com:YOU/my-vault.git\ngit add . && git commit -m "initial vault"\ngit push -u origin main'}</pre>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Everything stays on your machine. The MCP server reads directly from your local filesystem.
              No tokens, no APIs, no data leaves your computer unless you choose to push to a remote git repo.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

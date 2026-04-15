import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Plus,
  Search,
  Settings,
  GitBranch,
  ChevronRight,
  Clock,
  FolderOpen,
} from 'lucide-react'

const recentNotes = [
  { title: 'Daily Log - Apr 14', path: 'daily/2026-04-14.md', updated: '2 hours ago' },
  { title: 'Health Tracking', path: 'health/overview.md', updated: 'yesterday' },
  { title: 'Investment Portfolio', path: 'finance/portfolio.md', updated: '3 days ago' },
  { title: 'Book Notes — Atomic Habits', path: 'learning/atomic-habits.md', updated: '1 week ago' },
]

const folders = [
  { name: 'Daily', count: 142 },
  { name: 'Health', count: 23 },
  { name: 'Finance', count: 18 },
  { name: 'Learning', count: 47 },
  { name: 'Work', count: 31 },
  { name: 'Personal', count: 56 },
]

export default function VaultPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Top bar */}
      <header className="border-b shrink-0">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-semibold text-sm">personal-md</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">vault</span>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r flex flex-col shrink-0">
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground"
              size="sm"
            >
              <Search className="h-3.5 w-3.5" />
              Search notes...
            </Button>
          </div>
          <Separator />
          <div className="flex-1 overflow-auto p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="New folder">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <nav className="space-y-0.5">
              {folders.map(({ name, count }) => (
                <Link
                  key={name}
                  href={`/vault/${name.toLowerCase()}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </Link>
              ))}
            </nav>
          </div>
          <Separator />
          <div className="p-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <GitBranch className="h-3 w-3" />
            <span>main</span>
            <span>·</span>
            <span className="text-green-500">synced</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">Your vault</h1>
                <p className="text-muted-foreground text-sm mt-1">317 notes across 6 folders</p>
              </div>
              <Button>
                <Plus className="h-4 w-4" />
                New note
              </Button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Recent notes</h2>
              </div>
              <div className="space-y-1">
                {recentNotes.map(({ title, path, updated }) => (
                  <Link
                    key={path}
                    href={`/vault/${path}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">{path}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{updated}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

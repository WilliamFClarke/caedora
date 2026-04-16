'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, LogOut, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileTree } from './file-tree'
import { ModeToggle } from '@/components/mode-toggle'
import { useVault } from '@/lib/vault-context'
import type { FileEntry } from '@/lib/types'

interface SidebarProps {
  entries: FileEntry[]
  selected: string | null
  onSelect: (path: string) => void
  onCreateNote: () => void
}

export function Sidebar({ entries, selected, onSelect, onCreateNote }: SidebarProps) {
  const router = useRouter()
  const { disconnect, status } = useVault()
  const [search, setSearch] = useState('')

  function onDisconnect() {
    disconnect()
    router.push('/')
  }

  const vaultLabel =
    status.state === 'ready' && status.providerType === 'github'
      ? 'GitHub vault'
      : 'Local vault'

  return (
    <aside className="bg-muted/30 flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4" />
          <span className="text-sm font-semibold">personal-md</span>
        </div>
        <ModeToggle />
      </div>

      <div className="flex flex-col gap-2 border-b p-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
        <Button size="sm" variant="ghost" className="justify-start" onClick={onCreateNote}>
          <Plus className="size-3.5" />
          New note
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <FileTree
          entries={entries}
          selected={selected}
          search={search}
          onSelect={onSelect}
        />
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <span className="text-muted-foreground text-xs">{vaultLabel}</span>
        <button
          type="button"
          onClick={onDisconnect}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          aria-label="Close vault"
        >
          <LogOut className="size-3" />
          Close
        </button>
      </div>
    </aside>
  )
}

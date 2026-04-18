'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronRight,
  FileText,
  FilePlus,
  Folder,
  FolderPlus,
  GitBranch,
  Hash,
  Inbox,
  Sparkles,
  LogOut,
  Pencil,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ModeToggle } from '@/components/mode-toggle'
import { ConnectAiDialog } from './connect-ai-dialog'
import { useVault } from '@/lib/vault-context'
import type { FileEntry, VaultProvider } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from '@/components/ui/sidebar'

interface AppSidebarProps {
  entries: FileEntry[]
  selected: string | null
  provider: VaultProvider
  pinned: Set<string>
  onTogglePin: (path: string) => void
  onSelect: (path: string) => void
  onCreateFile: (parent: string, name: string) => Promise<void>
  onCreateFolder: (parent: string, name: string) => void
  onRenamePath: (from: string, to: string) => Promise<void>
  onDeletePath: (path: string) => Promise<void>
}

interface TreeNodeT {
  name: string
  path: string
  type: 'file' | 'dir'
  children: TreeNodeT[]
}

function buildTree(entries: FileEntry[]): TreeNodeT {
  const root: TreeNodeT = { name: '', path: '', type: 'dir', children: [] }
  const dirMap = new Map<string, TreeNodeT>()
  dirMap.set('', root)
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path))
  for (const e of sorted) {
    const parts = e.path.split('/')
    let parentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      parentPath = parentPath ? `${parentPath}/${parts[i]}` : parts[i]
      if (!dirMap.has(parentPath)) {
        const node: TreeNodeT = {
          name: parts[i],
          path: parentPath,
          type: 'dir',
          children: [],
        }
        dirMap.get(parentPath.split('/').slice(0, -1).join('/'))?.children.push(node)
        dirMap.set(parentPath, node)
      }
    }
    if (e.type === 'dir') {
      if (!dirMap.has(e.path)) {
        const node: TreeNodeT = {
          name: e.path.split('/').pop() ?? e.path,
          path: e.path,
          type: 'dir',
          children: [],
        }
        const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
        parent.children.push(node)
        dirMap.set(e.path, node)
      }
    } else {
      const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
      parent.children.push({
        name: parts[parts.length - 1],
        path: e.path,
        type: 'file',
        children: [],
      })
    }
  }
  function sortNode(n: TreeNodeT) {
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.forEach(sortNode)
  }
  sortNode(root)
  return root
}

function folderIconFor(name: string) {
  const n = name.toLowerCase()
  if (n === 'daily' || n === 'journal') return Calendar
  if (n === 'meetings' || n === 'inbox') return Inbox
  if (n === 'reading' || n === 'tags') return Hash
  return Folder
}

function displayName(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

function nextUntitledFromTree(children: TreeNodeT[], kind: 'file' | 'folder'): string {
  const names = new Set(children.map((c) => c.name))
  for (let i = 1; i < 1000; i++) {
    const base = `Untitled ${i}`
    const candidate = kind === 'file' ? `${base}.md` : base
    if (!names.has(candidate)) return base
  }
  return `Untitled ${Date.now()}`
}

export function AppSidebar({
  entries,
  selected,
  provider,
  pinned,
  onTogglePin,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRenamePath,
  onDeletePath,
}: AppSidebarProps) {
  const router = useRouter()
  const { disconnect, status } = useVault()
  const [search, setSearch] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [creating, setCreating] = useState<{ parent: string; kind: 'file' | 'folder' } | null>(null)
  const [branch, setBranch] = useState<string>('')
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    let alive = true
    provider.currentBranch().then((b) => {
      if (alive) setBranch(b)
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [provider])

  const tree = useMemo(() => buildTree(entries), [entries])
  const lowered = search.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!lowered) return null
    return new Set(
      entries.filter((e) => e.name.toLowerCase().includes(lowered)).map((e) => e.path)
    )
  }, [entries, lowered])

  const pinnedFiles = useMemo(() => {
    const fileSet = new Set(entries.filter((e) => e.type === 'file').map((e) => e.path))
    return [...pinned].filter((p) => fileSet.has(p)).sort()
  }, [pinned, entries])

  function onDisconnect() {
    disconnect()
    router.push('/')
  }

  const vaultType = status.state === 'ready' ? status.providerType : 'local'
  const sharedRow: Omit<TreeRowProps, 'node'> = {
    selected,
    matches,
    pinned,
    onTogglePin,
    onSelect,
    renaming,
    setRenaming,
    creating,
    setCreating,
    onCreateFile,
    onCreateFolder,
    onRenamePath,
    onDeletePath,
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-sm font-mono text-[10px] font-semibold">
              pm
            </div>
            <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
              personal-md
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <ModeToggle />
          </div>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="border-border bg-background flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
            <span className="text-muted-foreground truncate">
              {vaultType === 'github' ? 'GitHub vault' : 'Local vault'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {vaultType}
            </span>
          </div>
        </div>
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {pinnedFiles.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pinnedFiles.map((path) => {
                  const name = path.split('/').pop() ?? path
                  return (
                    <SidebarMenuItem key={`pin-${path}`}>
                      <SidebarMenuButton
                        isActive={selected === path}
                        onClick={() => onSelect(path)}
                      >
                        <Star className="fill-primary text-primary" />
                        <span className="truncate">{displayName(name)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupAction
            title="New folder"
            className="right-9"
            onClick={() => setCreating({ parent: '', kind: 'folder' })}
          >
            <FolderPlus />
            <span className="sr-only">New folder</span>
          </SidebarGroupAction>
          <SidebarGroupAction
            title="New file"
            onClick={() => setCreating({ parent: '', kind: 'file' })}
          >
            <FilePlus />
            <span className="sr-only">New file</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {creating?.parent === '' && (
                <SidebarMenuItem>
                  <InlineInput
                    initial={nextUntitledFromTree(tree.children, creating.kind)}
                    selectOnFocus
                    onSubmit={async (name) => {
                      try {
                        if (creating.kind === 'file') await onCreateFile('', name)
                        else onCreateFolder('', name)
                      } finally {
                        setCreating(null)
                      }
                    }}
                    onCancel={() => setCreating(null)}
                  />
                </SidebarMenuItem>
              )}
              {tree.children.length === 0 && !creating ? (
                <p className="text-muted-foreground px-2 py-4 text-xs">
                  No notes yet. Create your first one.
                </p>
              ) : (
                tree.children.map((child) => (
                  <TreeRow key={child.path} node={child} {...sharedRow} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition group-data-[collapsible=icon]:hidden"
        >
          <Sparkles className="size-3.5" />
          Connect your AI
        </button>
        <div className="flex items-center justify-between gap-2 px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <span
              className="bg-good relative inline-flex size-1.5 rounded-full"
              aria-hidden
            >
              <span className="bg-good absolute inline-flex size-full animate-ping rounded-full opacity-60" />
            </span>
            <GitBranch className="text-muted-foreground size-3" />
            <span className="text-muted-foreground truncate font-mono text-[10px]">
              {branch || '…'}
            </span>
          </div>
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
      </SidebarFooter>
      <SidebarRail />
      <ConnectAiDialog open={aiOpen} onOpenChange={setAiOpen} provider={provider} />
    </Sidebar>
  )
}

interface TreeRowProps {
  node: TreeNodeT
  selected: string | null
  matches: Set<string> | null
  pinned: Set<string>
  onTogglePin: (path: string) => void
  onSelect: (path: string) => void
  renaming: string | null
  setRenaming: (path: string | null) => void
  creating: { parent: string; kind: 'file' | 'folder' } | null
  setCreating: (v: { parent: string; kind: 'file' | 'folder' } | null) => void
  onCreateFile: (parent: string, name: string) => Promise<void>
  onCreateFolder: (parent: string, name: string) => void
  onRenamePath: (from: string, to: string) => Promise<void>
  onDeletePath: (path: string) => Promise<void>
}

function TreeRow(props: TreeRowProps) {
  const { node, matches } = props
  if (matches && !containsMatch(node, matches)) return null
  if (node.type === 'dir') return <FolderRow {...props} />
  return <FileRow {...props} />
}

function FolderRow(props: TreeRowProps) {
  const {
    node,
    renaming,
    setRenaming,
    creating,
    setCreating,
    onCreateFile,
    onCreateFolder,
    onRenamePath,
    onDeletePath,
  } = props
  const [open, setOpen] = useState(true)
  const isRenaming = renaming === node.path
  const Icon = folderIconFor(node.name)

  return (
    <SidebarMenuItem>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="group/collapsible [&[data-state=open]>div>button>svg:first-child]:rotate-90"
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="relative">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <ChevronRight className="transition-transform" />
                  <Icon className="text-muted-foreground" />
                  {isRenaming ? (
                    <InlineInput
                      initial={node.name}
                      onSubmit={async (name) => {
                        setRenaming(null)
                        const parent = node.path.split('/').slice(0, -1).join('/')
                        const to = parent ? `${parent}/${name}` : name
                        if (to !== node.path) await onRenamePath(node.path, to)
                      }}
                      onCancel={() => setRenaming(null)}
                    />
                  ) : (
                    <span className="truncate">{node.name}</span>
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                setOpen(true)
                setCreating({ parent: node.path, kind: 'file' })
              }}
            >
              <FilePlus />
              New file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                setOpen(true)
                setCreating({ parent: node.path, kind: 'folder' })
              }}
            >
              <FolderPlus />
              New folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => setRenaming(node.path)}>
              <Pencil />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onSelect={() => {
                void onDeletePath(node.path)
              }}
            >
              <Trash2 />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            {creating?.parent === node.path && (
              <SidebarMenuItem>
                <InlineInput
                  initial={nextUntitledFromTree(node.children, creating.kind)}
                  selectOnFocus
                  onSubmit={async (name) => {
                    try {
                      if (creating.kind === 'file') await onCreateFile(node.path, name)
                      else onCreateFolder(node.path, name)
                    } finally {
                      setCreating(null)
                    }
                  }}
                  onCancel={() => setCreating(null)}
                />
              </SidebarMenuItem>
            )}
            {node.children.map((c) => {
              const { node: _n, ...rest } = props
              void _n
              return <TreeRow key={c.path} node={c} {...rest} />
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

function FileRow(props: TreeRowProps) {
  const {
    node,
    selected,
    pinned,
    onTogglePin,
    onSelect,
    renaming,
    setRenaming,
    onRenamePath,
    onDeletePath,
  } = props
  const isRenaming = renaming === node.path
  const isSel = selected === node.path
  const isPinned = pinned.has(node.path)

  return (
    <SidebarMenuItem className="group/file">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            isActive={isSel}
            onClick={() => {
              if (!isRenaming) onSelect(node.path)
            }}
          >
            <FileText />
            {isRenaming ? (
              <InlineInput
                initial={displayName(node.name)}
                onSubmit={async (name) => {
                  setRenaming(null)
                  const parent = node.path.split('/').slice(0, -1).join('/')
                  const rawName = name.endsWith('.md') ? name : `${name}.md`
                  const to = parent ? `${parent}/${rawName}` : rawName
                  if (to !== node.path) await onRenamePath(node.path, to)
                }}
                onCancel={() => setRenaming(null)}
              />
            ) : (
              <span className="truncate">{displayName(node.name)}</span>
            )}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onTogglePin(node.path)}>
            <Star className={cn(isPinned && 'fill-current')} />
            {isPinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => setRenaming(node.path)}>
            <Pencil />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              void onDeletePath(node.path)
            }}
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {!isRenaming && (
        <button
          type="button"
          aria-label={isPinned ? 'Unpin' : 'Pin'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(node.path)
          }}
          className={cn(
            'text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm opacity-0 transition group-hover/file:opacity-100',
            isPinned && 'text-primary opacity-100'
          )}
        >
          <Star className={cn('size-3', isPinned && 'fill-current')} />
        </button>
      )}
    </SidebarMenuItem>
  )
}

function InlineInput({
  initial = '',
  placeholder,
  selectOnFocus,
  onSubmit,
  onCancel,
}: {
  initial?: string
  placeholder?: string
  selectOnFocus?: boolean
  onSubmit: (name: string) => void | Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <input
      type="text"
      autoFocus
      value={value}
      placeholder={placeholder}
      onFocus={(e) => {
        if (selectOnFocus) e.currentTarget.select()
      }}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const trimmed = value.trim()
          if (trimmed) void onSubmit(trimmed)
          else onCancel()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      onBlur={() => {
        const trimmed = value.trim()
        if (trimmed && trimmed !== initial) void onSubmit(trimmed)
        else onCancel()
      }}
      className={cn(
        'bg-background h-6 flex-1 rounded-sm border px-1 text-sm outline-hidden',
        'focus-visible:ring-ring focus-visible:ring-2'
      )}
    />
  )
}

function containsMatch(node: TreeNodeT, matches: Set<string>): boolean {
  if (matches.has(node.path)) return true
  return node.children.some((c) => containsMatch(c, matches))
}

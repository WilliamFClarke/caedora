'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  FilePlus,
  Folder,
  FolderPlus,
  FolderInput,
  FolderOpen,
  Github,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  Pencil,
  Palette,
  Search,
  Star,
  Trash2,
  Wrench,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ModeToggle } from '@/components/mode-toggle'
import { ConnectAiDialog } from './connect-ai-dialog'
import { TemplateMarketplaceButton } from './template-marketplace-button'
import { SettingsDialog, type SettingsSection } from '@/components/settings-dialog'
import { useVault } from '@/lib/vault-context'
import { getActiveVaultId, listVaults } from '@/lib/storage'
import type { FileEntry, PersistedVaultState, VaultProvider } from '@/lib/types'
import { LOCKED_PATHS } from '@/lib/vault-index'
import { cn } from '@/lib/utils'
import {
  FOLDER_COLORS,
  FOLDER_ICONS,
  folderColorValue,
  folderIconComponent,
  randomFolderAppearance,
  suggestedFolderAppearance,
  type FolderAppearance,
} from '@/lib/folder-appearance'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'

interface AppSidebarProps {
  entries: FileEntry[]
  selected: string | null
  provider: VaultProvider
  pinned: Set<string>
  onTogglePin: (path: string) => void
  onSelect: (path: string) => void
  onCreateFile: (parent: string, name: string) => Promise<void>
  onCreateFolder: (parent: string, name: string, appearance: FolderAppearance) => void
  folderAppearances: Record<string, FolderAppearance>
  onSetFolderAppearance: (path: string, appearance: FolderAppearance) => void
  onSetManyFolderAppearances: (appearances: Record<string, FolderAppearance>) => void
  onTemplateImported: (paths: string[]) => void
  onTemplateImportFailed: (paths: string[]) => void
  onTemplateImportSettled: (paths: string[]) => void
  onRenamePath: (from: string, to: string) => Promise<void>
  onDeletePath: (path: string) => Promise<void>
  onSync?: () => Promise<void>
}

interface TreeNodeT {
  name: string
  path: string
  type: 'file' | 'dir'
  children: TreeNodeT[]
  pending?: boolean
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
          pending: e.pending,
        }
        const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
        parent.children.push(node)
        dirMap.set(e.path, node)
      } else if (e.pending) {
        const node = dirMap.get(e.path)
        if (node) node.pending = true
      }
    } else {
      const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
      parent.children.push({
        name: parts[parts.length - 1],
        path: e.path,
        type: 'file',
        children: [],
        pending: e.pending,
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

type CreatingState = {
  parent: string
  kind: 'file' | 'folder'
  defaultName: string
  appearance?: FolderAppearance
}

type StoredVault = { id: string; state: PersistedVaultState }

export function AppSidebar({
  entries,
  selected,
  provider,
  pinned,
  onTogglePin,
  onSelect,
  onCreateFile,
  onCreateFolder,
  folderAppearances,
  onSetFolderAppearance,
  onSetManyFolderAppearances,
  onTemplateImported,
  onTemplateImportFailed,
  onTemplateImportSettled,
  onRenamePath,
  onDeletePath,
  onSync,
}: AppSidebarProps) {
  const router = useRouter()
  const { connectToVault } = useVault()
  const { state: sidebarState, setOpen: setSidebarOpen } = useSidebar()
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [creating, setCreating] = useState<CreatingState | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [vaults, setVaults] = useState<StoredVault[]>([])
  const [activeVaultId, setActiveVaultIdState] = useState<string | null>(null)
  const [switchingVaultId, setSwitchingVaultId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general')
  const [customizingFolder, setCustomizingFolder] = useState<TreeNodeT | null>(null)
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(true)

  async function refreshVaults() {
    const [stored, active] = await Promise.all([listVaults(), getActiveVaultId()])
    setVaults(stored)
    setActiveVaultIdState(active)
  }

  useEffect(() => {
    void refreshVaults()
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

  const folders = useMemo(() => {
    return entries.filter((e) => e.type === 'dir').map((e) => e.path).sort()
  }, [entries])

  const sharedRow: Omit<TreeRowProps, 'node'> = {
    selected,
    matches,
    pinned,
    onTogglePin,
    onSelect,
    renaming,
    setRenaming,
    setCreating,
    setMoving,
    setCustomizingFolder,
    onCreateFile,
    onCreateFolder,
    folderAppearances,
    onRenamePath,
    onDeletePath,
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2 pt-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/caedora-logo.png"
              alt="Caedora"
              width={20}
              height={20}
              className="size-5 shrink-0"
            />
            <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Caedora
            </span>
          </div>
          <div>
            <ModeToggle />
          </div>
        </div>
        <div className="flex items-center gap-1 px-0 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title="New file"
            aria-label="New file"
            onClick={() =>
              setCreating({
                parent: '',
                kind: 'file',
                defaultName: nextUntitledFromTree(tree.children, 'file'),
              })
            }
          >
            <FilePlus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title="New folder"
            aria-label="New folder"
            onClick={() =>
              setCreating({
                parent: '',
                kind: 'folder',
                defaultName: nextUntitledFromTree(tree.children, 'folder'),
                appearance: randomFolderAppearance(),
              })
            }
          >
            <FolderPlus className="size-4" />
          </Button>
          <TemplateMarketplaceButton
            iconOnly
            variant="ghost"
            onApplyFolderAppearances={onSetManyFolderAppearances}
            onImportedFiles={onTemplateImported}
            onImportFailed={onTemplateImportFailed}
            onImportSettled={onTemplateImportSettled}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            title="Search notes"
            aria-label="Search notes"
            aria-expanded={searchOpen}
            onClick={() => {
              if (sidebarState === 'collapsed') setSidebarOpen(true)
              setSearchOpen((open) => !open)
            }}
          >
            <Search className="size-4" />
          </Button>
        </div>
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out group-data-[collapsible=icon]:hidden',
            searchOpen ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 -translate-y-1'
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7 text-sm"
                autoFocus={searchOpen}
                tabIndex={searchOpen ? 0 : -1}
              />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:flex-1 group-data-[collapsible=icon]:overflow-hidden">
        <div className="hidden flex-1 group-data-[collapsible=icon]:block" />
        <div className="group-data-[collapsible=icon]:hidden">
        {pinnedFiles.length > 0 && (
          <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 px-2 py-1 text-xs font-medium transition-colors"
                >
                  <ChevronRight className={cn('size-3 transition-transform', pinnedOpen && 'rotate-90')} />
                  <span>Pinned</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1 data-[state=open]:fade-in">
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {pinnedFiles.length > 0 && <div className="bg-sidebar-border mx-2 h-px" />}

        <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 px-2 py-1 text-xs font-medium transition-colors"
              >
                <ChevronRight className={cn('size-3 transition-transform', filesOpen && 'rotate-90')} />
                <span>Files</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1 data-[state=open]:fade-in">
              <SidebarGroupContent>
                <SidebarMenu>
                  {tree.children.length === 0 ? (
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition group-data-[collapsible=icon]:hidden"
        >
          <Sparkles className="size-3.5" />
          Connect external AI
        </button>
        <div className="flex items-center gap-1.5 px-2 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <VaultSwitcher
            vaults={vaults}
            activeVaultId={activeVaultId}
            switchingVaultId={switchingVaultId}
            onSwitch={async (id) => {
              if (id === activeVaultId || switchingVaultId) return
              setSwitchingVaultId(id)
              try {
                await connectToVault(id)
                router.push('/vault')
                await refreshVaults()
              } finally {
                setSwitchingVaultId(null)
              }
            }}
            onManage={() => {
              setSettingsSection('vaults')
              setSettingsOpen(true)
            }}
            className="group-data-[collapsible=icon]:hidden"
          />
          <div className="hidden">
            <span
              className="bg-good relative inline-flex size-1.5 rounded-full"
              aria-hidden
            >
              <span className="bg-good absolute inline-flex size-full animate-ping rounded-full opacity-60" />
            </span>
            <FolderOpen className="text-muted-foreground size-3" />
            <span className="text-muted-foreground truncate font-mono text-[10px]">
              ...
            </span>
          </div>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
            {onSync && (
              <button
                type="button"
                onClick={async () => {
                  if (syncing) return
                  setSyncing(true)
                  try {
                    await onSync()
                  } finally {
                    setSyncing(false)
                  }
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex size-8 items-center justify-center rounded-md disabled:opacity-50"
                aria-label="Sync vault"
                title="Sync vault"
                disabled={syncing}
              >
                <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSettingsSection('general')
                setSettingsOpen(true)
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex size-8 items-center justify-center rounded-md"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
      <ConnectAiDialog open={aiOpen} onOpenChange={setAiOpen} provider={provider} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open)
          if (!open) void refreshVaults()
        }}
        initialSection={settingsSection}
      />

      <CreateItemDialog
        creating={creating}
        folders={folders}
        onSubmit={async (parent, name, appearance) => {
          if (!creating) return
          if (creating.kind === 'file') await onCreateFile(parent, name)
          else onCreateFolder(parent, name, appearance ?? randomFolderAppearance(name))
          setCreating(null)
        }}
        onClose={() => setCreating(null)}
      />

      <FolderAppearanceDialog
        folder={customizingFolder}
        appearance={
          customizingFolder
            ? folderAppearances[customizingFolder.path] ?? suggestedFolderAppearance(customizingFolder.path)
            : null
        }
        onSubmit={(appearance) => {
          if (!customizingFolder) return
          onSetFolderAppearance(customizingFolder.path, appearance)
          setCustomizingFolder(null)
        }}
        onClose={() => setCustomizingFolder(null)}
      />

      {moving && (
        <MoveDialog
          filePath={moving}
          folders={folders}
          onMove={async (toFolder) => {
            const name = moving.split('/').pop()!
            const dest = toFolder ? `${toFolder}/${name}` : name
            await onRenamePath(moving, dest)
            setMoving(null)
          }}
          onClose={() => setMoving(null)}
        />
      )}
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
  setCreating: (v: CreatingState | null) => void
  setMoving: (path: string | null) => void
  setCustomizingFolder: (node: TreeNodeT | null) => void
  onCreateFile: (parent: string, name: string) => Promise<void>
  onCreateFolder: (parent: string, name: string, appearance: FolderAppearance) => void
  folderAppearances: Record<string, FolderAppearance>
  onRenamePath: (from: string, to: string) => Promise<void>
  onDeletePath: (path: string) => Promise<void>
}

function VaultSwitcher({
  vaults,
  activeVaultId,
  switchingVaultId,
  onSwitch,
  onManage,
  className,
}: {
  vaults: StoredVault[]
  activeVaultId: string | null
  switchingVaultId: string | null
  onSwitch: (id: string) => Promise<void>
  onManage: () => void
  className?: string
}) {
  const activeVault = vaults.find((vault) => vault.id === activeVaultId) ?? vaults[0]
  const label = activeVault ? vaultLabel(activeVault.state) : 'Vault'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hover:bg-sidebar-accent flex h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 text-left text-sm',
            className
          )}
          aria-label="Switch vault"
        >
          <span className="truncate font-medium">{label}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        {vaults.length > 0 ? (
          vaults.map((vault) => {
            const isActive = vault.id === activeVaultId
            const isSwitching = vault.id === switchingVaultId
            return (
              <DropdownMenuItem
                key={vault.id}
                onSelect={(event) => {
                  event.preventDefault()
                  void onSwitch(vault.id)
                }}
                disabled={isActive || !!switchingVaultId}
                className="flex items-center gap-2"
              >
                {vault.state.type === 'github' ? (
                  <Github className="text-muted-foreground size-4" />
                ) : (
                  <FolderOpen className="text-muted-foreground size-4" />
                )}
                <span className="min-w-0 flex-1 truncate">{vaultLabel(vault.state)}</span>
                {isSwitching && <Loader2 className="size-3.5 animate-spin" />}
              </DropdownMenuItem>
            )
          })
        ) : (
          <DropdownMenuItem disabled>No saved vaults</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            onManage()
          }}
        >
          <Wrench className="text-muted-foreground size-4" />
          Manage vaults
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function vaultLabel(state: PersistedVaultState): string {
  if (state.type === 'github') return `${state.githubOwner}/${state.githubRepo}`
  return state.directoryHandle?.name ?? 'Local vault'
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
    setCreating,
    setCustomizingFolder,
    folderAppearances,
    onRenamePath,
    onDeletePath,
  } = props
  const [open, setOpen] = useState(true)
  const isRenaming = renaming === node.path
  const appearance = folderAppearances[node.path] ?? suggestedFolderAppearance(node.path)
  const Icon = folderIconComponent(appearance.icon)

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
                <SidebarMenuButton className={cn(node.pending && 'opacity-55')}>
                  <ChevronRight className="transition-transform" />
                  <Icon style={{ color: folderColorValue(appearance.color) }} />
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
                  {node.pending && <Loader2 className="ml-auto size-3 animate-spin" />}
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                setOpen(true)
                setCreating({
                  parent: node.path,
                  kind: 'file',
                  defaultName: nextUntitledFromTree(node.children, 'file'),
                })
              }}
            >
              <FilePlus />
              New file
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                setOpen(true)
                setCreating({
                  parent: node.path,
                  kind: 'folder',
                  defaultName: nextUntitledFromTree(node.children, 'folder'),
                  appearance: randomFolderAppearance(node.path),
                })
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
            <ContextMenuItem onSelect={() => setCustomizingFolder(node)}>
              <Palette />
              Set icon and colour
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
          <SidebarMenuSub className="mx-0 ml-3.5 px-0 pl-2.5">
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
    setMoving,
    onRenamePath,
    onDeletePath,
  } = props
  const isRenaming = renaming === node.path
  const isSel = selected === node.path
  const isPinned = pinned.has(node.path)
  const isLocked = LOCKED_PATHS.has(node.path)

  return (
    <SidebarMenuItem className="group/file">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            isActive={isSel}
            className={cn(node.pending && 'opacity-55')}
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
            {node.pending && <Loader2 className="ml-auto size-3 animate-spin" />}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {!node.pending && (
            <ContextMenuItem onSelect={() => onTogglePin(node.path)}>
              <Star className={cn(isPinned && 'fill-current')} />
              {isPinned ? 'Unpin' : 'Pin'}
            </ContextMenuItem>
          )}
          {!isLocked && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => setRenaming(node.path)}>
                <Pencil />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => setMoving(node.path)}>
                <FolderInput />
                Move to folder...
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onSelect={() => {
                  void onDeletePath(node.path)
                }}
              >
                <Trash2 />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {!isRenaming && !node.pending && (
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
  onSubmit,
  onCancel,
}: {
  initial?: string
  placeholder?: string
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
      onFocus={(e) => e.currentTarget.select()}
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

function FolderAppearanceDialog({
  folder,
  appearance,
  onSubmit,
  onClose,
}: {
  folder: TreeNodeT | null
  appearance: FolderAppearance | null
  onSubmit: (appearance: FolderAppearance) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<FolderAppearance>(appearance ?? randomFolderAppearance())

  useEffect(() => {
    if (folder && appearance) setDraft(appearance)
  }, [appearance, folder])

  return (
    <Dialog open={!!folder} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Folder appearance
          </DialogTitle>
          <DialogDescription>
            {folder ? `Set the colour and icon for "${folder.name}".` : 'Set the folder colour and icon.'}
          </DialogDescription>
        </DialogHeader>
        <FolderAppearanceFields appearance={draft} onChange={setDraft} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FolderAppearanceFields({
  appearance,
  onChange,
}: {
  appearance: FolderAppearance
  onChange: (appearance: FolderAppearance) => void
}) {
  const Icon = folderIconComponent(appearance.icon)

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-md border px-3 py-2">
        <Icon className="size-5" style={{ color: folderColorValue(appearance.color) }} />
        <span className="text-sm">{appearanceLabel(appearance)}</span>
      </div>

      <div className="grid gap-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {FOLDER_COLORS.map((color) => {
            const selected = appearance.color === color.id
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onChange({ ...appearance, color: color.id })}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md border transition',
                  selected ? 'border-foreground' : 'border-border hover:border-foreground/50'
                )}
                aria-label={`Use ${color.name}`}
                title={color.name}
              >
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: color.value }}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Icon</Label>
        <div className="grid grid-cols-8 gap-1.5">
          {FOLDER_ICONS.map((item) => {
            const selected = appearance.icon === item.id
            const OptionIcon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ ...appearance, icon: item.id })}
                className={cn(
                  'flex size-8 items-center justify-center rounded-md border transition',
                  selected ? 'border-foreground bg-accent' : 'border-border hover:border-foreground/50'
                )}
                aria-label={`Use ${item.name} icon`}
                title={item.name}
              >
                {selected ? (
                  <Check className="size-3.5" />
                ) : (
                  <OptionIcon className="size-3.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function appearanceLabel(appearance: FolderAppearance): string {
  const color = FOLDER_COLORS.find((item) => item.id === appearance.color)?.name ?? 'Custom'
  const icon = FOLDER_ICONS.find((item) => item.id === appearance.icon)?.name ?? 'Folder'
  return `${color} ${icon}`
}

function CreateItemDialog({
  creating,
  folders,
  onSubmit,
  onClose,
}: {
  creating: CreatingState | null
  folders: string[]
  onSubmit: (parent: string, name: string, appearance?: FolderAppearance) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [parent, setParent] = useState('')
  const [appearance, setAppearance] = useState<FolderAppearance>(randomFolderAppearance())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) {
      setValue(creating.defaultName)
      setParent('')
      setAppearance(creating.appearance ?? randomFolderAppearance(creating.defaultName))
      setError(null)
      setBusy(false)
      const t = setTimeout(() => inputRef.current?.select(), 80)
      return () => clearTimeout(t)
    }
  }, [creating])

  const isFile = creating?.kind === 'file'
  const label = isFile ? 'Note name' : 'Folder name'
  const title = isFile ? 'New note' : 'New folder'
  const description = 'Choose where to create it. New items default to the vault root.'

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(parent, trimmed, isFile ? undefined : appearance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!creating} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFile ? <FileText className="size-4" /> : <Folder className="size-4" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-item-name">{label}</Label>
            <Input
              ref={inputRef}
              id="create-item-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isFile ? 'My note' : 'My folder'}
              autoComplete="off"
              disabled={busy}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-item-parent">Location</Label>
            <select
              id="create-item-parent"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              disabled={busy}
              className={cn(
                'border-input bg-background ring-offset-background h-9 rounded-md border px-3 text-sm shadow-xs outline-hidden',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
              )}
            >
              <option value=""></option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>
          {!isFile && (
            <FolderAppearanceFields
              appearance={appearance}
              onChange={setAppearance}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !value.trim()}>
              {isFile ? 'Create note' : 'Create folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoveDialog({
  filePath,
  folders,
  onMove,
  onClose,
}: {
  filePath: string
  folders: string[]
  onMove: (toFolder: string) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const currentFolder = filePath.includes('/')
    ? filePath.split('/').slice(0, -1).join('/')
    : ''
  const fileName = filePath.split('/').pop() ?? filePath
  const options = ['', ...folders].filter((f) => f !== currentFolder)

  async function handleMove() {
    setBusy(true)
    try {
      await onMove(selected)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-4" />
            Move &ldquo;{displayName(fileName)}&rdquo;
          </DialogTitle>
          <DialogDescription>Choose where to move this note.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {options.map((folder) => (
            <button
              key={folder || '__root__'}
              type="button"
              onClick={() => setSelected(folder)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left',
                selected === folder
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-foreground'
              )}
            >
              <Folder className="size-3.5 shrink-0" />
              <span className="truncate">{folder || '/ (root)'}</span>
            </button>
          ))}
          {options.length === 0 && (
            <p className="text-muted-foreground py-3 text-center text-sm">
              No other folders to move to.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={busy || options.length === 0}>
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function containsMatch(node: TreeNodeT, matches: Set<string>): boolean {
  if (matches.has(node.path)) return true
  return node.children.some((c) => containsMatch(c, matches))
}

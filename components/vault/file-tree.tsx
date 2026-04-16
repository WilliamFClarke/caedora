'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileEntry } from '@/lib/types'

interface FileTreeProps {
  entries: FileEntry[]
  selected: string | null
  search: string
  onSelect: (path: string) => void
}

interface Node {
  name: string
  path: string
  type: 'file' | 'dir'
  children: Node[]
}

function buildTree(entries: FileEntry[]): Node {
  const root: Node = { name: '', path: '', type: 'dir', children: [] }
  const dirMap = new Map<string, Node>()
  dirMap.set('', root)

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path))
  for (const e of sorted) {
    const parts = e.path.split('/')
    let parentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      parentPath = parentPath ? `${parentPath}/${parts[i]}` : parts[i]
      if (!dirMap.has(parentPath)) {
        const node: Node = {
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
        const node: Node = { name: e.path.split('/').pop() ?? e.path, path: e.path, type: 'dir', children: [] }
        const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
        parent.children.push(node)
        dirMap.set(e.path, node)
      }
    } else {
      const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root
      parent.children.push({ name: parts[parts.length - 1], path: e.path, type: 'file', children: [] })
    }
  }

  // Dirs first, then files; alphabetical
  function sortNode(n: Node) {
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.forEach(sortNode)
  }
  sortNode(root)
  return root
}

export function FileTree({ entries, selected, search, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(entries), [entries])
  const lowered = search.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!lowered) return null
    return new Set(entries.filter((e) => e.name.toLowerCase().includes(lowered)).map((e) => e.path))
  }, [entries, lowered])

  if (tree.children.length === 0) {
    return (
      <p className="text-muted-foreground px-2 py-4 text-xs">
        No notes yet. Create your first one.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {tree.children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          selected={selected}
          matches={matches}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  selected,
  matches,
  onSelect,
  depth,
}: {
  node: Node
  selected: string | null
  matches: Set<string> | null
  onSelect: (path: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(depth === 0)

  if (matches) {
    // Filter-aware rendering
    const hasMatchInside = matches.has(node.path) || containsMatch(node, matches)
    if (!hasMatchInside) return null
  }

  if (node.type === 'dir') {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="hover:bg-accent flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-sm"
          style={{ paddingLeft: `${0.375 + depth * 0.75}rem` }}
        >
          <ChevronRight
            className={cn(
              'size-3 transition-transform',
              expanded && 'rotate-90'
            )}
          />
          {expanded ? (
            <FolderOpen className="size-3.5" />
          ) : (
            <Folder className="size-3.5" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((c) => (
              <TreeNode
                key={c.path}
                node={c}
                selected={selected}
                matches={matches}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isSel = selected === node.path
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        'hover:bg-accent flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm',
        isSel && 'bg-accent text-accent-foreground font-medium'
      )}
      style={{ paddingLeft: `${1.125 + depth * 0.75}rem` }}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{displayName(node.name)}</span>
    </button>
  )
}

function containsMatch(node: Node, matches: Set<string>): boolean {
  if (matches.has(node.path)) return true
  return node.children.some((c) => containsMatch(c, matches))
}

function displayName(name: string): string {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

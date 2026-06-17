'use client'

import { useEffect, useMemo, useState } from 'react'
import { LocateFixed, Network, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OkfConceptSummary } from '@/lib/okf'
import { backlinksFor } from '@/lib/okf'
import { cn } from '@/lib/utils'

interface LinkGraphPanelProps {
  open: boolean
  currentPath: string | null
  conceptCatalog: Record<string, OkfConceptSummary>
  onOpenConcept: (path: string) => void
  onClose: () => void
}

type GraphNode = OkfConceptSummary & {
  x: number
  y: number
  degree: number
}

type GraphEdge = {
  id: string
  source: string
  target: string
}

const MIN_HEIGHT = 260
const STATUS_BAR_OFFSET = 34

export function LinkGraphPanel({
  open,
  currentPath,
  conceptCatalog,
  onOpenConcept,
  onClose,
}: LinkGraphPanelProps) {
  const [height, setHeight] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedPath, setSelectedPath] = useState<string | null>(currentPath)

  useEffect(() => {
    setSelectedPath(currentPath)
  }, [currentPath])

  const allConcepts = useMemo(
    () => Object.values(conceptCatalog).sort((a, b) => a.title.localeCompare(b.title)),
    [conceptCatalog]
  )
  const selected = (selectedPath && conceptCatalog[selectedPath]) || (currentPath && conceptCatalog[currentPath]) || null
  const conceptTypes = useMemo(
    () => [...new Set(allConcepts.map((concept) => concept.type).filter(Boolean))].sort(),
    [allConcepts]
  )

  const graph = useMemo(
    () => buildGraph(allConcepts, query, typeFilter, currentPath),
    [allConcepts, currentPath, query, typeFilter]
  )

  const outgoing = selected?.links.filter((link) => !link.external && link.targetPath) ?? []
  const incoming = selected ? backlinksFor(selected.path, conceptCatalog) : []

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const panel = event.currentTarget.closest('aside')
    const workspace = event.currentTarget.closest('.caedora-vault-workspace')
    const startHeight = panel?.getBoundingClientRect().height ?? window.innerHeight / 2
    const parentHeight = workspace?.getBoundingClientRect().height ?? window.innerHeight
    const maxHeight = Math.max(MIN_HEIGHT, parentHeight - 96)

    const onMove = (moveEvent: PointerEvent) => {
      const next = startHeight + startY - moveEvent.clientY
      setHeight(Math.min(maxHeight, Math.max(MIN_HEIGHT, next)))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  return (
    <aside
      className={cn(
        'bg-card/98 border-border absolute right-0 left-0 z-30 flex flex-col border-t shadow-2xl backdrop-blur transition-transform duration-250 ease-out',
        open ? 'translate-y-0' : 'pointer-events-none translate-y-[calc(100%+34px)]'
      )}
      style={{ height: height ?? '50%', bottom: STATUS_BAR_OFFSET }}
      aria-hidden={!open}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize link map"
        className="group flex h-3 cursor-ns-resize items-center justify-center"
        onPointerDown={startResize}
      >
        <span className="bg-muted-foreground/40 group-hover:bg-muted-foreground/70 h-1 w-12 rounded-full transition" />
      </div>

      <header className="border-border flex shrink-0 items-center gap-3 border-b px-4 pb-3">
        <div className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-md">
          <Network className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Concept link map</p>
          <p className="text-muted-foreground truncate text-xs">
            {graph.nodes.length} concepts · {graph.edges.length} links
          </p>
        </div>
        <div className="relative hidden w-56 md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search graph"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          aria-label="Filter by concept type"
        >
          <option value="all">All types</option>
          {conceptTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedPath(currentPath)} aria-label="Focus current concept">
          <LocateFixed className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close link map">
          <X className="size-4" />
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
        <GraphCanvas
          nodes={graph.nodes}
          edges={graph.edges}
          selectedPath={selected?.path ?? currentPath}
          onSelect={setSelectedPath}
          onOpenConcept={onOpenConcept}
        />
        <DetailPane
          selected={selected}
          conceptCatalog={conceptCatalog}
          outgoing={outgoing}
          incoming={incoming}
          onOpenConcept={onOpenConcept}
        />
      </div>
    </aside>
  )
}

function GraphCanvas({
  nodes,
  edges,
  selectedPath,
  onSelect,
  onOpenConcept,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onOpenConcept: (path: string) => void
}) {
  const byPath = new Map(nodes.map((node) => [node.path, node]))

  return (
    <div className="bg-background relative min-h-0 overflow-hidden">
      <svg className="h-full w-full" viewBox="0 0 1000 620" role="img" aria-label="Concept link map">
        <defs>
          <marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground/45" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const source = byPath.get(edge.source)
          const target = byPath.get(edge.target)
          if (!source || !target) return null
          const selected = edge.source === selectedPath || edge.target === selectedPath
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={cn(selected ? 'stroke-primary/70' : 'stroke-muted-foreground/25')}
              strokeWidth={selected ? 2.4 : 1.4}
              markerEnd="url(#graph-arrow)"
            />
          )
        })}
        {nodes.map((node) => {
          const selected = node.path === selectedPath
          const radius = Math.min(28, 12 + node.degree * 2)
          return (
            <g
              key={node.path}
              className="cursor-pointer"
              onClick={() => onSelect(node.path)}
              onDoubleClick={() => onOpenConcept(node.path)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                className={cn(
                  selected ? 'fill-primary stroke-primary' : 'fill-card stroke-border',
                  'transition-colors'
                )}
                strokeWidth={selected ? 4 : 2}
              />
              <text
                x={node.x}
                y={node.y + radius + 15}
                textAnchor="middle"
                className={cn(
                  'fill-foreground text-[13px] font-medium',
                  selected && 'fill-primary'
                )}
              >
                {truncateLabel(node.title)}
              </text>
              <text
                x={node.x}
                y={node.y + radius + 29}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {node.type}
              </text>
            </g>
          )
        })}
      </svg>
      {nodes.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          No concepts match the current filters.
        </div>
      )}
    </div>
  )
}

function DetailPane({
  selected,
  conceptCatalog,
  outgoing,
  incoming,
  onOpenConcept,
}: {
  selected: OkfConceptSummary | null
  conceptCatalog: Record<string, OkfConceptSummary>
  outgoing: NonNullable<OkfConceptSummary['links']>
  incoming: OkfConceptSummary[]
  onOpenConcept: (path: string) => void
}) {
  if (!selected) {
    return (
      <aside className="border-border bg-card hidden min-h-0 overflow-y-auto border-l p-4 md:block">
        <p className="text-muted-foreground text-sm">Select a node to inspect its links.</p>
      </aside>
    )
  }

  return (
    <aside className="border-border bg-card hidden min-h-0 overflow-y-auto border-l p-4 md:block">
      <div className="mb-4">
        <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-mono text-[10px] uppercase">
          {selected.type}
        </span>
        <h2 className="mt-2 text-lg font-semibold">{selected.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{selected.description || selected.path}</p>
        <Button className="mt-3" size="sm" onClick={() => onOpenConcept(selected.path)}>
          Open concept
        </Button>
      </div>
      <LinkList
        title="Outgoing"
        items={outgoing.map((link) => ({
          path: link.targetPath,
          title: link.targetPath ? conceptCatalog[link.targetPath]?.title ?? link.label : link.label,
          fallback: link.href,
        }))}
        onOpenConcept={onOpenConcept}
      />
      <LinkList
        title="Backlinks"
        items={incoming.map((concept) => ({
          path: concept.path,
          title: concept.title,
          fallback: concept.path,
        }))}
        onOpenConcept={onOpenConcept}
      />
    </aside>
  )
}

function LinkList({
  title,
  items,
  onOpenConcept,
}: {
  title: string
  items: Array<{ path: string | null; title: string; fallback: string }>
  onOpenConcept: (path: string) => void
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-muted-foreground font-mono text-xs">{items.length}</span>
      </div>
      <div className="grid gap-1.5">
        {items.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-xs">None yet.</p>
        ) : (
          items.map((item) => (
            <button
              key={`${item.path ?? item.fallback}-${item.title}`}
              type="button"
              disabled={!item.path}
              onClick={() => {
                if (item.path) onOpenConcept(item.path)
              }}
              className="hover:bg-accent disabled:text-muted-foreground rounded-md border px-3 py-2 text-left text-sm disabled:cursor-not-allowed"
            >
              <span className="block truncate">{item.title || item.fallback}</span>
              <span className="text-muted-foreground block truncate font-mono text-[10px]">{item.path ?? item.fallback}</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function buildGraph(
  concepts: OkfConceptSummary[],
  query: string,
  typeFilter: string,
  currentPath: string | null
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const normalizedQuery = query.trim().toLowerCase()
  const visible = concepts.filter((concept) => {
    const matchesType = typeFilter === 'all' || concept.type === typeFilter
    if (!matchesType) return false
    if (!normalizedQuery) return true
    return (
      concept.title.toLowerCase().includes(normalizedQuery) ||
      concept.path.toLowerCase().includes(normalizedQuery) ||
      concept.type.toLowerCase().includes(normalizedQuery) ||
      concept.tags.some((tag) => tag.includes(normalizedQuery))
    )
  })

  const visiblePaths = new Set(visible.map((concept) => concept.path))
  if (currentPath && !visiblePaths.has(currentPath)) {
    const current = concepts.find((concept) => concept.path === currentPath)
    if (current) {
      visible.unshift(current)
      visiblePaths.add(current.path)
    }
  }

  const degree = new Map<string, number>()
  const edges: GraphEdge[] = []
  for (const concept of concepts) {
    for (const link of concept.links) {
      if (!link.targetPath) continue
      if (!visiblePaths.has(concept.path) || !visiblePaths.has(link.targetPath)) continue
      edges.push({
        id: `${concept.path}->${link.targetPath}->${edges.length}`,
        source: concept.path,
        target: link.targetPath,
      })
      degree.set(concept.path, (degree.get(concept.path) ?? 0) + 1)
      degree.set(link.targetPath, (degree.get(link.targetPath) ?? 0) + 1)
    }
  }

  const count = Math.max(visible.length, 1)
  const centerX = 500
  const centerY = 300
  const radiusX = 360
  const radiusY = 205
  const nodes = visible.map((concept, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    const isCurrent = concept.path === currentPath
    return {
      ...concept,
      degree: degree.get(concept.path) ?? 0,
      x: isCurrent ? centerX : centerX + Math.cos(angle) * radiusX,
      y: isCurrent ? centerY : centerY + Math.sin(angle) * radiusY,
    }
  })

  return { nodes, edges }
}

function truncateLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 21)}…` : label
}

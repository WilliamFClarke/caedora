'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ExternalLink,
  Link2,
  Plus,
  Star,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeTag, type Frontmatter } from '@/lib/frontmatter'
import type { OkfConceptSummary } from '@/lib/okf'
import { cn } from '@/lib/utils'

const STANDARD_FRONTMATTER_KEYS = new Set([
  'type',
  'title',
  'description',
  'resource',
  'tags',
  'timestamp',
])

interface NoteMetaProps {
  metadata: Frontmatter
  fallbackTitle: string
  onMetadataChange: (next: Frontmatter) => void
  links: OkfConceptSummary['links']
  backlinks: OkfConceptSummary[]
  currentPath: string
  conceptCatalog: Record<string, OkfConceptSummary>
  onInsertConceptLink: (concept: OkfConceptSummary) => void
  isPinned: boolean
  onTogglePin: () => void
}

export function NoteMeta({
  metadata,
  fallbackTitle,
  onMetadataChange,
  links,
  backlinks,
  currentPath,
  conceptCatalog,
  onInsertConceptLink,
  isPinned,
  onTogglePin,
}: NoteMetaProps) {
  const [expanded, setExpanded] = useState(false)
  const update = (patch: Partial<Frontmatter>) => {
    onMetadataChange({
      ...metadata,
      ...patch,
      timestamp: patch.timestamp ?? new Date().toISOString(),
    })
  }

  return (
    <section
      className="mx-auto w-full max-w-[90ch] px-8 pt-16 pb-0"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <input
            aria-label="Concept title"
            value={metadata.title}
            onChange={(event) => update({ title: event.target.value })}
            placeholder={fallbackTitle || 'Untitled'}
            className="text-foreground placeholder:text-muted-foreground/55 m-0 h-auto w-full border-0 bg-transparent p-0 font-sans text-[2.5rem] leading-[1.2] font-bold tracking-normal outline-none"
          />
          <textarea
            aria-label="Concept description"
            value={metadata.description}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="One sentence that helps people and agents decide whether to open this concept."
            rows={2}
            className="text-muted-foreground mt-4 min-h-8 w-full resize-none bg-transparent p-0 text-base leading-relaxed outline-none"
          />
          <div className="mt-3">
            <TagEditor tags={metadata.tags} onChange={(tags) => update({ tags })} />
          </div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-muted-foreground hover:text-foreground mt-3 flex h-7 items-center gap-1 text-xs"
          >
            Details
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={isPinned ? 'Unpin concept' : 'Pin concept'}
          title={isPinned ? 'Unpin concept' : 'Pin concept'}
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-md transition',
            isPinned && 'text-primary hover:text-primary'
          )}
        >
          <Star className={cn('size-4', isPinned && 'fill-current')} />
        </button>
      </div>

      <div
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 -translate-y-1'
        )}
      >
        <div className="min-h-0 overflow-hidden">
        <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="concept-type">Concept type</Label>
            <Input
              id="concept-type"
              aria-label="Concept type"
              value={metadata.type}
              onChange={(event) => update({ type: event.target.value })}
              placeholder="Reference"
              className="font-mono text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="concept-timestamp">Last meaningful change</Label>
            <Input
              id="concept-timestamp"
              value={metadata.timestamp}
              onChange={(event) => update({ timestamp: event.target.value })}
              placeholder="2026-05-28T14:30:00Z"
              className="font-mono text-xs"
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="concept-resource">Canonical resource</Label>
            <div className="relative">
              <Input
                id="concept-resource"
                value={metadata.resource}
                onChange={(event) => update({ resource: event.target.value })}
                placeholder="https://example.com/resource"
                className="pr-9 font-mono text-xs"
              />
              {safeResourceHref(metadata.resource) && (
                <a
                  href={safeResourceHref(metadata.resource) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open canonical resource"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
          <CustomFieldsEditor
            extra={metadata.extra}
            onChange={(extra) => update({ extra })}
          />
          <RelationshipList title="Links from this concept" links={links} />
          <RelationshipList
            title="Backlinks"
            links={backlinks.map((concept) => ({
              label: concept.title,
              href: `/${concept.path}`,
              targetPath: concept.path,
              targetId: concept.id,
              external: false,
            }))}
          />
          <ConceptLinkPicker
            currentPath={currentPath}
            conceptCatalog={conceptCatalog}
            onInsert={onInsertConceptLink}
          />
        </div>
        </div>
      </div>
    </section>
  )
}

function safeResourceHref(resource: string): string | null {
  if (!resource.trim()) return null
  try {
    const url = new URL(resource)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function RelationshipList({
  title,
  links,
}: {
  title: string
  links: OkfConceptSummary['links']
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{title}</Label>
      {links.length === 0 ? (
        <p className="text-muted-foreground text-xs">None yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link, index) => {
            const href = link.targetPath ? `/vault/${link.targetPath}` : link.href
            const label = link.label || link.targetId || link.href
            return (
              <Badge key={`${link.href}-${index}`} variant="outline" asChild>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={link.targetPath ?? link.href}
                >
                  <Link2 />
                  {label}
                </a>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConceptLinkPicker({
  currentPath,
  conceptCatalog,
  onInsert,
}: {
  currentPath: string
  conceptCatalog: Record<string, OkfConceptSummary>
  onInsert: (concept: OkfConceptSummary) => void
}) {
  const [query, setQuery] = useState('')
  const options = Object.values(conceptCatalog)
    .filter((concept) => concept.path !== currentPath)
    .filter((concept) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        concept.title.toLowerCase().includes(q) ||
        concept.path.toLowerCase().includes(q) ||
        concept.type.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 6)

  return (
    <div className="grid gap-1.5 md:col-span-2">
      <Label htmlFor="concept-link-search">Add concept link</Label>
      <Input
        id="concept-link-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing a concept title or filename"
        className="text-sm"
      />
      {query.trim() && (
        <div className="border-border bg-background max-h-44 overflow-auto rounded-md border p-1">
          {options.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">No matching concepts.</p>
          ) : (
            options.map((concept) => (
              <button
                key={concept.path}
                type="button"
                onClick={() => {
                  onInsert(concept)
                  setQuery('')
                }}
                className="hover:bg-accent flex w-full min-w-0 flex-col rounded-sm px-2 py-1.5 text-left"
              >
                <span className="truncate text-sm">{concept.title}</span>
                <span className="text-muted-foreground truncate font-mono text-[10px]">
                  {concept.path}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (next: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const tag = normalizeTag(draft)
    setDraft('')
    setAdding(false)
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-accent text-accent-foreground group/tag inline-flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[11px]"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            aria-label={`Remove ${tag}`}
            className="text-muted-foreground hover:text-foreground opacity-0 transition group-hover/tag:opacity-100"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder="tag"
          className="bg-background focus-visible:ring-ring h-7 w-24 rounded-md border px-2 font-mono text-[11px] outline-none focus-visible:ring-2"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2 font-mono text-[11px] transition"
        >
          <Plus className="size-3" />
          tag
        </button>
      )}
    </div>
  )
}

function CustomFieldsEditor({
  extra,
  onChange,
}: {
  extra: Frontmatter['extra']
  onChange: (next: Frontmatter['extra']) => void
}) {
  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')
  const entries = Object.entries(extra)

  const addField = () => {
    const key = draftKey.trim()
    if (!key || STANDARD_FRONTMATTER_KEYS.has(key) || Object.hasOwn(extra, key)) return
    onChange({ ...extra, [key]: draftValue })
    setDraftKey('')
    setDraftValue('')
  }

  return (
    <div className="grid gap-2 md:col-span-2">
      <Label>Custom YAML fields</Label>
      {entries.length > 0 && (
        <div className="grid gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-2 sm:grid-cols-[minmax(8rem,12rem)_1fr_auto]">
              <Input
                value={key}
                readOnly
                aria-label={`Custom field ${key}`}
                className="font-mono text-xs"
              />
              <Input
                value={formatExtraValue(value)}
                onChange={(event) => onChange({ ...extra, [key]: event.target.value })}
                aria-label={`Value for ${key}`}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${key}`}
                onClick={() => {
                  const next = { ...extra }
                  delete next[key]
                  onChange(next)
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[minmax(8rem,12rem)_1fr_auto]">
        <Input
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addField()
            }
          }}
          placeholder="field_name"
          aria-label="New custom YAML field"
          className="font-mono text-xs"
        />
        <Input
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addField()
            }
          }}
          placeholder="value"
          aria-label="New custom YAML value"
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          disabled={
            !draftKey.trim() ||
            STANDARD_FRONTMATTER_KEYS.has(draftKey.trim()) ||
            Object.hasOwn(extra, draftKey.trim())
          }
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  )
}

function formatExtraValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

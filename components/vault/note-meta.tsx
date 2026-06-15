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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeTag, type Frontmatter } from '@/lib/frontmatter'
import type { OkfConceptSummary } from '@/lib/okf'
import { cn } from '@/lib/utils'

interface NoteMetaProps {
  metadata: Frontmatter
  onMetadataChange: (next: Frontmatter) => void
  links: OkfConceptSummary['links']
  backlinks: OkfConceptSummary[]
  isPinned: boolean
  onTogglePin: () => void
}

export function NoteMeta({
  metadata,
  onMetadataChange,
  links,
  backlinks,
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
    <section className="border-border bg-card shrink-0 border-b px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Concept title"
              value={metadata.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Concept title"
              className="h-auto border-0 px-0 py-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
            />
            <textarea
              aria-label="Concept description"
              value={metadata.description}
              onChange={(event) => update({ description: event.target.value })}
              placeholder="One sentence that helps people and agents decide whether to open this concept."
              rows={2}
              className="text-muted-foreground mt-2 min-h-6 w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={isPinned ? 'Unpin concept' : 'Pin concept'}
            title={isPinned ? 'Unpin concept' : 'Pin concept'}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-accent flex size-8 items-center justify-center rounded-md transition',
              isPinned && 'text-primary hover:text-primary'
            )}
          >
            <Star className={cn('size-4', isPinned && 'fill-current')} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            aria-label="Concept type"
            value={metadata.type}
            onChange={(event) => update({ type: event.target.value })}
            placeholder="Concept type"
            className="h-7 w-44 font-mono text-xs"
          />
          <TagEditor tags={metadata.tags} onChange={(tags) => update({ tags })} />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-muted-foreground hover:text-foreground ml-auto flex h-7 items-center gap-1 text-xs"
          >
            Details
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5">
              <Label htmlFor="concept-timestamp">Last meaningful change</Label>
              <Input
                id="concept-timestamp"
                value={metadata.timestamp}
                onChange={(event) => update({ timestamp: event.target.value })}
                placeholder="2026-06-15T12:00:00Z"
                className="font-mono text-xs"
              />
            </div>
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
            {Object.keys(metadata.extra).length > 0 && (
              <p className="text-muted-foreground text-xs md:col-span-2">
                {Object.keys(metadata.extra).length} producer-defined YAML field
                {Object.keys(metadata.extra).length === 1 ? '' : 's'} preserved.
              </p>
            )}
          </div>
        )}
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
          {links.map((link, index) => (
            <Badge key={`${link.href}-${index}`} variant="outline">
              <Link2 />
              {link.label || link.targetId || link.href}
            </Badge>
          ))}
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

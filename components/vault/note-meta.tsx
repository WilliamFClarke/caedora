'use client'

import { useState } from 'react'
import { Plus, Star, X } from 'lucide-react'
import { normalizeTag } from '@/lib/frontmatter'
import { cn } from '@/lib/utils'

interface NoteMetaProps {
  savedAt: number | null
  words: number
  readMinutes: number
  tags: string[]
  onTagsChange: (next: string[]) => void
  isPinned: boolean
  onTogglePin: () => void
}

function formatRelative(ts: number | null): string {
  if (!ts) return 'just now'
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString()
}

export function NoteMeta({
  savedAt,
  words,
  readMinutes,
  tags,
  onTagsChange,
  isPinned,
  onTogglePin,
}: NoteMetaProps) {
  return (
    <div className="note-meta relative mt-1 mb-6 select-none">
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={isPinned ? 'Unpin note' : 'Pin note'}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-accent absolute right-0 flex size-8 items-center justify-center rounded-md transition',
          isPinned && 'text-primary hover:text-primary'
        )}
        style={{ top: '-2.75rem' }}
      >
        <Star className={cn('size-4', isPinned && 'fill-current')} />
      </button>
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px]">
        <span>Edited {formatRelative(savedAt)}</span>
        <span className="text-border">·</span>
        <span>
          {words} word{words === 1 ? '' : 's'}
        </span>
        <span className="text-border">·</span>
        <span>{readMinutes} min read</span>
      </div>
      <TagEditor tags={tags} onChange={onTagsChange} />
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
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="bg-accent text-accent-foreground group/tag inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px]"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            aria-label={`Remove ${t}`}
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
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder="tag"
          className="bg-background focus-visible:ring-ring h-6 w-20 rounded-full border px-2 font-mono text-[11px] outline-none focus-visible:ring-2"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 font-mono text-[11px] transition"
        >
          <Plus className="size-2.5" />
          tag
        </button>
      )}
    </div>
  )
}

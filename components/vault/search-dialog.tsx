'use client'

import { useEffect, useMemo, useState } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { FileText } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { OkfConceptSummary } from '@/lib/okf'
import { parseSearchQuery, searchConcepts } from '@/lib/search'

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conceptCatalog: Record<string, OkfConceptSummary>
  onSelect: (path: string) => void
}

/** Opens the search dialog with Cmd+K / Ctrl+K from anywhere in the vault. */
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}

export function SearchDialog({ open, onOpenChange, conceptCatalog, onSelect }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchConcepts(conceptCatalog, query), [conceptCatalog, query])
  const terms = useMemo(() => parseSearchQuery(query).terms, [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search vault</DialogTitle>
        <DialogDescription className="sr-only">
          Search concept titles, tags and note content.
        </DialogDescription>
        <Command shouldFilter={false} className="[&_[cmdk-input]]:h-12">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search notes… (tag:name, in:folder)"
            aria-label="Search vault"
          />
          <CommandList className="max-h-[min(420px,60dvh)]">
            {query.trim() ? (
              <CommandEmpty>No matching notes.</CommandEmpty>
            ) : (
              <CommandPrimitive.Empty className="text-muted-foreground px-4 py-6 text-center text-sm">
                Type to search titles, tags and note content.
              </CommandPrimitive.Empty>
            )}
            {results.length > 0 && (
              <CommandGroup heading={`${results.length} result${results.length === 1 ? '' : 's'}`}>
                {results.map(({ concept, snippet }) => (
                  <CommandItem
                    key={concept.path}
                    value={concept.path}
                    onSelect={() => {
                      onSelect(concept.path)
                      onOpenChange(false)
                    }}
                    className="items-start"
                  >
                    <FileText className="text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate font-medium">
                          <Highlight text={concept.title} terms={terms} />
                        </span>
                        <span className="text-muted-foreground truncate text-xs">{concept.path}</span>
                      </div>
                      {snippet ? (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {snippet.before}
                          <mark className="bg-primary/15 text-foreground rounded-sm px-0.5">{snippet.match}</mark>
                          {snippet.after}
                        </p>
                      ) : concept.description ? (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          <Highlight text={concept.description} terms={terms} />
                        </p>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="bg-primary/15 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

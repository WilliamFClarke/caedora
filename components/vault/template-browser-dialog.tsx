'use client'

import { useMemo, useState } from 'react'
import { Check, Download, ExternalLink, Github, Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  CURATED_TEMPLATES,
  fetchTemplateFiles,
  loadGitHubTemplate,
  parseTemplateRepository,
  type TemplateFile,
  type TemplateImportResult,
  type VaultTemplate,
} from '@/lib/vault-templates'
import { cn } from '@/lib/utils'

interface TemplateBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: VaultTemplate, files: TemplateFile[]) => Promise<TemplateImportResult>
}

export function TemplateBrowserDialog({
  open,
  onOpenChange,
  onImport,
}: TemplateBrowserDialogProps) {
  const [query, setQuery] = useState('')
  const [repo, setRepo] = useState('')
  const [selected, setSelected] = useState<VaultTemplate>(CURATED_TEMPLATES[0])
  const [busy, setBusy] = useState<'repo' | 'import' | null>(null)
  const [result, setResult] = useState<TemplateImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return CURATED_TEMPLATES
    return CURATED_TEMPLATES.filter((template) =>
      [template.name, template.description, template.category, template.repository, ...template.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    )
  }, [query])

  async function loadRepo() {
    const repository = parseTemplateRepository(repo)
    if (!repository) {
      setError('Enter a public GitHub repo as owner/repo or a GitHub URL.')
      return
    }
    setBusy('repo')
    setError(null)
    setResult(null)
    try {
      setSelected(await loadGitHubTemplate(repository))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that template.')
    } finally {
      setBusy(null)
    }
  }

  async function importSelected() {
    setBusy('import')
    setError(null)
    setResult(null)
    try {
      const template = selected.files || selected.ref ? selected : await loadGitHubTemplate(selected.repository)
      const files = await fetchTemplateFiles(template)
      if (files.length === 0) {
        setError('No importable markdown or skill files were found.')
        return
      }
      setSelected(template)
      setResult(await onImport(template, files))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template import failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-none w-[96vw] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        <DialogTitle className="sr-only">Browse templates</DialogTitle>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[180px_1fr]">
          <div className="border-b p-2 md:border-r md:border-b-0">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className="h-8 pl-8" />
            </div>
            <div className="mt-2 flex max-h-[34vh] flex-col gap-1 overflow-y-auto pr-1 md:max-h-[58vh]">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setSelected(template)
                    setResult(null)
                    setError(null)
                  }}
                  className={cn(
                    'flex h-8 flex-col justify-center rounded-md px-2 text-left transition-colors',
                    selected.id === template.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  <span className="block truncate text-xs font-medium">{template.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 text-[10px] font-medium uppercase tracking-wide">
                <Github className="size-3.5" />
                Public repo
              </div>
              <div className="flex gap-1.5">
                <Input value={repo} onChange={(e) => setRepo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadRepo()} placeholder="owner/repo" className="h-8" />
                <Button type="button" size="sm" variant="outline" onClick={loadRepo} disabled={busy === 'repo'}>
                  {busy === 'repo' ? <Loader2 className="size-3.5 animate-spin" /> : 'Load'}
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <Badge variant="secondary">{selected.category}</Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">{selected.description}</p>
                <a href={`https://github.com/${selected.repository}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs">
                  {selected.repository}
                  <ExternalLink className="size-3" />
                </a>
              </div>

              <TemplateSection title="AI skills" items={selected.skills} empty="No skills declared." />
              <TemplateSection title="Conventions" items={selected.conventions} empty="No extra conventions declared." />
              <TemplateSection title="Tags" items={selected.tags} empty="No tags declared." />

              {result && (
                <div className="border-good/30 bg-good/5 rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Check className="size-4" />
                    Imported {result.imported.length} files
                  </div>
                  {result.skipped.length > 0 && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Skipped {result.skipped.length} existing files to avoid overwrites.
                    </p>
                  )}
                </div>
              )}
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" onClick={importSelected} disabled={busy === 'import'}>
            {busy === 'import' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Import into my vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} variant="outline" className="font-normal">{item}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm">{empty}</p>
      )}
    </section>
  )
}

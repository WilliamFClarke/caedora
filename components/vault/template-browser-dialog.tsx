'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ExternalLink, FileText, Github, Loader2, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
  const [selected, setSelected] = useState<VaultTemplate | null>(null)
  const [loadingRepo, setLoadingRepo] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ templateName: string; result: TemplateImportResult } | null>(null)
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
  const filePreview = selected?.files?.map((file) => file.path) ?? []

  async function loadRepo() {
    const repository = parseTemplateRepository(repo)
    if (!repository) {
      setError('Enter a public GitHub repo as owner/repo or a GitHub URL.')
      return
    }
    setLoadingRepo(true)
    setError(null)
    setResult(null)
    try {
      setSelected(await loadGitHubTemplate(repository))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that template.')
    } finally {
      setLoadingRepo(false)
    }
  }

  async function importTemplate(template: VaultTemplate) {
    setImportingId(template.id)
    setError(null)
    setResult(null)
    try {
      const resolved = template.files || template.ref ? template : await loadGitHubTemplate(template.repository)
      const files = await fetchTemplateFiles(resolved)
      if (files.length === 0) {
        setError('No importable markdown or skill files were found.')
        return
      }
      if (selected?.id === template.id) setSelected(resolved)
      setResult({ templateName: resolved.name, result: await onImport(resolved, files) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template import failed.')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-h-none w-[96vw] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        <DialogTitle className="sr-only">Browse templates</DialogTitle>
        {selected ? (
          <TemplateDetail
            template={selected}
            files={filePreview}
            importing={importingId === selected.id}
            result={result}
            error={error}
            onBack={() => {
              setSelected(null)
              setError(null)
              setResult(null)
            }}
            onImport={() => void importTemplate(selected)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b px-5 py-5 pr-12">
              <div className="mx-auto max-w-xl">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search templates"
                    className="h-10 rounded-full pl-10 text-center"
                  />
                </div>
              </div>

              <div className="mx-auto mt-3 flex max-w-xl gap-2">
                <div className="relative min-w-0 flex-1">
                  <Github className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void loadRepo()}
                    placeholder="Load public template repo"
                    className="h-9 pl-10"
                  />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={loadRepo} disabled={loadingRepo}>
                  {loadingRepo ? <Loader2 className="size-4 animate-spin" /> : 'Load'}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    importing={importingId === template.id}
                    onOpen={() => {
                      setSelected(template)
                      setResult(null)
                      setError(null)
                    }}
                    onImport={() => void importTemplate(template)}
                  />
                ))}
              </div>
              {templates.length === 0 && (
                <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
                  No templates match this search.
                </div>
              )}
              <TemplateFeedback result={result} error={error} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TemplateCard({
  template,
  importing,
  onOpen,
  onImport,
}: {
  template: VaultTemplate
  importing: boolean
  onOpen: () => void
  onImport: () => void
}) {
  return (
    <article className="group relative flex min-h-44 flex-col rounded-lg border bg-card text-card-foreground transition-colors hover:border-foreground/30">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col p-4 pr-12 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{template.category}</Badge>
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal">{tag}</Badge>
          ))}
        </div>
        <h2 className="mt-3 text-base font-semibold leading-tight">{template.name}</h2>
        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{template.description}</p>
      </button>
      <Button
        type="button"
        size="icon"
        className="absolute top-3 right-3 size-8"
        onClick={onImport}
        disabled={importing}
        aria-label={`Import ${template.name}`}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      </Button>
    </article>
  )
}

function TemplateDetail({
  template,
  files,
  importing,
  result,
  error,
  onBack,
  onImport,
}: {
  template: VaultTemplate
  files: string[]
  importing: boolean
  result: { templateName: string; result: TemplateImportResult } | null
  error: string | null
  onBack: () => void
  onImport: () => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-12">
      <div className="flex items-start justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Templates
        </Button>
        <Button type="button" size="icon" onClick={onImport} disabled={importing} aria-label={`Import ${template.name}`}>
          {importing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </div>

      <div className="mt-5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{template.name}</h2>
          <Badge variant="secondary">{template.category}</Badge>
        </div>
        <p className="text-muted-foreground mt-3 text-sm leading-6">{template.description}</p>
        <a href={`https://github.com/${template.repository}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground mt-3 inline-flex items-center gap-1 text-xs">
          {template.repository}
          <ExternalLink className="size-3" />
        </a>

        <div className="mt-6 grid gap-5">
          <TemplateSection title="AI skills" items={template.skills} empty="No skills declared." />
          <TemplateSection title="Conventions" items={template.conventions} empty="No extra conventions declared." />
          <TemplateSection title="Tags" items={template.tags} empty="No tags declared." />
          <TemplateFiles files={files} repository={template.repository} />
          <TemplateFeedback result={result} error={error} />
        </div>
      </div>
    </div>
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

function TemplateFeedback({
  result,
  error,
}: {
  result: { templateName: string; result: TemplateImportResult } | null
  error: string | null
}) {
  if (!result && !error) return null

  return (
    <div className="mt-4">
      {result && (
        <div className="border-good/30 bg-good/5 rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Check className="size-4" />
            Imported {result.result.imported.length} files from {result.templateName}
          </div>
          {result.result.skipped.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              Skipped {result.result.skipped.length} existing files to avoid overwrites.
            </p>
          )}
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}

function TemplateFiles({ files, repository }: { files: string[]; repository: string }) {
  if (files.length === 0) {
    return (
      <section>
        <h3 className="text-sm font-medium">Included files</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Files will be loaded from {repository} before import.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-sm font-medium">Included files</h3>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {files.map((file) => (
          <div key={file} className="bg-muted/35 flex min-w-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs">
            <FileText className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate">{file}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

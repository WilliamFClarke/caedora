'use client'

import { useCallback, useState } from 'react'
import { Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listFilesRecursive } from '@/lib/storage'
import { useVault } from '@/lib/vault-context'
import {
  importTemplateFiles,
  type TemplateFile,
  type TemplateImportResult,
  type VaultTemplate,
} from '@/lib/vault-templates'
import { TemplateBrowserDialog } from './template-browser-dialog'

export function TemplateMarketplaceButton() {
  const { provider, status } = useVault()
  const [open, setOpen] = useState(false)

  const importTemplate = useCallback(
    async (_template: VaultTemplate, files: TemplateFile[]): Promise<TemplateImportResult> => {
      if (!provider) return { imported: [], skipped: [] }
      const entries = await listFilesRecursive(provider)
      return importTemplateFiles(
        provider,
        files,
        entries.map((entry) => entry.path)
      )
    },
    [provider]
  )

  if (status.state !== 'ready' || !provider) return null

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 shadow-md"
      >
        <Library className="size-4" />
        Templates
      </Button>
      <TemplateBrowserDialog open={open} onOpenChange={setOpen} onImport={importTemplate} />
    </>
  )
}

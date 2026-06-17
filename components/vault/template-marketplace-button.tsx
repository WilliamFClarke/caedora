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
import { suggestedFolderAppearance, type FolderAppearance } from '@/lib/folder-appearance'
import { isReservedPath } from '@/lib/okf'
import { TemplateBrowserDialog } from './template-browser-dialog'
import { cn } from '@/lib/utils'
import type { ButtonProps } from '@/components/ui/button'

export function TemplateMarketplaceButton({
  className,
  iconOnly = false,
  variant = 'secondary',
  onApplyFolderAppearances,
  onImportedFiles,
  onImportFailed,
  onImportSettled,
}: {
  className?: string
  iconOnly?: boolean
  variant?: ButtonProps['variant']
  onApplyFolderAppearances?: (appearances: Record<string, FolderAppearance>) => void
  onImportedFiles?: (paths: string[]) => void
  onImportFailed?: (paths: string[]) => void
  onImportSettled?: (paths: string[]) => void
}) {
  const { provider, status } = useVault()
  const [open, setOpen] = useState(false)

  const importTemplate = useCallback(
    async (_template: VaultTemplate, files: TemplateFile[]): Promise<TemplateImportResult> => {
      if (!provider) return { imported: [], skipped: [] }
      const entries = await listFilesRecursive(provider)
      const existing = new Set(entries.map((entry) => entry.path))
      const pendingPaths = files
        .map((file) => file.path)
        .filter((path) => !existing.has(path) && !isReservedPath(path))
      onImportedFiles?.(pendingPaths)
      let result: TemplateImportResult
      try {
        result = await importTemplateFiles(provider, files, existing)
      } catch (err) {
        onImportFailed?.(pendingPaths)
        throw err
      }
      onImportSettled?.(pendingPaths)
      onApplyFolderAppearances?.(folderAppearancesForFiles(result.imported))
      return result
    },
    [onApplyFolderAppearances, onImportFailed, onImportSettled, onImportedFiles, provider]
  )

  if (status.state !== 'ready' || !provider) return null

  return (
    <>
      <Button
        type="button"
        size={iconOnly ? 'icon' : 'sm'}
        variant={variant}
        onClick={() => setOpen(true)}
        className={cn(!iconOnly && 'w-full justify-start', iconOnly && 'size-8', className)}
        aria-label="Templates"
        title="Templates"
      >
        <Library className="size-4" />
        {!iconOnly && 'Templates'}
      </Button>
      <TemplateBrowserDialog open={open} onOpenChange={setOpen} onImport={importTemplate} />
    </>
  )
}

function folderAppearancesForFiles(paths: string[]): Record<string, FolderAppearance> {
  const appearances: Record<string, FolderAppearance> = {}
  for (const path of paths) {
    const parts = path.split('/').slice(0, -1)
    for (let i = 1; i <= parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/')
      if (folderPath && !appearances[folderPath]) {
        appearances[folderPath] = suggestedFolderAppearance(folderPath)
      }
    }
  }
  return appearances
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { EditorPane } from './editor-pane'
import { useVault } from '@/lib/vault-context'
import { listFilesRecursive } from '@/lib/storage'
import type { FileEntry } from '@/lib/types'

interface VaultShellProps {
  /** Path selected from the URL (vault/[...path]). Null for /vault. */
  initialPath: string | null
}

export function VaultShell({ initialPath }: VaultShellProps) {
  const router = useRouter()
  const { provider, status } = useVault()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<string | null>(initialPath)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Redirect home if there's no vault
  useEffect(() => {
    if (status.state === 'idle' || status.state === 'permission-required') {
      router.replace('/')
    }
  }, [status.state, router])

  // Update selection when URL path changes
  useEffect(() => {
    setSelected(initialPath)
  }, [initialPath])

  const refreshEntries = useCallback(async () => {
    if (!provider) return
    try {
      const all = await listFilesRecursive(provider)
      const mdFiles = all.filter((e) => e.type === 'dir' || e.name.endsWith('.md'))
      setEntries(mdFiles)
      setLoadError(null)

      // Auto-select the first note on /vault if none is chosen
      if (!initialPath) {
        const firstFile = mdFiles.find((e) => e.type === 'file')
        if (firstFile) {
          setSelected(firstFile.path)
          router.replace(`/vault/${firstFile.path}`)
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load notes')
    }
  }, [provider, initialPath, router])

  useEffect(() => {
    void refreshEntries()
  }, [refreshEntries])

  const onSelect = useCallback(
    (path: string) => {
      setSelected(path)
      router.push(`/vault/${path}`)
    },
    [router]
  )

  const onCreateNote = useCallback(async () => {
    if (!provider) return
    const name = window.prompt('Note name', 'untitled')
    if (!name) return
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    try {
      // Check for collision
      const all = await listFilesRecursive(provider)
      if (all.some((e) => e.path === fileName)) {
        alert('A note with that name already exists.')
        return
      }
      await provider.writeFile(fileName, `# ${name.replace(/\.md$/, '')}\n\n`)
      if (!provider.writesAreCommits) {
        await provider.commit(`Create ${fileName}`, [fileName])
      }
      await refreshEntries()
      setSelected(fileName)
      router.push(`/vault/${fileName}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create note')
    }
  }, [provider, refreshEntries, router])

  if (status.state !== 'ready' || !provider) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading your vault…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        entries={entries}
        selected={selected}
        onSelect={onSelect}
        onCreateNote={onCreateNote}
      />
      <div className="flex-1 overflow-hidden">
        {loadError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-destructive text-sm">{loadError}</p>
          </div>
        ) : (
          <EditorPane provider={provider} path={selected} />
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import type { VaultProvider } from './types'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutosaveOpts {
  provider: VaultProvider | null
  path: string | null
  /** Current editor content as markdown. null = nothing loaded yet. */
  content: string | null
  /** ms to wait after last change before writing. */
  writeDebounceMs?: number
  /** ms to wait after last write before committing. Ignored when writesAreCommits. */
  commitDebounceMs?: number
}

/**
 * Debounced autosave:
 *   - writeFile after `writeDebounceMs` of idleness
 *   - commit after `commitDebounceMs` of further idleness (local provider only)
 *   - commit on blur / beforeunload of the tab
 */
export function useAutosave({
  provider,
  path,
  content,
  writeDebounceMs = 1000,
  commitDebounceMs = 30_000,
}: UseAutosaveOpts): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  const dirtyPathsRef = useRef<Set<string>>(new Set())

  // Reset saved baseline when file switches
  useEffect(() => {
    lastSavedRef.current = content
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule a debounced write whenever content changes
  useEffect(() => {
    if (!provider || !path || content === null) return
    if (content === lastSavedRef.current) return

    setStatus('saving')
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(async () => {
      try {
        await provider.writeFile(path, content)
        lastSavedRef.current = content
        dirtyPathsRef.current.add(path)
        setStatus('saved')

        // Schedule commit (local provider only — GitHub writes are commits)
        if (!provider.writesAreCommits) {
          if (commitTimer.current) clearTimeout(commitTimer.current)
          commitTimer.current = setTimeout(async () => {
            const paths = [...dirtyPathsRef.current]
            dirtyPathsRef.current.clear()
            if (paths.length === 0) return
            try {
              const msg = paths.length === 1
                ? `Update ${paths[0]}`
                : `Update ${paths.length} notes`
              await provider.commit(msg, paths)
            } catch {
              // Surface as error but don't block further writes
              setStatus('error')
            }
          }, commitDebounceMs)
        }
      } catch {
        setStatus('error')
      }
    }, writeDebounceMs)

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current)
    }
  }, [provider, path, content, writeDebounceMs, commitDebounceMs])

  // Flush commit on tab close / visibility change
  useEffect(() => {
    if (!provider || provider.writesAreCommits) return
    const flush = () => {
      if (commitTimer.current) {
        clearTimeout(commitTimer.current)
        commitTimer.current = null
      }
      const paths = [...dirtyPathsRef.current]
      dirtyPathsRef.current.clear()
      if (paths.length === 0) return
      const msg = paths.length === 1
        ? `Update ${paths[0]}`
        : `Update ${paths.length} notes`
      // Fire and forget — we can't await in beforeunload.
      void provider.commit(msg, paths)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [provider])

  return status
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultProvider } from './types'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

export interface UseAutosaveOpts {
  provider: VaultProvider | null
  path: string | null
  /** Current editor content as markdown. null = nothing loaded yet. */
  content: string | null
  /** ms to wait after last change before writing. */
  writeDebounceMs?: number
  /** ms to wait after last write before committing. Ignored when writesAreCommits. */
  commitDebounceMs?: number
  /** When true, never auto-save. Content changes are tracked but not written. */
  disabled?: boolean
}

export interface UseAutosaveResult {
  status: SyncStatus
  /** Force an immediate write + commit of any pending changes. */
  saveNow: () => Promise<void>
}

/**
 * Debounced autosave:
 *   - writeFile after `writeDebounceMs` of idleness (skipped when disabled)
 *   - commit after `commitDebounceMs` of further idleness (local provider only)
 *   - commit on blur / beforeunload of the tab
 *   - saveNow() flushes immediately regardless of disabled flag
 */
export function useAutosave({
  provider,
  path,
  content,
  writeDebounceMs = 1_000,
  commitDebounceMs = 30_000,
  disabled = false,
}: UseAutosaveOpts): UseAutosaveResult {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  const dirtyPathsRef = useRef<Set<string>>(new Set())

  // Stable refs so saveNow can always see current values without re-creating
  const providerRef = useRef(provider)
  const pathRef = useRef(path)
  const contentRef = useRef(content)
  providerRef.current = provider
  pathRef.current = path
  contentRef.current = content

  // Reset saved baseline when file switches
  useEffect(() => {
    lastSavedRef.current = content
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule a debounced write (or mark unsaved) whenever content changes
  useEffect(() => {
    if (!provider || !path || content === null) return
    if (content === lastSavedRef.current) return

    if (disabled) {
      setStatus('unsaved')
      return
    }

    setStatus('saving')
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(async () => {
      try {
        await provider.writeFile(path, content)
        lastSavedRef.current = content
        dirtyPathsRef.current.add(path)
        setStatus('saved')

        // Schedule commit (local provider only — GitHub writes are already commits)
        if (!provider.writesAreCommits) {
          if (commitTimer.current) clearTimeout(commitTimer.current)
          commitTimer.current = setTimeout(async () => {
            const paths = [...dirtyPathsRef.current]
            dirtyPathsRef.current.clear()
            if (paths.length === 0) return
            try {
              const msg =
                paths.length === 1 ? `Update ${paths[0]}` : `Update ${paths.length} notes`
              await provider.commit(msg, paths)
            } catch {
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
  }, [provider, path, content, writeDebounceMs, commitDebounceMs, disabled])

  // Flush commit on tab close / visibility change (local only)
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
      const msg = paths.length === 1 ? `Update ${paths[0]}` : `Update ${paths.length} notes`
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

  const saveNow = useCallback(async () => {
    const p = providerRef.current
    const pt = pathRef.current
    const c = contentRef.current
    if (!p || !pt || c === null) return
    if (c === lastSavedRef.current) return

    // Cancel pending timers — we're flushing now
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null }
    if (commitTimer.current) { clearTimeout(commitTimer.current); commitTimer.current = null }

    setStatus('saving')
    try {
      await p.writeFile(pt, c)
      lastSavedRef.current = c
      dirtyPathsRef.current.add(pt)

      if (!p.writesAreCommits) {
        const paths = [...dirtyPathsRef.current]
        dirtyPathsRef.current.clear()
        if (paths.length > 0) {
          const msg = paths.length === 1 ? `Update ${paths[0]}` : `Update ${paths.length} notes`
          await p.commit(msg, paths)
        }
      }
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, []) // stable — reads via refs

  return { status, saveNow }
}

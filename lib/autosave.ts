'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeDocument } from './merge'
import { isWriteConflict } from './storage/conflict'
import type { VaultProvider } from './types'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error' | 'conflict'

export interface UseAutosaveOpts {
  provider: VaultProvider | null
  path: string | null
  /** Current editor content as markdown. null = nothing loaded yet. */
  content: string | null
  /**
   * The file's text as last read from the provider. Used as the common
   * ancestor when someone else changes the file while it is being edited.
   */
  remoteContent?: string | null
  /**
   * Bumped by the caller each time it loads the file afresh. The content on
   * the render that carries a new revision becomes the saved baseline, so
   * loading never counts as an edit.
   */
  revision?: number
  /**
   * Called with new text for the open file: a merge of this edit with
   * someone else's, or their version when the person chooses Reload.
   */
  onRemoteContent?: (content: string) => void
  /** ms to wait after last change before writing. */
  writeDebounceMs?: number
  /** ms to wait after last write before committing. Ignored when writesAreCommits. */
  commitDebounceMs?: number
  /** When true, never auto-save. Content changes are tracked but not written. */
  disabled?: boolean
}

export interface SaveConflict {
  path: string
  /** Where the other change came from, e.g. "GitHub". */
  source: string
  remoteContent: string
}

export interface UseAutosaveResult {
  status: SyncStatus
  /** Force an immediate write + commit of any pending changes. */
  saveNow: () => Promise<void>
  /** Set when someone else changed the same lines; saving waits until it is resolved. */
  conflict: SaveConflict | null
  /** Drop the local edit and show the other version. */
  reloadRemote: () => void
  /** Write the local edit over the other version. */
  keepMine: () => Promise<void>
  /**
   * The file changed elsewhere: re-read it and show the new text, unless
   * there is an unsaved edit, which the next save merges instead.
   */
  checkRemote: () => Promise<void>
}

/**
 * Debounced autosave:
 *   - writeFile after `writeDebounceMs` of idleness (skipped when disabled)
 *   - commit after `commitDebounceMs` of further idleness (local provider only)
 *   - commit on blur / beforeunload of the tab
 *   - saveNow() waits for any running write, then flushes immediately
 *     regardless of disabled flag
 *   - a write that hits someone else's commit is merged and retried when the
 *     two changes touch different lines, otherwise it waits on `conflict`
 */
export function useAutosave({
  provider,
  path,
  content,
  remoteContent = null,
  revision = 0,
  onRemoteContent,
  writeDebounceMs = 1_000,
  commitDebounceMs = 30_000,
  disabled = false,
}: UseAutosaveOpts): UseAutosaveResult {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [conflict, setConflict] = useState<SaveConflict | null>(null)
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  /** The provider's copy as far as we know: what we last read or wrote. */
  const remoteBaseRef = useRef<string | null>(null)
  const remoteBasePathRef = useRef<string | null>(null)
  const dirtyPathsRef = useRef<Set<string>>(new Set())
  // The debounced write currently running, so saveNow can wait for it before
  // the caller renames or deletes the file underneath it.
  const inFlightRef = useRef<Promise<unknown>>(Promise.resolve())
  const writingRef = useRef(false)
  const conflictRef = useRef<SaveConflict | null>(null)
  conflictRef.current = conflict

  // Stable refs so saveNow can always see current values without re-creating
  const providerRef = useRef(provider)
  const pathRef = useRef(path)
  const contentRef = useRef(content)
  const onRemoteContentRef = useRef(onRemoteContent)
  providerRef.current = provider
  pathRef.current = path
  contentRef.current = content
  onRemoteContentRef.current = onRemoteContent

  // Reset saved baseline when the file switches or is loaded afresh
  useEffect(() => {
    lastSavedRef.current = content
  }, [path, revision]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setConflict(null)
  }, [path])

  const setBase = (target: string, text: string) => {
    remoteBasePathRef.current = target
    remoteBaseRef.current = text
  }

  useEffect(() => {
    remoteBaseRef.current = remoteContent
    remoteBasePathRef.current = path
  }, [remoteContent]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Writes `text` to `target`. On a conflict, merges the newest local content
   * with the other change and writes that instead. Returns false when the
   * person has to decide.
   */
  const write = useCallback(
    async (p: VaultProvider, target: string, text: string): Promise<boolean> => {
      let attempt = text
      for (let tries = 0; tries < 3; tries++) {
        try {
          const base = remoteBasePathRef.current === target ? remoteBaseRef.current : null
          await p.writeFile(target, attempt, base === null ? undefined : { baseContent: base })
          setBase(target, attempt)
          if (attempt !== text) onRemoteContentRef.current?.(attempt)
          else lastSavedRef.current = text
          return true
        } catch (error) {
          if (!isWriteConflict(error)) throw error
          const theirs = error.remoteContent
          const base = remoteBasePathRef.current === target ? remoteBaseRef.current : null
          // Typing may have continued while the write was out.
          const mine = pathRef.current === target ? contentRef.current ?? attempt : attempt
          const merged = base === null ? null : mergeDocument(base, mine, theirs)
          if (merged === null) {
            setConflict({ path: target, source: error.source, remoteContent: theirs })
            return false
          }
          setBase(target, theirs)
          if (merged === theirs) {
            // The other writer already made this exact change.
            onRemoteContentRef.current?.(theirs)
            return true
          }
          attempt = merged
        }
      }
      throw new Error(`Could not save ${target}: it keeps changing elsewhere.`)
    },
    []
  )

  // Schedule a debounced write (or mark unsaved) whenever content changes
  useEffect(() => {
    if (!provider || !path || content === null) return
    if (content === lastSavedRef.current) return
    if (conflict) return

    if (disabled) {
      setStatus('unsaved')
      return
    }

    setStatus('saving')
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(async () => {
      writeTimer.current = null
      // Keep mine or a merge may have written this already.
      if (content === lastSavedRef.current) {
        setStatus('saved')
        return
      }
      writingRef.current = true
      try {
        const run = write(provider, path, content)
        inFlightRef.current = run.catch(() => undefined)
        if (!(await run)) {
          setStatus('conflict')
          return
        }
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
      } finally {
        writingRef.current = false
      }
    }, writeDebounceMs)

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current)
    }
  }, [provider, path, content, writeDebounceMs, commitDebounceMs, disabled, conflict, write])

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
    await inFlightRef.current
    const p = providerRef.current
    const pt = pathRef.current
    const c = contentRef.current
    if (!p || !pt || c === null) return
    if (c === lastSavedRef.current) return
    if (conflictRef.current) return

    // Cancel pending timers — we're flushing now
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null }
    if (commitTimer.current) { clearTimeout(commitTimer.current); commitTimer.current = null }

    setStatus('saving')
    writingRef.current = true
    try {
      if (!(await write(p, pt, c))) {
        setStatus('conflict')
        return
      }
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
    } finally {
      writingRef.current = false
    }
  }, [write]) // stable — reads via refs

  const reloadRemote = useCallback(() => {
    const current = conflictRef.current
    if (!current) return
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null }
    setBase(current.path, current.remoteContent)
    setConflict(null)
    setStatus('saved')
    onRemoteContentRef.current?.(current.remoteContent)
  }, [])

  const keepMine = useCallback(async () => {
    const current = conflictRef.current
    const p = providerRef.current
    const c = contentRef.current
    if (!current || !p || c === null || pathRef.current !== current.path) return
    // The conflict already refreshed the provider's idea of the head, so this
    // write lands on top of the other change unless yet another one arrived.
    setBase(current.path, current.remoteContent)
    setConflict(null)
    setStatus('saving')
    writingRef.current = true
    try {
      setStatus((await write(p, current.path, c)) ? 'saved' : 'conflict')
    } catch {
      setStatus('error')
    } finally {
      writingRef.current = false
    }
  }, [write])

  const checkRemote = useCallback(async () => {
    const p = providerRef.current
    const pt = pathRef.current
    if (!p || !pt) return
    const busy = () =>
      writeTimer.current !== null ||
      writingRef.current ||
      conflictRef.current !== null ||
      (contentRef.current !== null && contentRef.current !== lastSavedRef.current)
    if (busy()) return
    let text: string
    try {
      text = await p.readFile(pt, { fresh: true })
    } catch {
      return
    }
    if (pathRef.current !== pt || busy()) return
    if (remoteBasePathRef.current === pt && text === remoteBaseRef.current) return
    setBase(pt, text)
    onRemoteContentRef.current?.(text)
  }, [])

  return { status, saveNow, conflict, reloadRemote, keepMine, checkRemote }
}

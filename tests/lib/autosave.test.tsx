// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from '@/lib/autosave'
import { MemoryProvider } from '../helpers/memory-provider'

describe('useAutosave', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces writes and commits local changes', async () => {
    vi.useFakeTimers()
    const provider = new MemoryProvider('local')
    const { rerender, result } = renderHook(
      ({ content }) =>
        useAutosave({
          provider,
          path: 'note.md',
          content,
          writeDebounceMs: 100,
          commitDebounceMs: 200,
        }),
      { initialProps: { content: 'old' } }
    )

    rerender({ content: 'new' })
    expect(result.current.status).toBe('saving')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(provider.files.get('note.md')).toBe('new')
    expect(result.current.status).toBe('saved')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(provider.commits).toEqual([{ message: 'Update note.md', paths: ['note.md'] }])
  })

  it('saveNow flushes disabled autosave immediately', async () => {
    const provider = new MemoryProvider('local')
    const { rerender, result } = renderHook(
      ({ content, disabled }) =>
        useAutosave({
          provider,
          path: 'note.md',
          content,
          disabled,
        }),
      { initialProps: { content: 'old', disabled: true } }
    )

    rerender({ content: 'new', disabled: true })
    expect(result.current.status).toBe('unsaved')
    await act(async () => {
      await result.current.saveNow()
    })
    expect(provider.files.get('note.md')).toBe('new')
    expect(provider.commits).toEqual([{ message: 'Update note.md', paths: ['note.md'] }])
    expect(result.current.status).toBe('saved')
  })

  it('skips explicit commits when writes are already commits', async () => {
    vi.useFakeTimers()
    const provider = new MemoryProvider('github')
    const { rerender } = renderHook(
      ({ content }) =>
        useAutosave({
          provider,
          path: 'note.md',
          content,
          writeDebounceMs: 100,
          commitDebounceMs: 200,
        }),
      { initialProps: { content: 'old' } }
    )

    rerender({ content: 'new' })
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    expect(provider.files.get('note.md')).toBe('new')
    expect(provider.commits).toEqual([])
  })
})

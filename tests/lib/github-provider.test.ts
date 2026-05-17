import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubProvider } from '@/lib/storage/github-provider'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GitHubProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('decodes UTF-8 file contents and reuses the SHA for writes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        name: 'note.md',
        path: 'note.md',
        type: 'file',
        size: 1,
        sha: 'sha-1',
        content: Buffer.from('Hello — café').toString('base64'),
      })
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        content: { sha: 'sha-2' },
      })
    )
    const provider = new GitHubProvider('token', 'owner', 'repo')

    await expect(provider.readFile('note.md')).resolves.toBe('Hello — café')
    await provider.writeFile('note.md', 'Updated')

    const writeInit = fetchMock.mock.calls[1][1] as RequestInit
    expect(JSON.parse(String(writeInit.body))).toMatchObject({
      message: 'Update note.md',
      sha: 'sha-1',
    })
  })

  it('treats missing directories as empty listings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({}, 404))
    const provider = new GitHubProvider('token', 'owner', 'repo')
    await expect(provider.listFiles('missing')).resolves.toEqual([])
  })

  it('retries delete conflicts with a fresh SHA', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'note.md',
          path: 'note.md',
          type: 'file',
          size: 1,
          sha: 'sha-1',
          content: '',
        })
      )
      .mockResolvedValueOnce(jsonResponse({}, 409))
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'note.md',
          path: 'note.md',
          type: 'file',
          size: 1,
          sha: 'sha-2',
          content: '',
        })
      )
      .mockResolvedValueOnce(jsonResponse({}, 200))
    const provider = new GitHubProvider('token', 'owner', 'repo')

    const deletion = provider.deleteFile('note.md')
    await vi.runAllTimersAsync()
    await deletion

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(JSON.parse(String((fetchMock.mock.calls[3][1] as RequestInit).body))).toMatchObject({
      sha: 'sha-2',
    })
  })
})

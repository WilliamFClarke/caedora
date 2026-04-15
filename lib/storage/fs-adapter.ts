/**
 * Custom fs adapter bridging isomorphic-git's Node-style fs calls to the
 * browser's File System Access API (FSAA).
 *
 * isomorphic-git expects: { promises: { readFile, writeFile, unlink, readdir,
 *   mkdir, rmdir, stat, lstat, rename, readlink, symlink } }
 *
 * All paths arrive as absolute-style strings (e.g. "/.git/config").  We strip
 * the leading slash and split on "/" to traverse the handle tree from root.
 */

type AnyHandle = FileSystemFileHandle | FileSystemDirectoryHandle

export function createFsAdapter(root: FileSystemDirectoryHandle) {
  // Small handle cache to avoid re-traversing the tree on repeated calls.
  // Invalidated on write/delete/rename.
  const cache = new Map<string, AnyHandle>()

  function normalize(path: string): string[] {
    return path
      .replace(/^[\/]+/, '')
      .split('/')
      .filter(Boolean)
  }

  function key(parts: string[]): string {
    return parts.join('/')
  }

  function invalidate(parts: string[]) {
    cache.delete(key(parts))
    if (parts.length > 0) cache.delete(key(parts.slice(0, -1)))
  }

  async function getDir(
    parts: string[],
    create = false
  ): Promise<FileSystemDirectoryHandle> {
    let cur: FileSystemDirectoryHandle = root
    for (const p of parts) {
      cur = await cur.getDirectoryHandle(p, { create })
    }
    return cur
  }

  async function getFile(
    parts: string[],
    create = false
  ): Promise<FileSystemFileHandle> {
    const dir = await getDir(parts.slice(0, -1), create)
    return dir.getFileHandle(parts[parts.length - 1], { create })
  }

  async function resolveHandle(parts: string[]): Promise<AnyHandle | null> {
    const k = key(parts)
    if (cache.has(k)) return cache.get(k)!
    try {
      const h = await getFile(parts)
      cache.set(k, h)
      return h
    } catch {
      try {
        const h = await getDir(parts)
        cache.set(k, h)
        return h
      } catch {
        return null
      }
    }
  }

  function enoent(path: string): Error {
    return Object.assign(new Error(`ENOENT: no such file or directory, '${path}'`), {
      code: 'ENOENT',
    })
  }

  const promises = {
    async readFile(
      path: string,
      options?: { encoding?: string } | string
    ): Promise<string | Uint8Array> {
      const parts = normalize(path)
      const handle = await getFile(parts)
      const file = await handle.getFile()
      const encoding = typeof options === 'string' ? options : options?.encoding
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return file.text()
      }
      return new Uint8Array(await file.arrayBuffer())
    },

    async writeFile(
      path: string,
      data: string | Uint8Array | ArrayBuffer
    ): Promise<void> {
      const parts = normalize(path)
      if (parts.length > 1) await getDir(parts.slice(0, -1), true)
      const handle = await getFile(parts, true)
      invalidate(parts)
      const writable = await handle.createWritable()
      await writable.write(data)
      await writable.close()
    },

    async unlink(path: string): Promise<void> {
      const parts = normalize(path)
      invalidate(parts)
      const parent = await getDir(parts.slice(0, -1))
      await parent.removeEntry(parts[parts.length - 1])
    },

    async readdir(path: string): Promise<string[]> {
      const parts = normalize(path)
      const dir = parts.length === 0 ? root : await getDir(parts)
      const names: string[] = []
      for await (const name of dir.keys()) names.push(name)
      return names
    },

    async mkdir(path: string): Promise<void> {
      const parts = normalize(path)
      invalidate(parts)
      await getDir(parts, true)
    },

    async rmdir(
      path: string,
      opts?: { recursive?: boolean }
    ): Promise<void> {
      const parts = normalize(path)
      invalidate(parts)
      const parent = await getDir(parts.slice(0, -1))
      await parent.removeEntry(parts[parts.length - 1], {
        recursive: opts?.recursive ?? false,
      })
    },

    async stat(path: string) {
      const parts = normalize(path)
      if (parts.length === 0) {
        // root directory
        return mkDirStat(0)
      }
      const handle = await resolveHandle(parts)
      if (!handle) throw enoent(path)
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile()
        return mkFileStat(file.size, file.lastModified)
      }
      return mkDirStat(0)
    },

    lstat(path: string) {
      return promises.stat(path)  // no symlinks in FSAA
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      // FSAA has no rename — copy then delete
      const oldParts = normalize(oldPath)
      const newParts = normalize(newPath)
      const data = await promises.readFile(oldPath)
      await promises.writeFile(newPath, data)
      await promises.unlink(oldPath)
      invalidate(oldParts)
      invalidate(newParts)
    },

    async readlink(path: string): Promise<string> {
      throw Object.assign(
        new Error(`EINVAL: invalid argument, readlink '${path}'`),
        { code: 'EINVAL' }
      )
    },

    async symlink(_target: string, path: string): Promise<void> {
      throw Object.assign(
        new Error(`EPERM: operation not permitted, symlink '${path}'`),
        { code: 'EPERM' }
      )
    },
  }

  return { promises }
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function mkFileStat(size: number, mtimeMs: number) {
  return {
    type: 'file',
    mode: 0o100644,
    size,
    mtimeMs,
    ctimeMs: mtimeMs,
    isFile: () => true,
    isDirectory: () => false,
    isSymbolicLink: () => false,
  }
}

function mkDirStat(mtimeMs: number) {
  const ts = mtimeMs || Date.now()
  return {
    type: 'dir',
    mode: 0o40755,
    size: 0,
    mtimeMs: ts,
    ctimeMs: ts,
    isFile: () => false,
    isDirectory: () => true,
    isSymbolicLink: () => false,
  }
}

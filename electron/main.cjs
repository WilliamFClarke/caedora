const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const git = require('isomorphic-git')

const GIT_AUTHOR = { name: 'personal-md', email: 'local@personal-md' }
const ENABLE_NATIVE_WINDOW_SHADOW = process.platform === 'win32'

let mainWindow = null

function getAppUrl() {
  return process.env.PERSONAL_MD_DESKTOP_URL || 'http://localhost:3000'
}

function createWindow() {
  const appUrl = getAppUrl()
  const allowedOrigin = new URL(appUrl).origin

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'personal-md',
    autoHideMenuBar: true,
    transparent: !ENABLE_NATIVE_WINDOW_SHADOW,
    backgroundColor: ENABLE_NATIVE_WINDOW_SHADOW ? '#111827' : '#00000000',
    hasShadow: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 12, y: 12 } }
      : {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#64748b',
            height: 44,
          },
        }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.setHasShadow(true)
  mainWindow.setMenuBarVisibility(false)
  applyTransparency(mainWindow, true)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin === allowedOrigin) return
    } catch {
      // If URL parsing fails, block navigation.
    }
    event.preventDefault()
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url)
    }
  })

  void mainWindow.loadURL(appUrl)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerIpc() {
  ipcMain.handle('window:setTransparency', (event, enabled) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    applyTransparency(win, Boolean(enabled))
  })

  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle('vault:selectDirectory', async (_event, options = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select vault folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return describeRoot(result.filePaths[0])
  })

  ipcMain.handle('vault:createChildDirectory', async (_event, rootPath, name) => {
    const root = resolveRoot(rootPath)
    const segment = normalizePathSegment(name)
    const target = path.join(root, segment)
    await fsp.mkdir(target, { recursive: true })
    return describeRoot(target)
  })

  ipcMain.handle('vault:init', async (_event, rootPath) => {
    const root = resolveRoot(rootPath)
    await ensureGit(root)
    return describeRoot(root)
  })

  ipcMain.handle('vault:listFiles', async (_event, rootPath, dir = '') => {
    const root = resolveRoot(rootPath)
    const relDir = normalizeRelativePath(dir)
    return walkVault(root, relDir)
  })

  ipcMain.handle('vault:readFile', async (_event, rootPath, filePath) => {
    const target = resolveVaultPath(rootPath, filePath)
    return fsp.readFile(target, 'utf8')
  })

  ipcMain.handle('vault:writeFile', async (_event, rootPath, filePath, content) => {
    const target = resolveVaultPath(rootPath, filePath)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, String(content), 'utf8')
  })

  ipcMain.handle('vault:deleteFile', async (_event, rootPath, filePath) => {
    const root = resolveRoot(rootPath)
    const rel = normalizeRelativePath(filePath)
    if (!rel) throw new Error('Cannot delete the vault root')
    await removeFromGit(root, rel)
    await fsp.unlink(resolveVaultPath(root, rel))
  })

  ipcMain.handle('vault:deletePath', async (_event, rootPath, entryPath) => {
    const root = resolveRoot(rootPath)
    const rel = normalizeRelativePath(entryPath)
    if (!rel) throw new Error('Cannot delete the vault root')
    const target = resolveVaultPath(root, rel)
    const stat = await fsp.stat(target).catch(() => null)
    if (!stat) return
    if (stat.isDirectory()) {
      const files = await walkVault(root, rel)
      for (const file of files.filter((entry) => entry.type === 'file')) {
        await removeFromGit(root, file.path)
      }
      await fsp.rm(target, { recursive: true, force: true })
    } else {
      await removeFromGit(root, rel)
      await fsp.unlink(target)
    }
  })

  ipcMain.handle('vault:renamePath', async (_event, rootPath, from, to) => {
    const root = resolveRoot(rootPath)
    const fromRel = normalizeRelativePath(from)
    const toRel = normalizeRelativePath(to)
    if (!fromRel || !toRel) throw new Error('Cannot rename the vault root')

    const fromTarget = resolveVaultPath(root, fromRel)
    const toTarget = resolveVaultPath(root, toRel)
    const stat = await fsp.stat(fromTarget)
    const oldFiles = stat.isDirectory()
      ? (await walkVault(root, fromRel)).filter((entry) => entry.type === 'file').map((entry) => entry.path)
      : [fromRel]

    await fsp.mkdir(path.dirname(toTarget), { recursive: true })
    await fsp.rename(fromTarget, toTarget)

    for (const oldFile of oldFiles) {
      await removeFromGit(root, oldFile)
    }
    const newFiles = stat.isDirectory()
      ? (await walkVault(root, toRel)).filter((entry) => entry.type === 'file').map((entry) => entry.path)
      : [toRel]
    for (const newFile of newFiles) {
      await addToGit(root, newFile)
    }
  })

  ipcMain.handle('vault:commit', async (_event, rootPath, message, paths = []) => {
    const root = resolveRoot(rootPath)
    await ensureGit(root)
    for (const filePath of paths) {
      const rel = normalizeRelativePath(filePath)
      if (!rel) continue
      const target = resolveVaultPath(root, rel)
      const stat = await fsp.stat(target).catch(() => null)
      if (!stat) continue
      if (stat.isDirectory()) {
        const files = await walkVault(root, rel)
        for (const file of files.filter((entry) => entry.type === 'file')) {
          await addToGit(root, file.path)
        }
      } else {
        await addToGit(root, rel)
      }
    }
    return git.commit({
      fs,
      dir: root,
      message: String(message || 'Update vault'),
      author: GIT_AUTHOR,
    })
  })

  ipcMain.handle('vault:log', async (_event, rootPath, filePath, limit = 50) => {
    const root = resolveRoot(rootPath)
    await ensureGit(root)
    const options = {
      fs,
      dir: root,
      depth: Number(limit) || 50,
    }
    if (filePath) options.filepath = normalizeRelativePath(filePath)
    const entries = await git.log(options)
    return entries.map((entry) => ({
      oid: entry.oid,
      message: entry.commit.message.trim(),
      author: {
        name: entry.commit.author.name,
        email: entry.commit.author.email,
        timestamp: entry.commit.author.timestamp,
      },
      parents: entry.commit.parent,
    }))
  })

  ipcMain.handle('vault:diffContent', async (_event, rootPath, oid, filePath) => {
    const root = resolveRoot(rootPath)
    const rel = normalizeRelativePath(filePath)
    let newContent = ''
    let oldContent = ''

    try {
      newContent = await readBlobText(root, oid, rel)
    } catch {
      // File did not exist at this commit.
    }

    try {
      const commits = await git.log({ fs, dir: root, depth: 2, ref: oid })
      if (commits.length > 1) {
        oldContent = await readBlobText(root, commits[1].oid, rel)
      }
    } catch {
      // No parent or file did not exist in the parent.
    }

    return { oldContent, newContent }
  })

  ipcMain.handle('vault:currentBranch', async (_event, rootPath) => {
    const root = resolveRoot(rootPath)
    await ensureGit(root)
    return (await git.currentBranch({ fs, dir: root })) || 'HEAD'
  })

  ipcMain.handle('localLlm:testConnection', async (_event, config) => {
    try {
      const models = await listLocalModels(config)
      const selected = config?.model ? ` Model: ${config.model}.` : ''
      return {
        ok: true,
        message: `Connected. Found ${models.length} model${models.length === 1 ? '' : 's'}.${selected}`,
        models,
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not connect to local LLM server.',
        models: [],
      }
    }
  })

  ipcMain.handle('localLlm:chatCompletion', async (_event, config, messages) => {
    const baseUrl = normalizeBaseUrl(config?.baseUrl)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...authHeaders(config?.apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model,
        messages,
        stream: false,
      }),
    })
    if (!response.ok) {
      throw new Error(`Local LLM request failed (${response.status})`)
    }
    return response.json()
  })
}

function applyTransparency(win, enabled) {
  win.setHasShadow(true)

  if (process.platform === 'win32') {
    win.setBackgroundColor('#111827')
    if (typeof win.setBackgroundMaterial === 'function') {
      win.setBackgroundMaterial(enabled ? 'acrylic' : 'none')
    }
    return
  }

  win.setBackgroundColor(enabled ? '#00000000' : '#111827')

  if (process.platform === 'darwin') {
    win.setVibrancy(enabled ? 'sidebar' : null, { animationDuration: 140 })
    return
  }
}

function describeRoot(rootPath) {
  const resolved = resolveRoot(rootPath)
  return { path: resolved, name: path.basename(resolved) }
}

function resolveRoot(rootPath) {
  if (typeof rootPath !== 'string' || rootPath.trim() === '') {
    throw new Error('Missing vault path')
  }
  return path.resolve(rootPath)
}

function normalizePathSegment(segment) {
  if (typeof segment !== 'string' || segment.trim() === '') {
    throw new Error('Missing folder name')
  }
  if (segment.includes('/') || segment.includes('\\') || segment.includes('\0')) {
    throw new Error('Folder name cannot contain path separators')
  }
  if (segment === '.' || segment === '..') {
    throw new Error('Invalid folder name')
  }
  return segment
}

function normalizeRelativePath(input = '') {
  if (typeof input !== 'string') throw new Error('Path must be a string')
  if (input.includes('\0')) throw new Error('Path cannot contain null bytes')
  const cleaned = input.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!cleaned || cleaned === '.') return ''
  if (path.isAbsolute(cleaned)) throw new Error('Absolute paths are not allowed')
  const parts = cleaned.split('/').filter(Boolean)
  if (parts.some((part) => part === '..')) throw new Error('Path traversal is not allowed')
  return parts.join('/')
}

function resolveVaultPath(rootPath, relPath = '') {
  const root = resolveRoot(rootPath)
  const rel = normalizeRelativePath(relPath)
  const target = path.resolve(root, rel)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Resolved path is outside the vault')
  }
  return target
}

function toVaultPath(root, fullPath) {
  return path.relative(root, fullPath).split(path.sep).join('/')
}

async function ensureGit(root) {
  const gitDir = path.join(root, '.git')
  try {
    const stat = await fsp.stat(gitDir)
    if (stat.isDirectory()) return
  } catch {
    // Initialize below.
  }
  await git.init({ fs, dir: root })
}

async function walkVault(root, relDir = '') {
  const start = resolveVaultPath(root, relDir)
  const out = []

  async function visit(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      const rel = toVaultPath(root, full)
      if (entry.isDirectory()) {
        out.push({ path: rel, name: entry.name, type: 'dir' })
        await visit(full)
      } else if (entry.isFile()) {
        const stat = await fsp.stat(full)
        out.push({
          path: rel,
          name: entry.name,
          type: 'file',
          size: stat.size,
          lastModified: stat.mtimeMs,
        })
      }
    }
  }

  await visit(start)
  return out
}

async function addToGit(root, relPath) {
  try {
    await ensureGit(root)
    await git.add({ fs, dir: root, filepath: normalizeRelativePath(relPath) })
  } catch {
    // The UI can still write files even if a path is not currently trackable.
  }
}

async function removeFromGit(root, relPath) {
  try {
    await ensureGit(root)
    await git.remove({ fs, dir: root, filepath: normalizeRelativePath(relPath) })
  } catch {
    // Ignore missing index entries.
  }
}

async function readBlobText(root, oid, filepath) {
  const { blob } = await git.readBlob({ fs, dir: root, oid, filepath })
  return new TextDecoder().decode(blob)
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('Missing local LLM base URL')
  }
  return baseUrl.trim().replace(/\/+$/, '')
}

function authHeaders(apiKey) {
  if (!apiKey) return {}
  return { Authorization: `Bearer ${apiKey}` }
}

async function listLocalModels(config) {
  const baseUrl = normalizeBaseUrl(config?.baseUrl)
  const response = await fetch(`${baseUrl}/models`, {
    headers: authHeaders(config?.apiKey),
  })
  if (!response.ok) {
    throw new Error(`Local LLM server returned ${response.status}`)
  }
  const data = await response.json()
  if (Array.isArray(data?.data)) {
    return data.data.map((model) => model.id || model.name).filter(Boolean)
  }
  if (Array.isArray(data?.models)) {
    return data.models.map((model) => model.name || model.model || model.id).filter(Boolean)
  }
  return []
}

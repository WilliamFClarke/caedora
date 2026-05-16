const { app, BrowserWindow, Menu, dialog, ipcMain, shell, utilityProcess } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const net = require('node:net')
const crypto = require('node:crypto')
const git = require('isomorphic-git')
const ignore = require('ignore')
const { createTwoFilesPatch } = require('diff')
const { prompt: ARGUS_ASSISTANT_PROMPT } = require('../lib/ai/argus-context.json')

const GIT_AUTHOR = { name: 'caedora', email: 'local@caedora' }
const ENABLE_NATIVE_WINDOW_SHADOW = process.platform === 'win32'
const AI_SETTINGS_FILE = 'ai-settings.json'
const AI_CLOUD_KEY_FILE = 'ai-cloud-key.bin'
const AI_MODELS_DIR = 'models'
const AI_THREADS_DIR = 'ai-threads'
const DEFAULT_AI_SETTINGS = {
  selectedProvider: 'auto',
  explicitProviderChoice: false,
  autoApproveSafeOperations: true,
  toolPermissionLevel: 'allow-all',
  toolPermissionLevelConfigured: false,
  extraSystemPrompt: '',
  sidebar: { open: false, width: 400 },
  ollamaModel: '',
  bundledModel: {
    modelId: 'qwen2.5-7b-instruct-q4_k_m',
    modelUrl: 'https://huggingface.co/second-state/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    modelSha256: 'a30c3c08ca3284a7b59fa35cd835ec50b4a54e211379692b0e48a34bdb72c2fb',
  },
  cloud: {
    provider: 'openai',
    baseUrl: '',
    model: 'gpt-4o-mini',
    hasApiKey: false,
  },
}
const BUNDLED_MODEL_MANIFEST = {
  'qwen2.5-7b-instruct-q4_k_m': {
    id: 'qwen2.5-7b-instruct-q4_k_m',
    label: 'Qwen 2.5 7B Instruct Q4_K_M',
    filename: 'qwen2.5-7b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/second-state/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    sha256: 'a30c3c08ca3284a7b59fa35cd835ec50b4a54e211379692b0e48a34bdb72c2fb',
    approxBytes: 4_680_000_000,
  },
}

if (process.env.CAEDORA_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-software-rasterizer')
}

const APP_NAME = 'Caedora'
const APP_ICON_PNG = path.join(__dirname, 'icon.png')
const APP_ICON_ICO = path.join(__dirname, 'icon.ico')

let mainWindow = null
let desktopServerProcess = null
let desktopServerUrl = null
let currentAiProjectRoot = null
const aiRuns = new Map()
const aiModelDownloads = new Map()
let localLlamaRuntime = null

async function getAppUrl() {
  if (process.env.CAEDORA_DESKTOP_URL) return process.env.CAEDORA_DESKTOP_URL
  if (!app.isPackaged) return 'http://localhost:3000'
  return startPackagedDesktopServer()
}

function applyAppIdentity() {
  app.setName(APP_NAME)

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(APP_ICON_PNG)
  }
}

async function createWindow() {
  const appUrl = await getAppUrl()
  const allowedOrigin = new URL(appUrl).origin

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Caedora',
    icon: process.platform === 'win32' ? APP_ICON_ICO : APP_ICON_PNG,
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

app.whenReady().then(async () => {
  applyAppIdentity()
  Menu.setApplicationMenu(null)
  registerIpc()
  void detectAiState().catch(() => {})
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  desktopServerProcess?.kill()
})

async function startPackagedDesktopServer() {
  if (desktopServerUrl) return desktopServerUrl

  const serverRoot = path.join(process.resourcesPath, 'app')
  const serverEntry = path.join(serverRoot, 'server.js')
  const configuredPort = Number(process.env.CAEDORA_DESKTOP_PORT)
  const port = Number.isInteger(configuredPort) && configuredPort > 0
    ? configuredPort
    : await getAvailablePort()
  const url = `http://127.0.0.1:${port}`

  desktopServerProcess = utilityProcess.fork(serverEntry, [], {
    cwd: serverRoot,
    env: {
      ...process.env,
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PORT: String(port),
    },
    stdio: 'pipe',
    serviceName: 'Caedora Desktop Server',
  })

  desktopServerProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[desktop-server] ${chunk}`)
  })
  desktopServerProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[desktop-server] ${chunk}`)
  })

  await waitForDesktopServer(url)
  desktopServerUrl = url
  return url
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close((error) => {
        if (error) reject(error)
        else if (!port) reject(new Error('Failed to allocate local desktop server port'))
        else resolve(port)
      })
    })
  })
}

async function waitForDesktopServer(url) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  throw new Error('Timed out waiting for packaged desktop server startup')
}

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
    currentAiProjectRoot = root
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

  ipcMain.handle('ai:getSettings', async () => {
    return loadAiSettings()
  })

  ipcMain.handle('ai:getState', async () => {
    return detectAiState()
  })

  ipcMain.handle('ai:updateSettings', async (_event, updates = {}) => {
    const current = await loadAiSettings()
    const next = mergeAiSettings(current, updates)
    await saveAiSettings(next)
    return detectAiState()
  })

  ipcMain.handle('ai:saveCloudApiKey', async (_event, apiKey) => {
    const settings = await loadAiSettings()
    await validateCloudApiKey(settings.cloud, String(apiKey || ''))
    await saveCloudKey(String(apiKey || ''))
    await saveAiSettings(mergeAiSettings(settings, {
      cloud: { ...settings.cloud, hasApiKey: true },
    }))
    return detectAiState()
  })

  ipcMain.handle('ai:clearCloudApiKey', async () => {
    await fsp.rm(aiCloudKeyPath(), { force: true }).catch(() => {})
    const settings = await loadAiSettings()
    await saveAiSettings(mergeAiSettings(settings, {
      cloud: { ...settings.cloud, hasApiKey: false },
    }))
    return detectAiState()
  })

  ipcMain.handle('ai:startModelDownload', async (_event, modelId) => {
    await startAiModelDownload(modelId)
    return detectAiState()
  })

  ipcMain.handle('ai:cancelModelDownload', async (_event, modelId) => {
    await cancelAiModelDownload(modelId)
    return detectAiState()
  })

  ipcMain.handle('ai:deleteBundledModel', async (_event, modelId) => {
    await deleteBundledModel(modelId)
    return detectAiState()
  })

  ipcMain.handle('ai:startChat', async (event, request) => {
    const requestId = String(request?.requestId || crypto.randomUUID())
    const abortController = new AbortController()
    aiRuns.set(requestId, abortController)

    const emit = (payload) => {
      if (event.sender.isDestroyed()) return
      event.sender.send('ai:chatEvent', { requestId, ...payload })
    }

    void runAiChat(request, abortController.signal, emit)
      .catch((error) => {
        emit({
          type: 'error',
          message: error instanceof Error ? error.message : 'AI chat failed.',
        })
      })
      .finally(() => {
        aiRuns.delete(requestId)
      })
  })

  ipcMain.handle('ai:cancelChat', async (_event, requestId) => {
    aiRuns.get(String(requestId))?.abort()
  })

  ipcMain.handle('ai:loadThread', async (_event, rootPath) => {
    return loadAiThread(rootPath)
  })

  ipcMain.handle('ai:appendThread', async (_event, request) => {
    await appendAiThread(request)
  })

  ipcMain.handle('ai:clearThread', async (_event, rootPath) => {
    await clearAiThread(rootPath)
  })

  ipcMain.handle('ai:executeFileTool', async (_event, request) => {
    return executeAiFileTool(request)
  })

  ipcMain.handle('ai:previewFileMutation', async (_event, request) => {
    return previewAiFileMutation(request)
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

function aiSettingsPath() {
  return path.join(app.getPath('userData'), AI_SETTINGS_FILE)
}

function aiCloudKeyPath() {
  return path.join(app.getPath('userData'), AI_CLOUD_KEY_FILE)
}

function aiModelPath(modelId) {
  const model = BUNDLED_MODEL_MANIFEST[modelId] || BUNDLED_MODEL_MANIFEST[DEFAULT_AI_SETTINGS.bundledModel.modelId]
  return path.join(app.getPath('userData'), AI_MODELS_DIR, model.filename)
}

function aiModelTempPath(modelId) {
  return `${aiModelPath(modelId)}.tmp`
}

function aiThreadPath(rootPath) {
  const root = resolveRoot(rootPath)
  assertCurrentAiProjectRoot(root)
  const id = crypto.createHash('sha256').update(root).digest('hex').slice(0, 32)
  return path.join(app.getPath('userData'), AI_THREADS_DIR, `${id}.json`)
}

async function loadAiThread(rootPath) {
  try {
    const raw = await fsp.readFile(aiThreadPath(rootPath), 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.messages)) throw new Error('Invalid AI thread store.')
    return {
      headId: parsed.headId ?? null,
      messages: parsed.messages,
    }
  } catch {
    return { headId: null, messages: [] }
  }
}

async function appendAiThread(request) {
  const rootPath = request?.rootPath
  const item = request?.item
  const messageId = item?.message?.id
  if (!rootPath || !item || typeof messageId !== 'string') return
  const repo = await loadAiThread(rootPath)
  const messages = repo.messages.filter((entry) => entry?.message?.id !== messageId)
  const parentId = messages.some((entry) => entry?.message?.id === item.parentId)
    ? item.parentId
    : null
  messages.push({
    message: item.message,
    parentId,
    runConfig: item.runConfig,
  })
  const next = {
    headId: messageId,
    messages,
  }
  const target = aiThreadPath(rootPath)
  await fsp.mkdir(path.dirname(target), { recursive: true })
  await fsp.writeFile(target, JSON.stringify(next), 'utf8')
}

async function clearAiThread(rootPath) {
  try {
    await fsp.rm(aiThreadPath(rootPath), { force: true })
  } catch {}
}

async function loadAiSettings() {
  try {
    const raw = await fsp.readFile(aiSettingsPath(), 'utf8')
    const parsed = JSON.parse(raw)
    const keyExists = await hasCloudKey()
    return mergeAiSettings(DEFAULT_AI_SETTINGS, {
      ...parsed,
      cloud: { ...parsed.cloud, hasApiKey: keyExists },
    })
  } catch {
    return mergeAiSettings(DEFAULT_AI_SETTINGS, {
      cloud: { ...DEFAULT_AI_SETTINGS.cloud, hasApiKey: await hasCloudKey() },
    })
  }
}

async function saveAiSettings(settings) {
  await fsp.mkdir(path.dirname(aiSettingsPath()), { recursive: true })
  const sanitized = mergeAiSettings(DEFAULT_AI_SETTINGS, settings)
  sanitized.cloud = {
    ...sanitized.cloud,
    hasApiKey: await hasCloudKey(),
  }
  await fsp.writeFile(aiSettingsPath(), JSON.stringify(sanitized, null, 2), 'utf8')
}

function mergeAiSettings(base, updates = {}) {
  const toolPermissionLevelConfigured = updates.toolPermissionLevelConfigured === true
  const shouldUpgradeOldAiPermissionDefault =
    !toolPermissionLevelConfigured &&
    updates.toolPermissionLevel === 'require-approval' &&
    updates.autoApproveSafeOperations === false
  return {
    ...base,
    ...updates,
    toolPermissionLevel: shouldUpgradeOldAiPermissionDefault
      ? base.toolPermissionLevel
      : updates.toolPermissionLevel ||
        (updates.autoApproveSafeOperations ? 'allow-all' : base.toolPermissionLevel),
    toolPermissionLevelConfigured,
    sidebar: {
      ...base.sidebar,
      ...(updates.sidebar || {}),
    },
    bundledModel: {
      ...base.bundledModel,
      ...(updates.bundledModel || {}),
    },
    cloud: {
      ...base.cloud,
      ...(updates.cloud || {}),
    },
  }
}

async function hasCloudKey() {
  try {
    const stat = await fsp.stat(aiCloudKeyPath())
    return stat.isFile()
  } catch {
    return false
  }
}

async function saveCloudKey(apiKey) {
  const safeStorage = getSafeStorage()
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS key storage is not available on this device.')
  }
  const encrypted = safeStorage.encryptString(apiKey)
  await fsp.writeFile(aiCloudKeyPath(), encrypted.toString('base64'), 'utf8')
}

async function loadCloudKey() {
  const safeStorage = getSafeStorage()
  const raw = await fsp.readFile(aiCloudKeyPath(), 'utf8')
  return safeStorage.decryptString(Buffer.from(raw, 'base64'))
}

function getSafeStorage() {
  return require('electron').safeStorage
}

async function detectAiState() {
  const settings = await loadAiSettings()
  const bundledModels = await bundledModelInfos(settings)
  const activeDownload = activeModelDownload()
  const [ollama, bundledModelDownloaded, cloudConfigured] = await Promise.all([
    detectOllama(),
    isBundledModelDownloaded(settings.bundledModel.modelId),
    hasCloudKey(),
  ])

  if (activeDownload) {
    return {
      state: 'downloading',
      selectedProvider: 'local-llama',
      providerLabel: providerLabel('local-llama'),
      modelLabel: modelLabelForProvider('local-llama', settings, ollama.models),
      message: activeDownload.progress.message || 'Downloading bundled AI model.',
      ollamaModels: ollama.models,
      bundledModels,
      bundledModelDownloaded,
      download: activeDownload.progress,
    }
  }

  const available = {
    ollama: ollama.ok,
    'local-llama': bundledModelDownloaded,
    cloud: cloudConfigured,
  }

  let selectedProvider = null
  if (settings.explicitProviderChoice && settings.selectedProvider !== 'auto') {
    selectedProvider = settings.selectedProvider
  } else if (available.ollama) {
    selectedProvider = 'ollama'
  } else if (available['local-llama']) {
    selectedProvider = 'local-llama'
  } else if (available.cloud) {
    selectedProvider = 'cloud'
  }

  if (!selectedProvider) {
    return {
      state: 'not-configured',
      selectedProvider: null,
      providerLabel: 'Not configured',
      modelLabel: null,
      message: 'Configure Ollama, download a bundled model, or add a cloud API key.',
      ollamaModels: ollama.models,
      bundledModels,
      bundledModelDownloaded,
      download: null,
    }
  }

  if (!available[selectedProvider]) {
    return {
      state: 'error',
      selectedProvider,
      providerLabel: providerLabel(selectedProvider),
      modelLabel: modelLabelForProvider(selectedProvider, settings, ollama.models),
      message: providerUnavailableMessage(selectedProvider),
      ollamaModels: ollama.models,
      bundledModels,
      bundledModelDownloaded,
      download: null,
    }
  }

  return {
    state: 'ready',
    selectedProvider,
    providerLabel: providerLabel(selectedProvider),
    modelLabel: modelLabelForProvider(selectedProvider, settings, ollama.models),
    message: `${providerLabel(selectedProvider)} is ready.`,
    ollamaModels: ollama.models,
    bundledModels,
    bundledModelDownloaded,
    download: null,
  }
}

function activeModelDownload() {
  return aiModelDownloads.values().next().value || null
}

async function bundledModelInfos(settings) {
  return Promise.all(
    Object.values(BUNDLED_MODEL_MANIFEST).map(async (model) => ({
      id: model.id,
      label: model.label,
      approxBytes: model.approxBytes,
      downloaded: await isBundledModelDownloaded(model.id),
    })).concat(
      settings.bundledModel.modelId in BUNDLED_MODEL_MANIFEST
        ? []
        : [{
            id: settings.bundledModel.modelId,
            label: settings.bundledModel.modelId,
            approxBytes: undefined,
            downloaded: false,
          }]
    )
  )
}

async function detectOllama() {
  try {
    const response = await fetchWithTimeout('http://localhost:11434/api/tags', {
      timeoutMs: 900,
    })
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
    const body = await response.json()
    const models = Array.isArray(body?.models)
      ? body.models
          .map((model) => model?.name || model?.model)
          .filter(Boolean)
          .map((id) => ({ id, label: id }))
      : []
    return { ok: true, models }
  } catch {
    return { ok: false, models: [] }
  }
}

async function isBundledModelDownloaded(modelId) {
  try {
    const stat = await fsp.stat(aiModelPath(modelId))
    return stat.isFile() && stat.size > 0
  } catch {
    return false
  }
}

async function startAiModelDownload(modelId) {
  const settings = await loadAiSettings()
  const id = String(modelId || settings.bundledModel.modelId || DEFAULT_AI_SETTINGS.bundledModel.modelId)
  if (aiModelDownloads.has(id)) return
  const model = bundledModelDefinition(settings, id)
  if (!model.url || !model.sha256) {
    throw new Error('Bundled model download URL and SHA-256 must be configured first.')
  }
  if (await isBundledModelDownloaded(id)) return

  const controller = new AbortController()
  const record = {
    modelId: id,
    controller,
    cancelled: false,
    startedAt: Date.now(),
    progress: {
      modelId: id,
      percent: 0,
      downloadedBytes: 0,
      totalBytes: model.approxBytes || null,
      etaSeconds: null,
      message: 'Preparing download...',
    },
  }
  aiModelDownloads.set(id, record)
  emitAiModelDownloadEvent({ type: 'progress', progress: record.progress })

  void downloadAiModel(record, model)
    .then(() => {
      record.progress = {
        ...record.progress,
        percent: 100,
        message: 'Download complete.',
      }
      emitAiModelDownloadEvent({ type: 'complete', progress: record.progress })
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Model download failed.'
      record.progress = {
        ...record.progress,
        message,
      }
      emitAiModelDownloadEvent({
        type: record.cancelled ? 'cancelled' : 'error',
        progress: record.progress,
        message,
      })
    })
    .finally(() => {
      if (aiModelDownloads.get(id) === record) aiModelDownloads.delete(id)
    })
}

async function cancelAiModelDownload(modelId) {
  const id = modelId ? String(modelId) : activeModelDownload()?.modelId
  if (!id) return
  const record = aiModelDownloads.get(id)
  if (!record) return
  record.cancelled = true
  record.controller.abort()
  await fsp.rm(aiModelTempPath(id), { force: true }).catch(() => {})
  aiModelDownloads.delete(id)
  record.progress = {
    ...record.progress,
    message: 'Download cancelled.',
  }
  emitAiModelDownloadEvent({ type: 'cancelled', progress: record.progress })
}

async function deleteBundledModel(modelId) {
  const settings = await loadAiSettings()
  const id = modelId ? String(modelId) : settings.bundledModel.modelId
  if (!id) return
  if (aiModelDownloads.has(id)) {
    await cancelAiModelDownload(id)
  }
  await fsp.rm(aiModelPath(id), { force: true }).catch(() => {})
  await fsp.rm(aiModelTempPath(id), { force: true }).catch(() => {})
}

function bundledModelDefinition(settings, modelId) {
  const fallback = BUNDLED_MODEL_MANIFEST[modelId] || BUNDLED_MODEL_MANIFEST[DEFAULT_AI_SETTINGS.bundledModel.modelId]
  const isSelected = settings.bundledModel.modelId === modelId
  return {
    ...fallback,
    id: modelId,
    url: isSelected && settings.bundledModel.modelUrl ? settings.bundledModel.modelUrl : fallback.url,
    sha256: isSelected && settings.bundledModel.modelSha256 ? settings.bundledModel.modelSha256 : fallback.sha256,
  }
}

async function downloadAiModel(record, model) {
  const finalPath = aiModelPath(record.modelId)
  const tempPath = aiModelTempPath(record.modelId)
  await fsp.mkdir(path.dirname(finalPath), { recursive: true })

  let resumeBytes = await fsp.stat(tempPath).then((stat) => stat.size).catch(() => 0)
  const totalBytes = await resolveDownloadSize(model.url, model.approxBytes)
  record.progress = {
    ...record.progress,
    totalBytes,
    downloadedBytes: resumeBytes,
    percent: progressPercent(resumeBytes, totalBytes),
    message: resumeBytes > 0 ? 'Resuming download...' : 'Starting download...',
  }
  emitAiModelDownloadEvent({ type: 'progress', progress: record.progress })

  await ensureDiskSpace(path.dirname(finalPath), Math.max(0, (totalBytes || model.approxBytes || 0) - resumeBytes))

  const headers = resumeBytes > 0 ? { Range: `bytes=${resumeBytes}-` } : {}
  let response = await fetch(model.url, {
    signal: record.controller.signal,
    headers,
  })

  if (resumeBytes > 0 && response.status !== 206) {
    resumeBytes = 0
    await fsp.rm(tempPath, { force: true }).catch(() => {})
    response = await fetch(model.url, { signal: record.controller.signal })
  }

  if (!response.ok || !response.body) {
    throw new Error(`Model download failed (${response.status}).`)
  }

  const lengthHeader = Number(response.headers.get('content-length') || 0)
  const contentRangeTotal = parseContentRangeTotal(response.headers.get('content-range'))
  const resolvedTotal = contentRangeTotal || (lengthHeader ? lengthHeader + resumeBytes : totalBytes)
  const writer = fs.createWriteStream(tempPath, { flags: resumeBytes > 0 ? 'a' : 'w' })
  let downloadedBytes = resumeBytes
  let lastEmit = 0

  try {
    for await (const chunk of response.body) {
      if (record.controller.signal.aborted) throw new Error('Download cancelled.')
      const buffer = Buffer.from(chunk)
      await writeStreamChunk(writer, buffer)
      downloadedBytes += buffer.length
      const now = Date.now()
      if (now - lastEmit > 500) {
        lastEmit = now
        record.progress = downloadProgress(record, downloadedBytes, resolvedTotal, 'Downloading model...')
        emitAiModelDownloadEvent({ type: 'progress', progress: record.progress })
      }
    }
  } finally {
    await closeWriteStream(writer)
  }

  record.progress = downloadProgress(record, downloadedBytes, resolvedTotal, 'Verifying SHA-256...')
  emitAiModelDownloadEvent({ type: 'progress', progress: record.progress })

  const actualHash = await sha256File(tempPath)
  if (actualHash.toLowerCase() !== model.sha256.toLowerCase()) {
    await fsp.rm(tempPath, { force: true }).catch(() => {})
    throw new Error('Downloaded model failed SHA-256 verification.')
  }

  await fsp.rm(finalPath, { force: true }).catch(() => {})
  await fsp.rename(tempPath, finalPath)
}

async function resolveDownloadSize(url, fallbackBytes) {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD', timeoutMs: 15_000 })
    if (!response.ok) return fallbackBytes || null
    return Number(response.headers.get('content-length') || 0) || fallbackBytes || null
  } catch {
    return fallbackBytes || null
  }
}

async function ensureDiskSpace(directory, requiredBytes) {
  const safetyMargin = 512 * 1024 * 1024
  const stat = await fsp.statfs(directory)
  const availableBytes = Number(stat.bavail) * Number(stat.bsize)
  if (availableBytes < requiredBytes + safetyMargin) {
    throw new Error('Not enough free disk space to download the bundled AI model.')
  }
}

function downloadProgress(record, downloadedBytes, totalBytes, message) {
  const elapsedSeconds = Math.max(1, (Date.now() - record.startedAt) / 1000)
  const bytesPerSecond = downloadedBytes / elapsedSeconds
  const remainingBytes = totalBytes ? Math.max(0, totalBytes - downloadedBytes) : 0
  return {
    modelId: record.modelId,
    percent: progressPercent(downloadedBytes, totalBytes),
    downloadedBytes,
    totalBytes,
    etaSeconds: totalBytes && bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : null,
    message,
  }
}

function progressPercent(downloadedBytes, totalBytes) {
  if (!totalBytes) return 0
  return Math.max(0, Math.min(100, Math.round((downloadedBytes / totalBytes) * 1000) / 10))
}

function parseContentRangeTotal(contentRange) {
  if (!contentRange) return null
  const match = /\/(\d+)$/.exec(contentRange)
  return match ? Number(match[1]) : null
}

function writeStreamChunk(writer, chunk) {
  return new Promise((resolve, reject) => {
    writer.write(chunk, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function closeWriteStream(writer) {
  return new Promise((resolve, reject) => {
    writer.end((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function emitAiModelDownloadEvent(event) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('ai:modelDownloadEvent', event)
    }
  }
}

function providerLabel(provider) {
  if (provider === 'ollama') return 'Ollama'
  if (provider === 'local-llama') return 'Bundled local model'
  return 'Cloud API'
}

function modelLabelForProvider(provider, settings, ollamaModels) {
  if (provider === 'ollama') {
    return settings.ollamaModel || ollamaModels[0]?.id || 'Auto'
  }
  if (provider === 'local-llama') {
    return BUNDLED_MODEL_MANIFEST[settings.bundledModel.modelId]?.label || settings.bundledModel.modelId
  }
  return settings.cloud.model || 'Model not set'
}

function providerUnavailableMessage(provider) {
  if (provider === 'ollama') return 'Ollama is selected but not running.'
  if (provider === 'local-llama') return 'The bundled local model has not been downloaded.'
  return 'Cloud provider is selected but no validated API key is saved.'
}

async function validateCloudApiKey(cloud, apiKey) {
  if (!apiKey.trim()) throw new Error('Missing API key.')
  if (cloud.provider === 'anthropic') {
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      timeoutMs: 15_000,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cloud.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    })
    if (!response.ok) throw new Error(`Anthropic validation failed (${response.status}).`)
    return
  }

  const baseUrl = cloud.provider === 'custom-openai'
    ? normalizeBaseUrl(cloud.baseUrl)
    : 'https://api.openai.com/v1'
  const response = await fetchWithTimeout(`${baseUrl}/models`, {
    timeoutMs: 15_000,
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`Cloud API validation failed (${response.status}).`)
  }
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 30_000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...fetchOptions, signal: fetchOptions.signal || controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function runAiChat(request, abortSignal, emit) {
  assertCurrentAiProjectRoot(resolveRoot(request?.rootPath))
  const state = await detectAiState()
  if (state.state !== 'ready' || !state.selectedProvider) {
    throw new Error(state.message)
  }

  const settings = await loadAiSettings()
  const provider = getLlmProvider(state.selectedProvider)
  const requestWithContext = await withArgusContext(request, settings)
  await provider.chat(
    settings,
    state,
    requestWithContext,
    abortSignal,
    emit
  )
}

async function withArgusContext(request, settings) {
  const messages = Array.isArray(request?.messages) ? request.messages : []
  const prompt = await buildArgusSystemPrompt(settings, request)
  const hasArgusContext = messages.some(
    (message) =>
      message.role === 'system' &&
      typeof message.content === 'string' &&
      message.content.includes('Argus, the Caedora desktop assistant')
  )
  return {
    ...request,
    messages: hasArgusContext
      ? messages
      : [{ role: 'system', content: prompt }, ...messages],
  }
}

async function buildArgusSystemPrompt(settings, request) {
  const extra = typeof settings?.extraSystemPrompt === 'string'
    ? settings.extraSystemPrompt.trim()
    : ''
  const currentFileContext = await buildCurrentFileContext(request)
  return [
    ARGUS_ASSISTANT_PROMPT,
    currentFileContext,
    extra ? `Additional user-provided context:\n${extra}` : '',
  ].filter(Boolean).join('\n\n')
}

async function buildCurrentFileContext(request) {
  const currentFilePath = typeof request?.currentFilePath === 'string'
    ? request.currentFilePath
    : ''
  if (!currentFilePath) return ''

  const rel = normalizeRelativePath(currentFilePath)
  if (path.extname(rel).toLowerCase() !== '.md') {
    return `Current opened vault item:\n- path: ${rel}`
  }

  try {
    const target = await resolveAiProjectPath(request.rootPath, rel)
    const stat = await fsp.stat(target)
    if (!stat.isFile()) return `Current opened vault item:\n- path: ${rel}`
    const content = await fsp.readFile(target, 'utf8')
    const truncated = content.length > 12_000
    return `Current opened markdown file:\n- path: ${rel}\n- content${truncated ? ' (truncated)' : ''}:\n\`\`\`markdown\n${truncated ? `${content.slice(0, 12_000)}\n...[truncated]` : content}\n\`\`\``
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read current file.'
    return `Current opened markdown file:\n- path: ${rel}\n- content unavailable: ${message}`
  }
}

function getLlmProvider(provider) {
  if (provider === 'ollama') {
    return { chat: runOllamaChat }
  }
  if (provider === 'cloud') {
    return {
      chat(settings, _state, request, abortSignal, emit) {
        return runCloudChat(settings, request, abortSignal, emit)
      },
    }
  }
  return {
    chat(settings, _state, request, abortSignal, emit) {
      return runLocalLlamaChat(settings, request, abortSignal, emit)
    },
  }
}

async function runOllamaChat(settings, state, request, abortSignal, emit) {
  const model = settings.ollamaModel || state.ollamaModels[0]?.id
  if (!model) throw new Error('No Ollama model is installed.')
  let sawToolCall = false

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    signal: abortSignal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: request.messages.map(toOllamaMessage),
      tools: request.tools,
      stream: true,
    }),
  })
  if (!response.ok || !response.body) {
    throw new Error(`Ollama request failed (${response.status}).`)
  }

  for await (const payload of readNdjson(response.body)) {
    if (payload?.message?.content) {
      emit({ type: 'text', text: payload.message.content })
    }
    const toolCalls = payload?.message?.tool_calls
    if (Array.isArray(toolCalls)) {
      for (const [index, call] of toolCalls.entries()) {
        sawToolCall = true
        const name = call?.function?.name
        if (!name) continue
        emit({
          type: 'tool-call',
          toolCallId: call.id || `${request.requestId}_ollama_tool_${index}`,
          toolName: name,
          argsText: JSON.stringify(call.function.arguments || {}),
        })
      }
    }
    if (payload?.done) {
      emit({ type: 'done', finishReason: sawToolCall ? 'tool-calls' : 'stop' })
      return
    }
  }
  emit({ type: 'done', finishReason: sawToolCall ? 'tool-calls' : 'stop' })
}

function toOllamaMessage(message) {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_name: message.name || message.tool_name || message.tool_call_id,
      content: message.content,
    }
  }
  const out = {
    role: message.role,
    content: message.content,
  }
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    out.tool_calls = message.tool_calls.map((call, index) => ({
      type: 'function',
      function: {
        index,
        name: call?.function?.name,
        arguments: parseToolCallArguments(call?.function?.arguments),
      },
    }))
  }
  return out
}

function parseToolCallArguments(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function runCloudChat(settings, request, abortSignal, emit) {
  if (settings.cloud.provider === 'anthropic') {
    await runAnthropicChat(settings, request, abortSignal, emit)
    return
  }

  const apiKey = await loadCloudKey()
  const baseUrl = settings.cloud.provider === 'custom-openai'
    ? normalizeBaseUrl(settings.cloud.baseUrl)
    : 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: abortSignal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.cloud.model,
      messages: request.messages,
      tools: request.tools.length ? request.tools : undefined,
      stream: true,
    }),
  })
  if (!response.ok || !response.body) {
    throw new Error(`Cloud provider request failed (${response.status}).`)
  }

  const toolCalls = new Map()
  for await (const data of readSse(response.body)) {
    if (data === '[DONE]') break
    const payload = JSON.parse(data)
    const delta = payload?.choices?.[0]?.delta
    if (delta?.content) emit({ type: 'text', text: delta.content })
    if (Array.isArray(delta?.tool_calls)) {
      for (const call of delta.tool_calls) {
        const index = call.index ?? 0
        const existing = toolCalls.get(index) || {
          id: call.id || `${request.requestId}_tool_${index}`,
          name: '',
          arguments: '',
        }
        if (call.id) existing.id = call.id
        if (call.function?.name) existing.name += call.function.name
        if (call.function?.arguments) existing.arguments += call.function.arguments
        toolCalls.set(index, existing)
        if (existing.name) {
          emit({
            type: 'tool-call',
            toolCallId: existing.id,
            toolName: existing.name,
            argsText: existing.arguments || '{}',
          })
        }
      }
    }
  }
  emit({ type: 'done', finishReason: toolCalls.size ? 'tool-calls' : 'stop' })
}

async function runLocalLlamaChat(settings, request, abortSignal, emit) {
  const modelId = settings.bundledModel.modelId
  const modelPath = aiModelPath(modelId)
  const stat = await fsp.stat(modelPath).catch(() => null)
  if (!stat?.isFile()) {
    throw new Error('Download the bundled AI model before using the local provider.')
  }

  const { LlamaChatSession } = await import('node-llama-cpp')
  const runtime = await getLocalLlamaRuntime(modelId, modelPath)
  const context = await runtime.model.createContext({ contextSize: 4096 })
  const sequence = context.getSequence()
  const session = new LlamaChatSession({
    contextSequence: sequence,
    systemPrompt: await localLlamaSystemPrompt(settings, request),
  })

  try {
    const result = await session.promptWithMeta(localLlamaUserPrompt(request.messages), {
      functions: toLocalLlamaFunctions(request.tools),
      signal: abortSignal,
      stopOnAbortSignal: true,
      maxTokens: 2048,
      onTextChunk: (chunk) => {
        if (chunk) emit({ type: 'text', text: chunk })
      },
    })
    const functionCalls = result.response.filter((item) => item?.type === 'functionCall')
    if (functionCalls.length > 0) {
      for (const [index, call] of functionCalls.entries()) {
        emit({
          type: 'tool-call',
          toolCallId: `${request.requestId}_local_llama_tool_${index}`,
          toolName: call.name,
          argsText: JSON.stringify(call.params || {}),
        })
      }
      emit({ type: 'done', finishReason: 'tool-calls' })
      return
    }
    emit({ type: 'done', finishReason: abortSignal.aborted ? 'cancelled' : 'stop' })
  } finally {
    session.dispose({ disposeSequence: true })
    await context.dispose().catch(() => {})
  }
}

async function getLocalLlamaRuntime(modelId, modelPath) {
  if (localLlamaRuntime?.modelId === modelId && localLlamaRuntime?.modelPath === modelPath) {
    return localLlamaRuntime
  }
  if (localLlamaRuntime?.model?.dispose) {
    await localLlamaRuntime.model.dispose().catch(() => {})
  }
  const { getLlama } = await import('node-llama-cpp')
  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath })
  localLlamaRuntime = { modelId, modelPath, llama, model }
  return localLlamaRuntime
}

async function localLlamaSystemPrompt(settings, request) {
  const toolSummary = request.tools?.length
    ? `\n\nUse the provided functions when you need to inspect or change project files. File mutations are routed through the desktop approval UI before they execute.`
    : ''
  return `${await buildArgusSystemPrompt(settings, request)}${toolSummary}`
}

function toLocalLlamaFunctions(tools = []) {
  if (!tools.length) return undefined
  return Object.fromEntries(
    tools
      .filter((tool) => tool?.function?.name)
      .map((tool) => [
        tool.function.name,
        {
          description: tool.function.description,
          params: tool.function.parameters,
          handler: () => ({ queuedForDesktopApproval: true }),
        },
      ])
  )
}

function localLlamaUserPrompt(messages = []) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      if (message.role === 'tool') {
        return `Tool result (${message.name || message.tool_call_id}):\n${message.content}`
      }
      return `${message.role.toUpperCase()}:\n${message.content || ''}`
    })
    .join('\n\n')
}

async function runAnthropicChat(settings, request, abortSignal, emit) {
  const apiKey = await loadCloudKey()
  const { system, messages } = toAnthropicMessages(request.messages)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: abortSignal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: settings.cloud.model,
      max_tokens: 4096,
      system,
      messages,
      tools: request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      })),
      stream: true,
    }),
  })
  if (!response.ok || !response.body) {
    throw new Error(`Anthropic request failed (${response.status}).`)
  }

  const toolBlocks = new Map()
  for await (const data of readSse(response.body)) {
    const payload = JSON.parse(data)
    if (payload.type === 'content_block_start' && payload.content_block?.type === 'tool_use') {
      toolBlocks.set(payload.index, {
        id: payload.content_block.id || `${request.requestId}_anthropic_tool_${payload.index}`,
        name: payload.content_block.name,
        argsText: '',
      })
    } else if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') {
      emit({ type: 'text', text: payload.delta.text })
    } else if (payload.type === 'content_block_delta' && payload.delta?.type === 'input_json_delta') {
      const block = toolBlocks.get(payload.index)
      if (block) {
        block.argsText += payload.delta.partial_json || ''
        emit({
          type: 'tool-call',
          toolCallId: block.id,
          toolName: block.name,
          argsText: block.argsText || '{}',
        })
      }
    }
  }
  emit({ type: 'done', finishReason: toolBlocks.size ? 'tool-calls' : 'stop' })
}

function toAnthropicMessages(messages) {
  const out = []
  let system = ''
  for (const message of messages) {
    if (message.role === 'system') {
      system += `${message.content}\n`
    } else if (message.role === 'tool') {
      out.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: message.tool_call_id,
          content: message.content,
        }],
      })
    } else {
      out.push({ role: message.role, content: message.content || '' })
    }
  }
  return { system: system.trim() || undefined, messages: out }
}

async function* readNdjson(body) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      yield JSON.parse(line)
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer)
}

async function* readSse(body) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data) yield data
    }
  }
}

async function executeAiFileTool(request) {
  const toolName = request?.toolName
  const args = request?.args || {}
  if (toolName === 'list_files') return { ok: true, message: 'Files listed.', data: await aiListFiles(request.rootPath, args.path || '') }
  if (toolName === 'read_file') return { ok: true, message: `Read ${args.path}.`, data: await aiReadFile(request.rootPath, args.path) }
  if (toolName === 'search_files') return { ok: true, message: 'Search complete.', data: await aiSearchFiles(request.rootPath, args.pattern, args.path || '') }
  if (toolName === 'write_file' || toolName === 'edit_file' || toolName === 'create_file' || toolName === 'create_folder' || toolName === 'delete_file') {
    const preview = await previewAiFileMutation(request)
    await applyAiMutation(request)
    return { ok: true, message: preview.summary, preview }
  }
  throw new Error(`Unknown AI file tool: ${toolName}`)
}

async function previewAiFileMutation(request) {
  const toolName = request?.toolName
  const args = request?.args || {}
  const rel = normalizeRelativePath(args.path)
  if (toolName === 'create_folder') assertVaultFolderPath(rel)
  else assertMarkdownFilePath(rel)
  const target = await resolveAiProjectPath(request.rootPath, rel)
  let oldContent = ''
  let newContent = ''
  let summary = ''

  if (toolName === 'write_file') {
    oldContent = await fsp.readFile(target, 'utf8')
    newContent = String(args.content ?? '')
    summary = `Overwrite ${rel}`
  } else if (toolName === 'edit_file') {
    oldContent = await fsp.readFile(target, 'utf8')
    const oldString = String(args.old_string ?? '')
    const newString = String(args.new_string ?? '')
    if (!oldString) throw new Error('old_string is required.')
    const count = oldContent.split(oldString).length - 1
    if (count !== 1) throw new Error(`Expected exactly one match for old_string, found ${count}.`)
    newContent = oldContent.replace(oldString, newString)
    summary = `Edit ${rel}`
  } else if (toolName === 'create_file') {
    newContent = String(args.content ?? '')
    const existingContent = await fsp.readFile(target, 'utf8').catch(() => null)
    if (existingContent !== null) {
      if (existingContent === newContent) {
        oldContent = existingContent
        summary = `Already exists ${rel}`
      } else {
        throw new Error(`File already exists with different content: ${rel}`)
      }
    } else {
      summary = `Create ${rel}`
    }
  } else if (toolName === 'create_folder') {
    const stat = await fsp.stat(target).catch(() => null)
    if (stat) {
      if (stat.isDirectory()) summary = `Folder already exists ${rel}`
      else throw new Error(`Path already exists and is not a folder: ${rel}`)
    } else {
      summary = `Create folder ${rel}`
    }
  } else if (toolName === 'delete_file') {
    oldContent = await fsp.readFile(target, 'utf8')
    newContent = ''
    summary = `Delete ${rel}`
  } else {
    throw new Error(`Tool ${toolName} does not create a mutation preview.`)
  }

  return {
    path: rel,
    operation: toolName,
    summary,
    diff: toolName === 'create_folder'
      ? `Create folder: ${rel}`
      : createTwoFilesPatch(rel, rel, oldContent, newContent, '', '', { context: 3 }),
  }
}

async function applyAiMutation(request) {
  const toolName = request?.toolName
  const args = request?.args || {}
  const rel = normalizeRelativePath(args.path)
  if (toolName === 'create_folder') assertVaultFolderPath(rel)
  else assertMarkdownFilePath(rel)
  const target = await resolveAiProjectPath(request.rootPath, rel)

  if (toolName === 'write_file') {
    const stat = await fsp.stat(target)
    if (!stat.isFile()) throw new Error(`File does not exist: ${rel}`)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, String(args.content ?? ''), 'utf8')
  } else if (toolName === 'edit_file') {
    const oldContent = await fsp.readFile(target, 'utf8')
    const oldString = String(args.old_string ?? '')
    const count = oldContent.split(oldString).length - 1
    if (count !== 1) throw new Error(`Expected exactly one match for old_string, found ${count}.`)
    await fsp.writeFile(target, oldContent.replace(oldString, String(args.new_string ?? '')), 'utf8')
  } else if (toolName === 'create_file') {
    const existingContent = await fsp.readFile(target, 'utf8').catch(() => null)
    const nextContent = String(args.content ?? '')
    if (existingContent !== null) {
      if (existingContent === nextContent) return
      throw new Error(`File already exists with different content: ${rel}`)
    }
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.writeFile(target, nextContent, 'utf8')
  } else if (toolName === 'create_folder') {
    await fsp.mkdir(target, { recursive: true })
  } else if (toolName === 'delete_file') {
    await fsp.unlink(target)
  }
}

function assertMarkdownFilePath(rel) {
  if (!rel || rel.endsWith('/')) throw new Error('A markdown file path is required.')
  if (path.basename(rel).startsWith('.')) throw new Error('AI file tools cannot mutate hidden files.')
  if (path.extname(rel).toLowerCase() !== '.md') {
    throw new Error('AI file tools can only create, edit, overwrite, or delete markdown files ending in .md.')
  }
}

function assertVaultFolderPath(rel) {
  if (!rel || rel.endsWith('/')) throw new Error('A folder path is required.')
  const base = path.basename(rel)
  if (base.startsWith('.')) throw new Error('AI file tools cannot create hidden folders.')
  if (path.extname(base)) throw new Error('Folder paths must not include a file extension.')
}

async function aiListFiles(rootPath, dir = '') {
  const root = resolveRoot(rootPath)
  const ig = await loadGitignore(root)
  const start = await resolveAiProjectPath(root, dir)
  const out = []

  async function visit(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      const rel = toVaultPath(root, full)
      if (entry.name === '.git' || ig.ignores(rel)) continue
      if (entry.isDirectory()) {
        out.push({ path: rel, name: entry.name, type: 'dir' })
        await visit(full)
      } else if (entry.isFile()) {
        const stat = await fsp.stat(full)
        out.push({ path: rel, name: entry.name, type: 'file', size: stat.size, lastModified: stat.mtimeMs })
      }
    }
  }

  await visit(start)
  return out
}

async function aiReadFile(rootPath, filePath) {
  const target = await resolveAiProjectPath(rootPath, filePath)
  const stat = await fsp.stat(target)
  if (!stat.isFile()) throw new Error('Path is not a file.')
  if (stat.size > 1_000_000) throw new Error('File is too large to read into chat.')
  const buffer = await fsp.readFile(target)
  if (buffer.includes(0)) throw new Error('Binary files cannot be read into chat.')
  return buffer.toString('utf8')
}

async function aiSearchFiles(rootPath, pattern, dir = '') {
  const root = resolveRoot(rootPath)
  const entries = await aiListFiles(root, dir)
  const matcher = createSearchMatcher(String(pattern || ''))
  const results = []
  for (const entry of entries.filter((item) => item.type === 'file')) {
    if (results.length >= 100) break
    const full = await resolveAiProjectPath(root, entry.path)
    const stat = await fsp.stat(full).catch(() => null)
    if (!stat || stat.size > 1_000_000) continue
    const text = await fsp.readFile(full, 'utf8').catch(() => null)
    if (text === null) continue
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (matcher(lines[i])) {
        results.push({ path: entry.path, line: i + 1, text: lines[i] })
        if (results.length >= 100) break
      }
    }
  }
  return results
}

function createSearchMatcher(pattern) {
  try {
    const regex = new RegExp(pattern, 'i')
    return (line) => regex.test(line)
  } catch {
    const lowered = pattern.toLowerCase()
    return (line) => line.toLowerCase().includes(lowered)
  }
}

async function loadGitignore(root) {
  const ig = ignore()
  ig.add('.git')
  const gitignore = await fsp.readFile(path.join(root, '.gitignore'), 'utf8').catch(() => '')
  if (gitignore) ig.add(gitignore)
  return ig
}

async function resolveAiProjectPath(rootPath, relPath = '') {
  const root = resolveRoot(rootPath)
  assertCurrentAiProjectRoot(root)
  const rel = normalizeRelativePath(relPath)
  const target = path.resolve(root, rel)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Resolved path is outside the project.')
  }

  const rootReal = await fsp.realpath(root)
  const existingReal = await nearestExistingRealpath(target)
  const realRelative = path.relative(rootReal, existingReal)
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error('Resolved path escapes the project through a symlink or junction.')
  }
  return target
}

function assertCurrentAiProjectRoot(root) {
  const resolved = path.resolve(root)
  if (!currentAiProjectRoot || path.resolve(currentAiProjectRoot) !== resolved) {
    throw new Error('AI file access is limited to the currently opened desktop vault.')
  }
}

async function nearestExistingRealpath(target) {
  let current = target
  while (true) {
    try {
      return await fsp.realpath(current)
    } catch {
      const parent = path.dirname(current)
      if (parent === current) throw new Error('Could not resolve project path.')
      current = parent
    }
  }
}

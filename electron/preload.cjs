const { contextBridge, ipcRenderer } = require('electron')

function markDesktopShell() {
  document.documentElement.classList.add('personal-md-desktop')
  document.documentElement.classList.add(`personal-md-platform-${process.platform}`)
  updateTitlebarMetrics()
  installTitlebarDoubleClickHandler()
}

function updateTitlebarMetrics() {
  const overlay = navigator.windowControlsOverlay
  const rect = overlay?.getTitlebarAreaRect?.()
  if (!rect) return
  const reservedRight = Math.max(0, window.innerWidth - rect.x - rect.width)
  if (reservedRight > 0) {
    document.documentElement.style.setProperty(
      '--desktop-window-controls-width',
      `${Math.ceil(reservedRight)}px`
    )
  }
}

if (document.documentElement) {
  markDesktopShell()
} else {
  window.addEventListener('DOMContentLoaded', markDesktopShell, { once: true })
}

window.addEventListener('resize', updateTitlebarMetrics)
navigator.windowControlsOverlay?.addEventListener?.('geometrychange', updateTitlebarMetrics)

function installTitlebarDoubleClickHandler() {
  if (installTitlebarDoubleClickHandler.installed) return
  installTitlebarDoubleClickHandler.installed = true

  window.addEventListener('dblclick', (event) => {
    if (!isCustomTitlebarDoubleClick(event)) return
    event.preventDefault()
    void ipcRenderer.invoke('window:toggleMaximize')
  })
}

function isCustomTitlebarDoubleClick(event) {
  if (event.button !== 0) return false
  const target = event.target
  if (!(target instanceof Element)) return false
  if (!target.closest('.personal-md-editor-toolbar, .personal-md-home-titlebar')) return false
  return !target.closest(
    [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="menuitem"]',
      '[role="checkbox"]',
      '[contenteditable="true"]',
      '[data-radix-collection-item]',
    ].join(',')
  )
}

contextBridge.exposeInMainWorld('personalMdDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  vault: {
    selectDirectory: (options) => ipcRenderer.invoke('vault:selectDirectory', options),
    createChildDirectory: (rootPath, name) =>
      ipcRenderer.invoke('vault:createChildDirectory', rootPath, name),
    init: (rootPath) => ipcRenderer.invoke('vault:init', rootPath),
    listFiles: (rootPath, dir) => ipcRenderer.invoke('vault:listFiles', rootPath, dir),
    readFile: (rootPath, filePath) => ipcRenderer.invoke('vault:readFile', rootPath, filePath),
    writeFile: (rootPath, filePath, content) =>
      ipcRenderer.invoke('vault:writeFile', rootPath, filePath, content),
    deleteFile: (rootPath, filePath) => ipcRenderer.invoke('vault:deleteFile', rootPath, filePath),
    renamePath: (rootPath, from, to) => ipcRenderer.invoke('vault:renamePath', rootPath, from, to),
    deletePath: (rootPath, entryPath) => ipcRenderer.invoke('vault:deletePath', rootPath, entryPath),
    commit: (rootPath, message, paths) => ipcRenderer.invoke('vault:commit', rootPath, message, paths),
    log: (rootPath, filePath, limit) => ipcRenderer.invoke('vault:log', rootPath, filePath, limit),
    diffContent: (rootPath, oid, filePath) =>
      ipcRenderer.invoke('vault:diffContent', rootPath, oid, filePath),
    currentBranch: (rootPath) => ipcRenderer.invoke('vault:currentBranch', rootPath),
  },
  localLlm: {
    testConnection: (config) => ipcRenderer.invoke('localLlm:testConnection', config),
    chatCompletion: (config, messages) =>
      ipcRenderer.invoke('localLlm:chatCompletion', config, messages),
  },
  ai: {
    getState: () => ipcRenderer.invoke('ai:getState'),
    getSettings: () => ipcRenderer.invoke('ai:getSettings'),
    updateSettings: (settings) => ipcRenderer.invoke('ai:updateSettings', settings),
    saveCloudApiKey: (apiKey) => ipcRenderer.invoke('ai:saveCloudApiKey', apiKey),
    clearCloudApiKey: () => ipcRenderer.invoke('ai:clearCloudApiKey'),
    startModelDownload: (modelId) => ipcRenderer.invoke('ai:startModelDownload', modelId),
    cancelModelDownload: (modelId) => ipcRenderer.invoke('ai:cancelModelDownload', modelId),
    deleteBundledModel: (modelId) => ipcRenderer.invoke('ai:deleteBundledModel', modelId),
    onModelDownloadEvent: (listener) => {
      const handler = (_event, payload) => listener(payload)
      ipcRenderer.on('ai:modelDownloadEvent', handler)
      return () => ipcRenderer.removeListener('ai:modelDownloadEvent', handler)
    },
    startChat: (request) => ipcRenderer.invoke('ai:startChat', request),
    cancelChat: (requestId) => ipcRenderer.invoke('ai:cancelChat', requestId),
    onChatEvent: (listener) => {
      const handler = (_event, payload) => listener(payload)
      ipcRenderer.on('ai:chatEvent', handler)
      return () => ipcRenderer.removeListener('ai:chatEvent', handler)
    },
    loadThread: (rootPath) => ipcRenderer.invoke('ai:loadThread', rootPath),
    appendThread: (request) => ipcRenderer.invoke('ai:appendThread', request),
    clearThread: (rootPath) => ipcRenderer.invoke('ai:clearThread', rootPath),
    executeFileTool: (request) => ipcRenderer.invoke('ai:executeFileTool', request),
    previewFileMutation: (request) => ipcRenderer.invoke('ai:previewFileMutation', request),
  },
  window: {
    setTransparency: (enabled) => ipcRenderer.invoke('window:setTransparency', enabled),
  },
})

const { contextBridge, ipcRenderer } = require('electron')

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
})

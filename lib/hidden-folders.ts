/**
 * Which folders the sidebar hides. This is a per vault display preference
 * kept in IndexedDB beside folder appearance; hiding never changes, moves or
 * renames anything in the vault.
 *
 * Folders whose name starts with a dot, such as `.github`, are hidden unless
 * the person chose to show them.
 */
export interface HiddenFolders {
  /** Folders the person hid. */
  hidden: string[]
  /** Dot folders the person chose to show. */
  shown: string[]
  /** Whether the sidebar is currently showing hidden folders, dimmed. */
  showHidden: boolean
}

export const NO_HIDDEN_FOLDERS: HiddenFolders = { hidden: [], shown: [], showHidden: false }

function folderAndAncestors(folder: string): string[] {
  const parts = folder.split('/').filter(Boolean)
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'))
}

function hiddenOnItsOwn(folder: string, state: HiddenFolders): boolean {
  if (state.hidden.includes(folder)) return true
  const name = folder.split('/').pop() ?? ''
  return name.startsWith('.') && !state.shown.includes(folder)
}

/** True when the folder, or a folder it sits in, is hidden. */
export function isFolderHidden(folder: string, state: HiddenFolders): boolean {
  return folderAndAncestors(folder).some((path) => hiddenOnItsOwn(path, state))
}

/** True when a file sits anywhere inside a hidden folder. */
export function isInHiddenFolder(file: string, state: HiddenFolders): boolean {
  const parent = file.split('/').slice(0, -1).join('/')
  return parent !== '' && isFolderHidden(parent, state)
}

/** True when this folder itself is hidden, rather than only a folder above it. */
export function isFolderHiddenItself(folder: string, state: HiddenFolders): boolean {
  return hiddenOnItsOwn(folder, state)
}

export function hideFolder(state: HiddenFolders, folder: string): HiddenFolders {
  return {
    ...state,
    hidden: state.hidden.includes(folder) ? state.hidden : [...state.hidden, folder].sort(),
    shown: state.shown.filter((path) => path !== folder),
  }
}

export function showFolder(state: HiddenFolders, folder: string): HiddenFolders {
  const name = folder.split('/').pop() ?? ''
  return {
    ...state,
    hidden: state.hidden.filter((path) => path !== folder),
    shown:
      name.startsWith('.') && !state.shown.includes(folder)
        ? [...state.shown, folder].sort()
        : state.shown,
  }
}

function movePath(path: string, from: string, to: string): string {
  if (path === from) return to
  if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`
  return path
}

export function renameHiddenFolder(state: HiddenFolders, from: string, to: string): HiddenFolders {
  return {
    ...state,
    hidden: state.hidden.map((path) => movePath(path, from, to)),
    shown: state.shown.map((path) => movePath(path, from, to)),
  }
}

export function removeHiddenFolder(state: HiddenFolders, folder: string): HiddenFolders {
  const keep = (path: string) => path !== folder && !path.startsWith(`${folder}/`)
  return { ...state, hidden: state.hidden.filter(keep), shown: state.shown.filter(keep) }
}

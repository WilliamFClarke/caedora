import { expect, test } from '@playwright/test'
import {
  hideFolder,
  isFolderHidden,
  isFolderHiddenItself,
  isInHiddenFolder,
  NO_HIDDEN_FOLDERS,
  removeHiddenFolder,
  renameHiddenFolder,
  showFolder,
} from '@/lib/hidden-folders'

test('dot folders and everything inside them are hidden by default', () => {
  expect(isFolderHidden('.github', NO_HIDDEN_FOLDERS)).toBe(true)
  expect(isFolderHidden('.github/t212', NO_HIDDEN_FOLDERS)).toBe(true)
  expect(isFolderHiddenItself('.github/t212', NO_HIDDEN_FOLDERS)).toBe(false)
  expect(isInHiddenFolder('.github/t212/index.md', NO_HIDDEN_FOLDERS)).toBe(true)
  expect(isFolderHidden('research', NO_HIDDEN_FOLDERS)).toBe(false)
  expect(isInHiddenFolder('welcome.md', NO_HIDDEN_FOLDERS)).toBe(false)
})

test('hiding and showing a folder', () => {
  const hidden = hideFolder(NO_HIDDEN_FOLDERS, 'research')
  expect(isFolderHidden('research', hidden)).toBe(true)
  expect(isInHiddenFolder('research/isa-review-2026-10.md', hidden)).toBe(true)
  expect(hideFolder(hidden, 'research').hidden).toEqual(['research'])

  expect(isFolderHidden('research', showFolder(hidden, 'research'))).toBe(false)
  // Showing a dot folder is remembered, so it stays visible.
  const github = showFolder(hidden, '.github')
  expect(isFolderHidden('.github', github)).toBe(false)
  expect(isFolderHidden('.github', hideFolder(github, '.github'))).toBe(true)
})

test('renaming and deleting folders carries the hidden state with them', () => {
  const hidden = hideFolder(hideFolder(NO_HIDDEN_FOLDERS, 'research'), 'research/old')
  const renamed = renameHiddenFolder(hidden, 'research', 'notes')
  expect(renamed.hidden).toEqual(['notes', 'notes/old'])
  expect(removeHiddenFolder(renamed, 'notes').hidden).toEqual([])
})

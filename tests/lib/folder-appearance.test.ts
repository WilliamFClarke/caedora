import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FOLDER_APPEARANCE,
  folderColorValue,
  folderIconComponent,
  randomFolderAppearance,
  suggestedFolderAppearance,
} from '@/lib/folder-appearance'

describe('folder appearance helpers', () => {
  it('returns deterministic suggestions from a folder path', () => {
    expect(suggestedFolderAppearance('health/medical')).toEqual(
      suggestedFolderAppearance('health/medical')
    )
    expect(suggestedFolderAppearance('health/medical').icon).toBe('heart')
  })

  it('falls back to default color and icon for unknown ids', () => {
    expect(folderColorValue('missing')).toBe(folderColorValue(DEFAULT_FOLDER_APPEARANCE.color))
    expect(folderIconComponent('missing')).toBe(folderIconComponent(DEFAULT_FOLDER_APPEARANCE.icon))
  })

  it('uses a stable seeded random appearance', () => {
    expect(randomFolderAppearance('projects')).toEqual(randomFolderAppearance('projects'))
  })
})

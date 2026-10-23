import { expect, test } from '@playwright/test'
import { avatarColour, avatarInitial } from '@/lib/avatar'

test('initial uses the first usable name, upper-cased', () => {
  expect(avatarInitial('will clarke')).toBe('W')
  expect(avatarInitial('', '  ', 'ada@example.com')).toBe('A')
  expect(avatarInitial(null, undefined)).toBe('?')
})

test('colour is stable for a seed and always from the palette', () => {
  expect(avatarColour('user_123')).toBe(avatarColour('user_123'))
  expect(avatarColour('user_123')).toMatch(/^#[0-9a-f]{6}$/)
  expect(avatarColour('')).toMatch(/^#[0-9a-f]{6}$/)
})

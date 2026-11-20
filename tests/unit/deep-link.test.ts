import { expect, test } from '@playwright/test'
import {
  isDeepLink,
  linkSlug,
  matchWorkout,
  notePathFromPathname,
  resolveNotePath,
  vaultUrl,
  workoutFromSearch,
} from '@/lib/deep-link'

test('a deep link is a /vault URL naming a note or the workout tracker', () => {
  expect(isDeepLink('/vault', '')).toBe(false)
  expect(isDeepLink('/vault/', '')).toBe(false)
  expect(isDeepLink('/vault/health/dashboard.md', '')).toBe(true)
  expect(isDeepLink('/vault', '?workout')).toBe(true)
  expect(isDeepLink('/', '?workout')).toBe(false)
})

test('note paths are decoded from the URL', () => {
  expect(notePathFromPathname('/vault')).toBeNull()
  expect(notePathFromPathname('/vault/health/dashboard.md')).toBe('health/dashboard.md')
  expect(notePathFromPathname('/vault/notes/my%20note.md')).toBe('notes/my note.md')
  expect(notePathFromPathname('/vault/health/')).toBe('health')
})

test('the workout parameter is absent, empty or names a workout', () => {
  expect(workoutFromSearch('')).toBeUndefined()
  expect(workoutFromSearch('?workout')).toBeNull()
  expect(workoutFromSearch('?workout=')).toBeNull()
  expect(workoutFromSearch('?workout=full-body-c-upper')).toBe('full-body-c-upper')
  expect(workoutFromSearch('?workout=Full%20body%20C%20upper')).toBe('Full body C upper')
})

test('a workout matches by its day value or its label', () => {
  const templates = [
    { day: 'full-body-c', label: 'Full body C' },
    { day: 'full-body-c-upper', label: 'Full body C upper' },
  ]
  expect(linkSlug('Full body C upper')).toBe('full-body-c-upper')
  expect(matchWorkout(templates, 'full-body-c-upper')?.day).toBe('full-body-c-upper')
  expect(matchWorkout(templates, 'Full body C upper')?.day).toBe('full-body-c-upper')
  expect(matchWorkout(templates, 'full_body_c')?.day).toBe('full-body-c')
  expect(matchWorkout(templates, 'leg day')).toBeNull()
  expect(matchWorkout(templates, '  ')).toBeNull()
})

test('a note link may leave off .md or differ in case', () => {
  const files = ['health/dashboard.md', 'health/Training-log.md']
  expect(resolveNotePath('health/dashboard.md', files)).toBe('health/dashboard.md')
  expect(resolveNotePath('health/dashboard', files)).toBe('health/dashboard.md')
  expect(resolveNotePath('health/training-log', files)).toBe('health/Training-log.md')
  expect(resolveNotePath('health/missing', files)).toBeNull()
})

test('vault URLs encode each path segment and the workout', () => {
  expect(vaultUrl(null)).toBe('/vault')
  expect(vaultUrl('health/dashboard.md')).toBe('/vault/health/dashboard.md')
  expect(vaultUrl('notes/my note.md')).toBe('/vault/notes/my%20note.md')
  expect(vaultUrl(null, null)).toBe('/vault?workout')
  expect(vaultUrl('health/dashboard.md', 'full-body-a')).toBe('/vault/health/dashboard.md?workout=full-body-a')
})

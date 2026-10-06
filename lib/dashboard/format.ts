import type { DatasetValue } from '../dataset'
import type { ValueSpec } from './evaluate'

export function formatValue(value: DatasetValue, spec: ValueSpec, options: { compact?: boolean } = {}): string {
  if (value === null || value === '') return '–'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') {
    if (spec.format === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
    return value
  }
  switch (spec.format) {
    case 'currency':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: spec.currency || 'GBP',
        notation: options.compact ? 'compact' : 'standard',
        maximumFractionDigits: options.compact ? 1 : 2,
        minimumFractionDigits: options.compact ? 0 : Number.isInteger(value) ? 0 : 2,
      }).format(value)
    case 'percent':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value * 100)}%`
    case 'percent-points':
      return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value)}%`
    case 'integer':
      return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value)
    default:
      return new Intl.NumberFormat('en-GB', {
        notation: options.compact ? 'compact' : 'standard',
        maximumFractionDigits: 2,
      }).format(value)
  }
}

export function formatDate(value: string, style: 'short' | 'long' = 'long'): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: style === 'long' ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

/** Formats a `YYYY-MM` month, as produced by `month(date)`, like "May 2026". */
export function formatMonth(value: string, style: 'short' | 'long' = 'long'): string {
  const date = new Date(`${value}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: style === 'long' ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Extension point for third-party data sources that populate the user's vault.
 * Example future integrations: Apple Health, shopping apps, calendar, banking.
 *
 * Each integration reads from an external source and writes markdown files
 * into the vault via the VaultProvider. Nothing is stored on our servers.
 *
 * No concrete integrations ship yet — only the shape is defined so the first
 * integration can be added without re-architecting.
 */
import type { ComponentType } from 'react'
import type { VaultProvider } from '../types'

export interface VaultIntegration {
  /** Stable identifier, e.g. "shopping-list", "apple-health". */
  id: string
  name: string
  description: string
  icon?: ComponentType<{ className?: string }>
  /** Optional settings UI. Receives the active provider. */
  configure?: ComponentType<{ provider: VaultProvider }>
  /** Pull data from the source and write markdown files into the vault. */
  sync: (provider: VaultProvider) => Promise<void>
}

export const integrationRegistry: VaultIntegration[] = []

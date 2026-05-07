'use client'

import { VaultContextProvider } from '@/lib/vault-context'
import { SettingsProvider } from '@/lib/settings-context'
import { TemplateMarketplaceButton } from '@/components/vault/template-marketplace-button'
import type { ReactNode } from 'react'

/**
 * Thin 'use client' boundary so the root layout (a Server Component) can wrap
 * children with the vault context without itself becoming a Client Component.
 */
export function VaultProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <VaultContextProvider>
        {children}
        <TemplateMarketplaceButton />
      </VaultContextProvider>
    </SettingsProvider>
  )
}

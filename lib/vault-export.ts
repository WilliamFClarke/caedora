import { exportBrowserBundle, exportBrowserBundleAsOkfZip } from '@/lib/storage'
import type { PersistedVaultState } from '@/lib/types'

export type VaultExportFormat = 'okf' | 'json'

export async function downloadBrowserVault(
  state: PersistedVaultState,
  format: VaultExportFormat
): Promise<void> {
  if (!state.browserBundleId) return
  const name = state.browserBundleName ?? 'Browser vault'
  const slug = slugForDownload(name)

  if (format === 'okf') {
    const blob = await exportBrowserBundleAsOkfZip(state.browserBundleId, slug)
    downloadBlob(blob, `${slug}.zip`)
  } else {
    const blob = await exportBrowserBundle(state.browserBundleId, name)
    downloadBlob(blob, `${slug}.caedora-vault.json`)
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function slugForDownload(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'caedora-vault'
}

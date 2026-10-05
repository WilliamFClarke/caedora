import { appendLog } from './okf'
import type { VaultProvider } from './types'

export type BundleLogAction =
  | 'Creation'
  | 'Update'
  | 'Move'
  | 'Deletion'
  | 'Ingest'
  | 'Query'
  | 'Lint'
  | 'Initialization'

export async function appendBundleLog(
  provider: VaultProvider,
  action: BundleLogAction,
  message: string,
  scope = ''
): Promise<void> {
  await appendLog(provider, action, message, scope)
}

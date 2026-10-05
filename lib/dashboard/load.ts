import { parseDataset, type Dataset } from '../dataset'
import { resolveBundleLink } from '../okf'
import type { VaultProvider } from '../types'
import type { DashboardData } from './evaluate'

/** Reads every Dataset a dashboard names, plus the Datasets their ref columns point at. */
export async function loadDashboardData(
  provider: Pick<VaultProvider, 'readFile'>,
  dashboardPath: string,
  sources: Record<string, string>,
  today = new Date()
): Promise<DashboardData> {
  const byPath: Record<string, Dataset> = {}
  const failures: Record<string, string> = {}

  const load = async (path: string): Promise<Dataset | null> => {
    if (byPath[path]) return byPath[path]
    if (path in failures) return null
    try {
      const raw = await provider.readFile(path)
      const dataset = parseDataset(path, raw)
      byPath[path] = dataset
      await Promise.all(
        dataset.schema.columns
          .filter((column) => column.type === 'ref' && column.to)
          .map((column) => {
            const target = resolveBundleLink(path, column.to!)
            return target ? load(target) : null
          })
      )
      return dataset
    } catch {
      failures[path] = `Could not read ${path}.`
      return null
    }
  }

  const resolved: DashboardData['sources'] = {}
  await Promise.all(
    Object.entries(sources).map(async ([alias, href]) => {
      const path = resolveBundleLink(dashboardPath, href)
      if (!path) {
        resolved[alias] = { error: `${href} is not a path inside this vault.` }
        return
      }
      const dataset = await load(path)
      resolved[alias] = dataset ?? { error: failures[path] ?? `Could not read ${path}.` }
    })
  )

  return { sources: resolved, byPath, today }
}

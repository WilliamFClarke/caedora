import { isMap, isSeq, parseDocument, YAMLMap, YAMLSeq, type Document } from 'yaml'
import { DASHBOARD_FENCE, locateDashboardBlock } from './spec'

/**
 * Layout edits rewrite the dashboard's YAML block in place. Item settings are
 * moved as YAML nodes, so their formatting and comments survive.
 */

export type LayoutEdit =
  | { kind: 'move-item'; from: { row: number; item: number }; to: { row: number; index: number } }
  | { kind: 'item-to-new-row'; from: { row: number; item: number }; at: number }
  | { kind: 'move-row'; from: number; to: number }
  | { kind: 'set-columns'; row: number; columns: number }

export function applyLayoutEdit(markdown: string, edit: LayoutEdit): string {
  const block = locateDashboardBlock(markdown)
  if (!block) return markdown
  const doc = parseDocument(block.value)
  if (doc.errors.length > 0) return markdown
  const rows = doc.get('rows')
  if (!isSeq(rows)) return markdown

  switch (edit.kind) {
    case 'move-item': {
      if (edit.from.row === edit.to.row && itemsOf(doc, rows.items[edit.from.row])?.items.length === 1) {
        return markdown
      }
      const node = takeItem(doc, rows, edit.from)
      if (!node) return markdown
      let target = edit.to.row
      // Removing an emptied row ahead of the target shifts it up by one.
      if (removeIfEmpty(rows, edit.from.row) && edit.from.row < target) target--
      const items = itemsOf(doc, rows.items[target])
      if (!items) return markdown
      let index = edit.to.index
      if (edit.from.row === edit.to.row && edit.from.item < index) index--
      items.items.splice(Math.max(0, Math.min(index, items.items.length)), 0, node)
      break
    }
    case 'item-to-new-row': {
      const node = takeItem(doc, rows, edit.from)
      if (!node) return markdown
      let at = edit.at
      if (removeIfEmpty(rows, edit.from.row) && edit.from.row < at) at--
      const row = new YAMLMap(doc.schema)
      row.set('columns', 1)
      const items = new YAMLSeq(doc.schema)
      items.items.push(node)
      row.set('items', items)
      rows.items.splice(Math.max(0, Math.min(at, rows.items.length)), 0, row)
      break
    }
    case 'move-row': {
      const [row] = rows.items.splice(edit.from, 1)
      if (row === undefined) return markdown
      rows.items.splice(Math.max(0, Math.min(edit.to, rows.items.length)), 0, row)
      break
    }
    case 'set-columns': {
      const row = rows.items[edit.row]
      if (!isMap(row)) return markdown
      row.set('columns', Math.min(4, Math.max(1, Math.round(edit.columns))))
      break
    }
  }

  const yaml = doc.toString({ lineWidth: 0 })
  const fence = markdown.slice(block.start, block.end).match(/^(`{3,}|~{3,})/)?.[1] ?? '```'
  return `${markdown.slice(0, block.start)}${fence}${DASHBOARD_FENCE}\n${yaml}${fence}${markdown.slice(block.end)}`
}

function itemsOf(doc: Document, row: unknown): YAMLSeq | null {
  if (isSeq(row)) return row
  if (!isMap(row)) return null
  const items = row.get('items')
  if (isSeq(items)) return items
  const created = new YAMLSeq(doc.schema)
  row.set('items', created)
  return created
}

function takeItem(doc: Document, rows: YAMLSeq, at: { row: number; item: number }): unknown {
  const items = itemsOf(doc, rows.items[at.row])
  if (!items || at.item < 0 || at.item >= items.items.length) return null
  return items.items.splice(at.item, 1)[0]
}

function removeIfEmpty(rows: YAMLSeq, index: number): boolean {
  const row = rows.items[index]
  const items = isSeq(row) ? row : isMap(row) ? row.get('items') : null
  if (isSeq(items) && items.items.length === 0) {
    rows.items.splice(index, 1)
    return true
  }
  return false
}

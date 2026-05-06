/**
 * Bidirectional bridge between markdown (on disk) and TipTap JSON (in editor).
 * Built directly on mdast via the already-installed remark packages so we add
 * no new dependencies. Covers the node types TipTap StarterKit + our enabled
 * extensions support: headings, paragraphs, blockquotes, lists, task lists,
 * code blocks, horizontal rules, tables, and inline marks (bold, italic,
 * strike, code, link, sub/sup via inline HTML).
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import type { Root, RootContent, PhrasingContent, TableRow, TableCell, ListItem, AlignType } from 'mdast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export interface TiptapDoc {
  type: 'doc'
  content: TiptapNode[]
}

// ─── Markdown → TipTap JSON ───────────────────────────────────────────────────

export function mdToTiptap(md: string): TiptapDoc {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md) as Root
  const content = tree.children
    .flatMap(mdastBlockToTiptap)
    .filter((n): n is TiptapNode => n !== null)
  // TipTap requires at least one block node
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

function mdastBlockToTiptap(node: RootContent): TiptapNode | TiptapNode[] | null {
  switch (node.type) {
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: node.depth },
        content: phrasingToTiptap(node.children),
      }
    case 'paragraph':
      return {
        type: 'paragraph',
        content: phrasingToTiptap(node.children),
      }
    case 'blockquote':
      return {
        type: 'blockquote',
        content: node.children
          .flatMap(mdastBlockToTiptap)
          .filter((n): n is TiptapNode => n !== null),
      }
    case 'list': {
      // GFM task list: every item has a boolean `checked`. Mixed-task lists
      // are rare; treat any task items as making the whole list a taskList.
      const items = node.children as ListItem[]
      const isTaskList = items.some((i) => i.checked !== null && i.checked !== undefined)
      if (isTaskList) {
        return {
          type: 'taskList',
          content: items.map((item) => ({
            type: 'taskItem',
            attrs: { checked: !!item.checked },
            content: item.children
              .flatMap(mdastBlockToTiptap)
              .filter((n): n is TiptapNode => n !== null),
          })),
        }
      }
      return {
        type: node.ordered ? 'orderedList' : 'bulletList',
        content: items.map((item) => ({
          type: 'listItem',
          content: item.children
            .flatMap(mdastBlockToTiptap)
            .filter((n): n is TiptapNode => n !== null),
        })),
      }
    }
    case 'code':
      return {
        type: 'codeBlock',
        attrs: node.lang ? { language: node.lang } : undefined,
        content: node.value ? [{ type: 'text', text: node.value }] : undefined,
      }
    case 'thematicBreak':
      return { type: 'horizontalRule' }
    case 'table': {
      const aligns: (AlignType | null)[] = node.align ?? []
      return {
        type: 'table',
        content: node.children.map((row: TableRow, rowIdx) => ({
          type: 'tableRow',
          content: row.children.map((cell: TableCell, colIdx) => {
            const isHeader = rowIdx === 0
            const align = aligns[colIdx] ?? null
            return {
              type: isHeader ? 'tableHeader' : 'tableCell',
              attrs: align ? { colspan: 1, rowspan: 1, colwidth: null } : undefined,
              content: [
                {
                  type: 'paragraph',
                  content: phrasingToTiptap(cell.children),
                },
              ],
            }
          }),
        })),
      }
    }
    case 'html':
      // Render raw HTML as a plain paragraph so we don't lose content.
      return { type: 'paragraph', content: [{ type: 'text', text: node.value }] }
    default:
      return null
  }
}

function phrasingToTiptap(nodes: PhrasingContent[]): TiptapNode[] {
  const out: TiptapNode[] = []
  // Track inline HTML <sub>/<sup> spans across sibling html+text+html triples.
  let subLevel = 0
  let supLevel = 0

  for (const n of nodes) {
    if (n.type === 'html') {
      const v = n.value.trim().toLowerCase()
      if (v === '<sub>') subLevel++
      else if (v === '</sub>') subLevel = Math.max(0, subLevel - 1)
      else if (v === '<sup>') supLevel++
      else if (v === '</sup>') supLevel = Math.max(0, supLevel - 1)
      // Unrecognised HTML: drop silently (rare for .md files we write).
      continue
    }
    const extraMarks: Array<{ type: string }> = []
    if (subLevel > 0) extraMarks.push({ type: 'subscript' })
    if (supLevel > 0) extraMarks.push({ type: 'superscript' })
    const converted = phrasingNodeToTiptap(n, extraMarks)
    if (Array.isArray(converted)) out.push(...converted)
    else if (converted) out.push(converted)
  }
  return out
}

function phrasingNodeToTiptap(
  node: PhrasingContent,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>
): TiptapNode[] | TiptapNode | null {
  switch (node.type) {
    case 'text':
      return { type: 'text', text: node.value, marks: marks.length ? marks : undefined }
    case 'strong':
      return node.children.flatMap((c) => {
        const r = phrasingNodeToTiptap(c, [...marks, { type: 'bold' }])
        return Array.isArray(r) ? r : r ? [r] : []
      })
    case 'emphasis':
      return node.children.flatMap((c) => {
        const r = phrasingNodeToTiptap(c, [...marks, { type: 'italic' }])
        return Array.isArray(r) ? r : r ? [r] : []
      })
    case 'delete':
      return node.children.flatMap((c) => {
        const r = phrasingNodeToTiptap(c, [...marks, { type: 'strike' }])
        return Array.isArray(r) ? r : r ? [r] : []
      })
    case 'inlineCode':
      return {
        type: 'text',
        text: node.value,
        marks: [...marks, { type: 'code' }],
      }
    case 'break':
      return { type: 'hardBreak' }
    case 'link':
      return node.children.flatMap((c) => {
        const r = phrasingNodeToTiptap(c, [
          ...marks,
          { type: 'link', attrs: { href: node.url, title: node.title ?? null } },
        ])
        return Array.isArray(r) ? r : r ? [r] : []
      })
    case 'image':
      return { type: 'text', text: node.alt ?? node.url, marks: marks.length ? marks : undefined }
    default:
      return null
  }
}

// ─── TipTap JSON → Markdown ───────────────────────────────────────────────────

export function tiptapToMd(doc: TiptapDoc): string {
  const children = (doc.content ?? [])
    .map(tiptapBlockToMdast)
    .filter((n): n is RootContent => n !== null)
  const tree: Root = { type: 'root', children }
  return unified()
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', fences: true, emphasis: '_', strong: '*' })
    .stringify(tree)
    .trimEnd() + '\n'
}

function tiptapBlockToMdast(node: TiptapNode): RootContent | null {
  switch (node.type) {
    case 'heading':
      return {
        type: 'heading',
        depth: Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6) as 1 | 2 | 3 | 4 | 5 | 6,
        children: tiptapInlineToMdast(node.content ?? []),
      }
    case 'paragraph':
      return {
        type: 'paragraph',
        children: tiptapInlineToMdast(node.content ?? []),
      }
    case 'blockquote':
      return {
        type: 'blockquote',
        children: (node.content ?? [])
          .map(tiptapBlockToMdast)
          .filter((n): n is RootContent => n !== null) as Array<
          Extract<RootContent, { type: 'paragraph' | 'heading' | 'blockquote' | 'list' | 'code' }>
        >,
      } as RootContent
    case 'bulletList':
    case 'orderedList':
      return {
        type: 'list',
        ordered: node.type === 'orderedList',
        spread: false,
        children: (node.content ?? []).map((item) => ({
          type: 'listItem',
          spread: false,
          children: (item.content ?? [])
            .map(tiptapBlockToMdast)
            .filter((n): n is RootContent => n !== null) as Array<
            Extract<RootContent, { type: 'paragraph' | 'list' | 'blockquote' | 'code' }>
          >,
        })),
      }
    case 'taskList':
      return {
        type: 'list',
        ordered: false,
        spread: false,
        children: (node.content ?? []).map((item) => ({
          type: 'listItem',
          spread: false,
          checked: Boolean(item.attrs?.checked),
          children: (item.content ?? [])
            .map(tiptapBlockToMdast)
            .filter((n): n is RootContent => n !== null) as Array<
            Extract<RootContent, { type: 'paragraph' | 'list' | 'blockquote' | 'code' }>
          >,
        })),
      }
    case 'table': {
      const rows = node.content ?? []
      return {
        type: 'table',
        align: [],
        children: rows.map((row) => ({
          type: 'tableRow',
          children: (row.content ?? []).map((cell) => ({
            type: 'tableCell',
            children: tiptapInlineToMdast(
              // Table cells wrap content in a paragraph — flatten for mdast.
              (cell.content ?? []).flatMap((c) =>
                c.type === 'paragraph' ? c.content ?? [] : [c]
              )
            ),
          })),
        })),
      } as RootContent
    }
    case 'codeBlock':
      return {
        type: 'code',
        lang: typeof node.attrs?.language === 'string' ? (node.attrs.language as string) : null,
        value: (node.content ?? []).map((c) => c.text ?? '').join(''),
      }
    case 'horizontalRule':
      return { type: 'thematicBreak' }
    default:
      return null
  }
}

function tiptapInlineToMdast(nodes: TiptapNode[]): PhrasingContent[] {
  const out: PhrasingContent[] = []
  for (const n of nodes) {
    if (n.type === 'hardBreak') {
      out.push({ type: 'break' })
      continue
    }
    if (n.type !== 'text' || !n.text) continue
    const marks = n.marks ?? []
    const markTypes = marks.map((m) => m.type)

    let node: PhrasingContent
    if (markTypes.includes('code')) {
      node = { type: 'inlineCode', value: n.text }
    } else {
      node = { type: 'text', value: n.text }
    }
    // Wrap HTML marks first (innermost), then link (outer), then formatting.
    if (markTypes.includes('subscript')) {
      out.push({ type: 'html', value: '<sub>' })
      out.push(node)
      out.push({ type: 'html', value: '</sub>' })
      continue
    }
    if (markTypes.includes('superscript')) {
      out.push({ type: 'html', value: '<sup>' })
      out.push(node)
      out.push({ type: 'html', value: '</sup>' })
      continue
    }
    if (markTypes.includes('bold')) node = { type: 'strong', children: [node] } as PhrasingContent
    if (markTypes.includes('italic')) node = { type: 'emphasis', children: [node] } as PhrasingContent
    if (markTypes.includes('strike')) node = { type: 'delete', children: [node] } as PhrasingContent
    const linkMark = marks.find((m) => m.type === 'link')
    if (linkMark) {
      const href = String(linkMark.attrs?.href ?? '')
      const title = linkMark.attrs?.title
      node = {
        type: 'link',
        url: href,
        title: typeof title === 'string' ? title : null,
        children: [node],
      } as PhrasingContent
    }
    out.push(node)
  }
  return out
}

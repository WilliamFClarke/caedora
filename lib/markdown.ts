/**
 * Bidirectional bridge between markdown (on disk) and TipTap JSON (in editor).
 * Built directly on mdast via the already-installed remark packages so we add
 * no new dependencies. Covers the node types TipTap StarterKit supports.
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import type { Root, RootContent, PhrasingContent } from 'mdast'

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
    .map(mdastBlockToTiptap)
    .filter((n): n is TiptapNode => n !== null)
  // TipTap requires at least one block node
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

function mdastBlockToTiptap(node: RootContent): TiptapNode | null {
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
          .map(mdastBlockToTiptap)
          .filter((n): n is TiptapNode => n !== null),
      }
    case 'list':
      return {
        type: node.ordered ? 'orderedList' : 'bulletList',
        content: node.children.map((item) => ({
          type: 'listItem',
          content: item.children
            .map(mdastBlockToTiptap)
            .filter((n): n is TiptapNode => n !== null),
        })),
      }
    case 'code':
      return {
        type: 'codeBlock',
        attrs: node.lang ? { language: node.lang } : undefined,
        content: node.value ? [{ type: 'text', text: node.value }] : undefined,
      }
    case 'thematicBreak':
      return { type: 'horizontalRule' }
    case 'html':
      // Render raw HTML as a plain paragraph so we don't lose content.
      return { type: 'paragraph', content: [{ type: 'text', text: node.value }] }
    default:
      return null
  }
}

function phrasingToTiptap(nodes: PhrasingContent[]): TiptapNode[] {
  const out: TiptapNode[] = []
  for (const n of nodes) {
    const converted = phrasingNodeToTiptap(n, [])
    if (Array.isArray(converted)) out.push(...converted)
    else if (converted) out.push(converted)
  }
  return out
}

function phrasingNodeToTiptap(
  node: PhrasingContent,
  marks: Array<{ type: string }>
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
      // StarterKit has no link mark; render as plain text with the URL.
      return node.children.flatMap((c) => {
        const r = phrasingNodeToTiptap(c, marks)
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
    const marks = n.marks?.map((m) => m.type) ?? []
    let node: PhrasingContent
    if (marks.includes('code')) {
      node = { type: 'inlineCode', value: n.text }
    } else {
      node = { type: 'text', value: n.text }
    }
    if (marks.includes('bold')) node = { type: 'strong', children: [node] } as PhrasingContent
    if (marks.includes('italic')) node = { type: 'emphasis', children: [node] } as PhrasingContent
    if (marks.includes('strike')) node = { type: 'delete', children: [node] } as PhrasingContent
    out.push(node)
  }
  return out
}

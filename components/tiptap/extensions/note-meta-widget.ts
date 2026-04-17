/**
 * Places a stable DOM anchor as a ProseMirror widget decoration directly
 * after the first H1 in the document. Callers portal React content into
 * the anchor — keeping the meta UI (word count, tags, star) in the editor
 * flow while still living in React-land.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import type { Node as ProseNode } from '@tiptap/pm/model'

export interface NoteMetaWidgetOptions {
  onAnchorChange?: (el: HTMLElement | null) => void
}

const anchorByView = new WeakMap<EditorView, HTMLElement>()

function ensureAnchor(view: EditorView, notify?: (el: HTMLElement | null) => void): HTMLElement {
  const existing = anchorByView.get(view)
  if (existing) return existing
  const el = document.createElement('div')
  el.setAttribute('data-note-meta-anchor', '')
  el.className = 'note-meta-anchor'
  el.contentEditable = 'false'
  anchorByView.set(view, el)
  // Defer — widget is being constructed inside a decoration factory.
  queueMicrotask(() => notify?.(el))
  return el
}

function findFirstH1End(doc: ProseNode): number | null {
  let pos: number | null = null
  doc.descendants((node, nodePos) => {
    if (pos !== null) return false
    if (node.type.name === 'heading' && node.attrs.level === 1) {
      pos = nodePos + node.nodeSize
      return false
    }
    return true
  })
  return pos
}

export const NoteMetaWidget = Extension.create<NoteMetaWidgetOptions>({
  name: 'noteMetaWidget',

  addOptions() {
    return {
      onAnchorChange: undefined,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const key = new PluginKey('noteMetaWidget')
    return [
      new Plugin({
        key,
        view(view) {
          return {
            destroy() {
              const el = anchorByView.get(view)
              anchorByView.delete(view)
              if (el) options.onAnchorChange?.(null)
            },
          }
        },
        props: {
          decorations(state) {
            const pos = findFirstH1End(state.doc)
            if (pos === null) return DecorationSet.empty
            const decoration = Decoration.widget(
              pos,
              (view) => ensureAnchor(view, options.onAnchorChange),
              { side: 1, ignoreSelection: true, key: 'note-meta-widget' }
            )
            return DecorationSet.create(state.doc, [decoration])
          },
        },
      }),
    ]
  },
})

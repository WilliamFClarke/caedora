'use client'

import { useMemo } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { RichTextEditorDemo } from '@/components/tiptap/rich-text-editor'
import { mdToTiptap, tiptapToMd, type TiptapDoc } from '@/lib/markdown'

interface EditorProps {
  initialMarkdown: string
  onChange: (markdown: string) => void
  fileKey: string
  onMetaAnchorChange?: (el: HTMLElement | null) => void
}

export function Editor({ initialMarkdown, onChange, fileKey, onMetaAnchorChange }: EditorProps) {
  const initialContent = useMemo(
    () => mdToTiptap(initialMarkdown) as unknown,
    [fileKey],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  )

  return (
    <RichTextEditorDemo
      className="h-full border-0"
      contentKey={fileKey}
      content={initialContent}
      onMetaAnchorChange={onMetaAnchorChange}
      onUpdate={(editor: TiptapEditor) => {
        const json = editor.getJSON() as unknown as TiptapDoc
        onChange(tiptapToMd(json))
      }}
    />
  )
}

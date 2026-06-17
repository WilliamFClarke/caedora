'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { RichTextEditorDemo } from '@/components/tiptap/rich-text-editor'
import { mdToTiptap, tiptapToMd, type TiptapDoc } from '@/lib/markdown'

interface EditorProps {
  initialMarkdown: string
  onChange: (markdown: string) => void
  fileKey: string
  contentRevision?: number
  onMetaAnchorChange?: (el: HTMLElement | null) => void
  documentHeader?: ReactNode
}

export function Editor({
  initialMarkdown,
  onChange,
  fileKey,
  contentRevision = 0,
  onMetaAnchorChange,
  documentHeader,
}: EditorProps) {
  const initialContent = useMemo(
    () => mdToTiptap(initialMarkdown) as unknown,
    [initialMarkdown],
  )

  return (
    <RichTextEditorDemo
      className="h-full border-0"
      contentKey={fileKey}
      contentRevision={contentRevision}
      content={initialContent}
      onMetaAnchorChange={onMetaAnchorChange}
      documentHeader={documentHeader}
      onUpdate={(editor: TiptapEditor) => {
        const json = editor.getJSON() as unknown as TiptapDoc
        onChange(tiptapToMd(json))
      }}
    />
  )
}

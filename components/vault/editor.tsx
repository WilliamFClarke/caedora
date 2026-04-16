'use client'

import { useMemo } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'
import { mdToTiptap, tiptapToMd, type TiptapDoc } from '@/lib/markdown'

interface EditorProps {
  initialMarkdown: string
  onChange: (markdown: string) => void
  fileKey: string
}

export function Editor({ initialMarkdown, onChange, fileKey }: EditorProps) {
  const initialContent = useMemo(
    () => mdToTiptap(initialMarkdown) as unknown,
    [fileKey],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  )

  return (
    <SimpleEditor
      contentKey={fileKey}
      content={initialContent}
      onUpdate={(editor: TiptapEditor) => {
        const json = editor.getJSON() as unknown as TiptapDoc
        onChange(tiptapToMd(json))
      }}
    />
  )
}

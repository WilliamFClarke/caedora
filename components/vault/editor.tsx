'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect, useRef } from 'react'
import { mdToTiptap, tiptapToMd, type TiptapDoc } from '@/lib/markdown'
import { EditorToolbar } from './editor-toolbar'

interface EditorProps {
  /** Markdown loaded from disk. Changes to this prop load a new document. */
  initialMarkdown: string
  /** Called whenever the editor content changes, with the new markdown. */
  onChange: (markdown: string) => void
  /** Stable key (e.g. file path) — used to detect file switches. */
  fileKey: string
}

export function Editor({ initialMarkdown, onChange, fileKey }: EditorProps) {
  const loadedKey = useRef<string | null>(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: mdToTiptap(initialMarkdown) as unknown as Record<string, unknown>,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-10rem)] px-12 py-10',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as unknown as TiptapDoc
      onChange(tiptapToMd(json))
    },
    immediatelyRender: false,
  })

  // Reload content when file switches
  useEffect(() => {
    if (!editor) return
    if (loadedKey.current === fileKey) return
    loadedKey.current = fileKey
    editor.commands.setContent(mdToTiptap(initialMarkdown) as unknown as Record<string, unknown>, false)
  }, [editor, fileKey, initialMarkdown])

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

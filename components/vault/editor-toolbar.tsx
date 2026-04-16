'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Link as LinkIcon,
  Minus,
  Undo2,
  Redo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
}

type Level = 1 | 2 | 3

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const blockValue: string = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p'

  const setBlock = (value: string) => {
    const chain = editor.chain().focus()
    if (value === 'p') chain.setParagraph().run()
    else chain.toggleHeading({ level: Number(value.slice(1)) as Level }).run()
  }

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const prev = (editor.getAttributes('link').href as string) ?? ''
    const url = window.prompt('Enter URL', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b px-3 py-2 backdrop-blur">
      <select
        value={blockValue}
        onChange={(e) => setBlock(e.target.value)}
        className="bg-background hover:bg-accent h-8 rounded-md border px-2 text-sm focus:outline-none focus-visible:ring-1"
        aria-label="Text style"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <Divider />

      <TbBtn
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </TbBtn>
      <TbBtn
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </TbBtn>
      <TbBtn
        label="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </TbBtn>
      <TbBtn
        label="Inline code"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-4" />
      </TbBtn>
      <TbBtn label="Link" active={editor.isActive('link')} onClick={toggleLink}>
        <LinkIcon className="size-4" />
      </TbBtn>

      <Divider />

      <TbBtn
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </TbBtn>
      <TbBtn
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </TbBtn>
      <TbBtn
        label="Task list"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleList('taskList', 'taskItem').run()}
      >
        <ListChecks className="size-4" />
      </TbBtn>

      <Divider />

      <TbBtn
        label="Blockquote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </TbBtn>
      <TbBtn
        label="Code block"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="size-4" />
      </TbBtn>
      <TbBtn
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-4" />
      </TbBtn>

      <Divider />

      <TbBtn
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </TbBtn>
      <TbBtn
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </TbBtn>
    </div>
  )
}

function Divider() {
  return <div className="bg-border mx-1 h-5 w-px" />
}

interface TbBtnProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function TbBtn({ label, active, disabled, onClick, children }: TbBtnProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn('size-8', active && 'bg-accent text-accent-foreground')}
    >
      {children}
    </Button>
  )
}

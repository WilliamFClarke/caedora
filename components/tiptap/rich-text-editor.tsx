"use client";
import * as React from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import "./tiptap.css";
import { cn } from "@/lib/utils";
import { ImageExtension } from "@/components/tiptap/extensions/image";
import { ImagePlaceholder } from "@/components/tiptap/extensions/image-placeholder";
import SearchAndReplace from "@/components/tiptap/extensions/search-and-replace";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, type Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TipTapFloatingMenu } from "@/components/tiptap/extensions/floating-menu";
import { FloatingToolbar } from "@/components/tiptap/extensions/floating-toolbar";
import { EditorToolbar } from "./toolbars/editor-toolbar";
import Placeholder from "@tiptap/extension-placeholder";
import { content } from "@/lib/content";

const extensions = [
  StarterKit.configure({
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal",
      },
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc",
      },
    },
    heading: {
      levels: [1, 2, 3, 4],
    },
  }),
  Placeholder.configure({
    emptyNodeClass: "is-editor-empty",
    placeholder: ({ node }) => {
      switch (node.type.name) {
        case "heading":
          return `Heading ${node.attrs.level}`;
        case "detailsSummary":
          return "Section title";
        case "codeBlock":
          // never show the placeholder when editing code
          return "";
        default:
          return "Write, type '/' for commands";
      }
    },
    includeChildren: false,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  TextStyle,
  Subscript,
  Superscript,
  Underline,
  Link,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  ImageExtension,
  ImagePlaceholder,
  SearchAndReplace,
  Typography,
];

export interface RichTextEditorProps {
  className?: string;
  content?: unknown;
  onUpdate?: (editor: TiptapEditor) => void;
  contentKey?: string;
}

export function RichTextEditorDemo({
  className,
  content: contentProp,
  onUpdate,
  contentKey,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensions as Extension[],
    content: contentProp ?? content,
    editorProps: {
      attributes: {
        class: "max-w-full focus:outline-none",
      },
    },
    onUpdate: onUpdate ? ({ editor }) => onUpdate(editor) : undefined,
  });

  const loadedKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!editor || contentKey === undefined) return;
    if (loadedKey.current === contentKey) return;
    loadedKey.current = contentKey;
    editor.commands.setContent((contentProp ?? content) as Parameters<typeof editor.commands.setContent>[0], false);
  }, [editor, contentKey, contentProp]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden border bg-card",
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <FloatingToolbar editor={editor} />
      <TipTapFloatingMenu editor={editor} />
      <EditorContent
        editor={editor}
        className="min-h-0 w-full min-w-full flex-1 cursor-text overflow-y-auto sm:p-6"
      />
    </div>
  );
}

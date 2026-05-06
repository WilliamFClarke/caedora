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
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { EditorContent, type Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TipTapFloatingMenu } from "@/components/tiptap/extensions/floating-menu";
import { FloatingToolbar } from "@/components/tiptap/extensions/floating-toolbar";
import { EditorToolbar } from "./toolbars/editor-toolbar";
import Placeholder from "@tiptap/extension-placeholder";
import { NoteMetaWidget } from "@/components/tiptap/extensions/note-meta-widget";
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
    placeholder: ({ editor, node, pos }) => {
      // Suppress inside structural containers — tables and task items already
      // carry their own visual structure, so "Write, type '/' ..." inside a
      // cell or next to a checkbox just overlaps borders and confuses users.
      try {
        const $pos = editor.state.doc.resolve(pos);
        for (let d = $pos.depth; d > 0; d--) {
          const ancestor = $pos.node(d).type.name;
          if (
            ancestor === "tableCell" ||
            ancestor === "tableHeader" ||
            ancestor === "taskItem"
          ) {
            return "";
          }
        }
      } catch {
        // resolve() can throw mid-transaction; fall through to default.
      }
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
  Table.configure({ resizable: true, HTMLAttributes: { class: "tiptap-table" } }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList.configure({ HTMLAttributes: { class: "tiptap-task-list" } }),
  TaskItem.configure({ nested: true, HTMLAttributes: { class: "tiptap-task-item" } }),
];

export interface RichTextEditorProps {
  className?: string;
  content?: unknown;
  onUpdate?: (editor: TiptapEditor) => void;
  contentKey?: string;
  onMetaAnchorChange?: (el: HTMLElement | null) => void;
}

export function RichTextEditorDemo({
  className,
  content: contentProp,
  onUpdate,
  contentKey,
  onMetaAnchorChange,
}: RichTextEditorProps) {
  const anchorCbRef = React.useRef(onMetaAnchorChange);
  React.useEffect(() => {
    anchorCbRef.current = onMetaAnchorChange;
  }, [onMetaAnchorChange]);

  const allExtensions = React.useMemo(
    () => [
      ...extensions,
      NoteMetaWidget.configure({
        onAnchorChange: (el) => anchorCbRef.current?.(el),
      }),
    ],
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: allExtensions as Extension[],
    content: contentProp ?? content,
    editorProps: {
      attributes: {
        class: "max-w-full focus:outline-none",
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "sentences",
        "data-form-type": "other",
        spellcheck: "true",
      },
    },
    onUpdate: onUpdate ? ({ editor }) => onUpdate(editor) : undefined,
  });

  const loadedKey = React.useRef<string | null>(null);
  // useLayoutEffect so setContent runs in the same commit as the prop change —
  // otherwise the browser paints once with the new file's key/meta but the old
  // TipTap DOM, producing a visible one-frame flicker on file switch.
  React.useLayoutEffect(() => {
    if (!editor || contentKey === undefined) return;
    if (loadedKey.current === contentKey) return;
    const isFirstLoad = loadedKey.current === null;
    loadedKey.current = contentKey;
    editor.commands.setContent(
      (contentProp ?? content) as Parameters<typeof editor.commands.setContent>[0],
      false
    );

    // If the doc ends in a heading (typical for a brand-new "# Title\n\n" note),
    // append an empty paragraph so clicks below the heading have somewhere to
    // land the cursor and the user can just start typing.
    const doc = editor.state.doc;
    const lastChild = doc.lastChild;
    if (lastChild && lastChild.type.name === "heading") {
      editor
        .chain()
        .insertContentAt(doc.content.size, { type: "paragraph" })
        .run();
    }

    // On a freshly-opened note whose body is empty (only the H1), put the
    // cursor in the body paragraph instead of the title so the user can type
    // immediately without having to click past the heading. We only do this
    // when switching into a file (contentKey change), not on every re-render,
    // and we skip the initial mount so the default-content demo isn't affected.
    if (!isFirstLoad) {
      const bodyIsEmpty =
        editor.state.doc.childCount <= 2 &&
        editor.state.doc.lastChild?.type.name === "paragraph" &&
        editor.state.doc.lastChild?.content.size === 0;
      if (bodyIsEmpty) {
        editor.commands.focus("end");
      }
    }
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
      {/* Clicks in the empty space below the document content land on this
          wrapper, not on the ProseMirror element. Detect that and move the
          cursor to the end so the user can start typing immediately. */}
      <div
        className="min-h-0 w-full min-w-full flex-1 cursor-text overflow-y-auto sm:p-6"
        onClick={(e) => {
          if (editor.view.dom.contains(e.target as Node)) return;
          editor.commands.focus("end");
        }}
      >
        <EditorContent editor={editor} className="w-full min-w-full" />
      </div>
    </div>
  );
}

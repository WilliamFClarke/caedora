"use client";

import { BubbleMenu, type Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  Rows3,
  Trash2,
} from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Finds the DOM table that holds the cursor so the menu can sit just above
 * the whole table rather than over the selected text.
 */
function tableElementAtSelection(view: EditorView, state: EditorState) {
  const { node } = view.domAtPos(state.selection.from);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest("table") ?? null;
}

type TableAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (editor: Editor) => boolean;
  can: (editor: Editor) => boolean;
  destructive?: boolean;
};

const ROW_ACTIONS: TableAction[] = [
  {
    label: "Add row above",
    icon: ArrowUpToLine,
    run: (editor) => editor.chain().focus().addRowBefore().run(),
    can: (editor) => editor.can().addRowBefore(),
  },
  {
    label: "Add row below",
    icon: ArrowDownToLine,
    run: (editor) => editor.chain().focus().addRowAfter().run(),
    can: (editor) => editor.can().addRowAfter(),
  },
  {
    label: "Delete row",
    icon: Rows3,
    run: (editor) => editor.chain().focus().deleteRow().run(),
    can: (editor) => editor.can().deleteRow(),
    destructive: true,
  },
];

const COLUMN_ACTIONS: TableAction[] = [
  {
    label: "Add column left",
    icon: ArrowLeftToLine,
    run: (editor) => editor.chain().focus().addColumnBefore().run(),
    can: (editor) => editor.can().addColumnBefore(),
  },
  {
    label: "Add column right",
    icon: ArrowRightToLine,
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
    can: (editor) => editor.can().addColumnAfter(),
  },
  {
    label: "Delete column",
    icon: Columns3,
    run: (editor) => editor.chain().focus().deleteColumn().run(),
    can: (editor) => editor.can().deleteColumn(),
    destructive: true,
  },
];

const TABLE_ACTIONS: TableAction[] = [
  {
    label: "Delete table",
    icon: Trash2,
    run: (editor) => editor.chain().focus().deleteTable().run(),
    can: (editor) => editor.can().deleteTable(),
    destructive: true,
  },
];

/**
 * A small bar that appears above a table whenever the cursor is inside it,
 * with one click buttons to add or delete rows and columns.
 */
export function TableMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      updateDelay={0}
      shouldShow={({ editor, view, state }) =>
        editor.isEditable &&
        editor.isActive("table") &&
        tableElementAtSelection(view, state) !== null
      }
      tippyOptions={{
        placement: "top-start",
        maxWidth: "none",
        offset: [0, 8],
        zIndex: 30,
        getReferenceClientRect: () => {
          const table = tableElementAtSelection(editor.view, editor.state);
          return (table ?? editor.view.dom).getBoundingClientRect();
        },
        popperOptions: {
          modifiers: [{ name: "flip", options: { fallbackPlacements: ["bottom-start"] } }],
        },
      }}
    >
      <div
        role="toolbar"
        aria-label="Table tools"
        className="flex items-center gap-0.5 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        <ActionGroup editor={editor} actions={ROW_ACTIONS} />
        <Separator orientation="vertical" className="mx-1 h-6 data-[orientation=vertical]:h-6" />
        <ActionGroup editor={editor} actions={COLUMN_ACTIONS} />
        <Separator orientation="vertical" className="mx-1 h-6 data-[orientation=vertical]:h-6" />
        <ActionGroup editor={editor} actions={TABLE_ACTIONS} />
      </div>
    </BubbleMenu>
  );
}

function ActionGroup({ editor, actions }: { editor: Editor; actions: TableAction[] }) {
  return (
    <>
      {actions.map(({ label, icon: Icon, run, can, destructive }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          disabled={!can(editor)}
          className={
            destructive
              ? "h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "h-8 w-8 p-0"
          }
          // Keep the cursor in the table so the command knows which row or
          // column to act on.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(editor)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </>
  );
}

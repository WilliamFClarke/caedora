"use client";

import React from "react";
import { Editor } from "@tiptap/core";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlignmentTooolbar } from "./alignment";
import { BlockquoteToolbar } from "./blockquote";
import { BoldToolbar } from "./bold";
import { BulletListToolbar } from "./bullet-list";
import { CodeBlockToolbar } from "./code-block";
import { CodeToolbar } from "./code";
import { ColorHighlightToolbar } from "./color-and-highlight";
import { HeadingsToolbar } from "./headings";
import { HorizontalRuleToolbar } from "./horizontal-rule";
import { ImagePlaceholderToolbar } from "./image-placeholder-toolbar";
import { ItalicToolbar } from "./italic";
import { LinkToolbar } from "./link";
import { MoreFormattingToolbar } from "./more-formatting";
import { OrderedListToolbar } from "./ordered-list";
import { RedoToolbar } from "./redo";
import { SearchAndReplaceToolbar } from "./search-and-replace-toolbar";
import { TableToolbar } from "./table";
import { TaskListToolbar } from "./task-list";
import { ToolbarProvider } from "./toolbar-provider";
import { UnderlineToolbar } from "./underline";
import { UndoToolbar } from "./undo";

export const EditorToolbar = ({ editor }: { editor: Editor }) => {
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const collapseLevel = useToolbarCollapseLevel(toolbarRef);

  return (
    <div className="sticky top-0 z-20 w-full min-w-0 border-b bg-card">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <div ref={toolbarRef} className="flex w-full min-w-0 max-w-full items-center overflow-hidden px-2 py-1">
            <div
              className="flex min-w-0 flex-1 basis-0 items-center gap-0.5 overflow-hidden"
            >
              <SidebarTrigger className="size-8 shrink-0" />
              <ToolbarDivider className="shrink-0" />

              <span className={hideAt(collapseLevel, 5)}>
                <UndoToolbar />
              </span>
              <span className={hideAt(collapseLevel, 5)}>
                <RedoToolbar />
              </span>
              <ToolbarDivider className={hideAt(collapseLevel, 5)} />

              <span className={hideAt(collapseLevel, 5)}>
                <HeadingsToolbar />
              </span>
              <span className={hideAt(collapseLevel, 4)}>
                <BlockquoteToolbar />
              </span>
              <span className={hideAt(collapseLevel, 4)}>
                <CodeToolbar />
              </span>
              <span className={hideAt(collapseLevel, 4)}>
                <CodeBlockToolbar />
              </span>
              <ToolbarDivider className={hideAt(collapseLevel, 4)} />

              <BoldToolbar />
              <ItalicToolbar />
              <span className={hideAt(collapseLevel, 4)}>
                <UnderlineToolbar />
              </span>
              <LinkToolbar />
              <MoreFormattingToolbar />
              <ToolbarDivider className={hideAt(collapseLevel, 3)} />

              <span className={hideAt(collapseLevel, 3)}>
                <BulletListToolbar />
              </span>
              <span className={hideAt(collapseLevel, 3)}>
                <OrderedListToolbar />
              </span>
              <span className={hideAt(collapseLevel, 3)}>
                <TaskListToolbar />
              </span>
              <span className={hideAt(collapseLevel, 2)}>
                <TableToolbar />
              </span>
              <span className={hideAt(collapseLevel, 2)}>
                <HorizontalRuleToolbar />
              </span>
              <ToolbarDivider className={hideAt(collapseLevel, 2)} />

              <span className={hideAt(collapseLevel, 1)}>
                <AlignmentTooolbar />
              </span>
              <span className={hideAt(collapseLevel, 1)}>
                <ImagePlaceholderToolbar />
              </span>
              <span className={hideAt(collapseLevel, 1)}>
                <ColorHighlightToolbar />
              </span>

              <span className={hideAt(collapseLevel, 1)}>
                <SearchAndReplaceToolbar />
              </span>
            </div>

            <div className="ml-auto shrink-0">
              <ResponsiveOverflowToolbar collapseLevel={collapseLevel} />
            </div>
          </div>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

function ResponsiveOverflowToolbar({ collapseLevel }: { collapseLevel: number }) {
  if (collapseLevel === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More editor tools"
          className="h-8 w-8 shrink-0 p-0"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[min(28rem,calc(100vh-5rem))] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto p-2"
      >
        <OverflowSection label="History" hidden={collapseLevel < 5}>
          <UndoToolbar />
          <RedoToolbar />
        </OverflowSection>

        <OverflowSection label="Text blocks" hidden={collapseLevel < 4}>
          <span className={showAt(collapseLevel, 5)}>
            <HeadingsToolbar />
          </span>
          <span className={showAt(collapseLevel, 4)}>
            <BlockquoteToolbar />
          </span>
          <span className={showAt(collapseLevel, 4)}>
            <CodeToolbar />
          </span>
          <span className={showAt(collapseLevel, 4)}>
            <CodeBlockToolbar />
          </span>
        </OverflowSection>

        <OverflowSection label="Formatting" hidden={collapseLevel < 4}>
          <UnderlineToolbar />
        </OverflowSection>

        <OverflowSection label="Lists and inserts" hidden={collapseLevel < 2}>
          <span className={showAt(collapseLevel, 3)}>
            <BulletListToolbar />
          </span>
          <span className={showAt(collapseLevel, 3)}>
            <OrderedListToolbar />
          </span>
          <span className={showAt(collapseLevel, 3)}>
            <TaskListToolbar />
          </span>
          <span className={showAt(collapseLevel, 2)}>
            <TableToolbar />
          </span>
          <span className={showAt(collapseLevel, 2)}>
            <HorizontalRuleToolbar />
          </span>
        </OverflowSection>

        <OverflowSection label="Layout and color" hidden={collapseLevel < 1}>
          <AlignmentTooolbar />
          <ImagePlaceholderToolbar />
          <ColorHighlightToolbar />
        </OverflowSection>

        <OverflowSection label="Utilities" hidden={collapseLevel < 1}>
          <SearchAndReplaceToolbar />
        </OverflowSection>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OverflowSection({
  label,
  hidden,
  children,
}: {
  label: string;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;

  return (
    <div className="space-y-1.5 [&:not(:last-child)]:mb-2">
      <DropdownMenuLabel className="px-1.5 py-0 text-xs font-medium text-muted-foreground">
        {label}
      </DropdownMenuLabel>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
      <DropdownMenuSeparator />
    </div>
  );
}

function hideAt(collapseLevel: number, threshold: number) {
  return collapseLevel >= threshold ? "hidden" : "inline-flex";
}

function showAt(collapseLevel: number, threshold: number) {
  return collapseLevel >= threshold ? "inline-flex" : "hidden";
}

function useToolbarCollapseLevel(toolbarRef: React.RefObject<HTMLDivElement | null>) {
  const [level, setLevel] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const update = () => {
      const width = toolbar.getBoundingClientRect().width;
      setLevel((currentLevel) => collapseLevelForWidth(width, currentLevel));
    };

    update();
    const rafUpdate = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(rafUpdate);
    observer.observe(toolbar);
    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [toolbarRef]);

  return level;
}

function collapseLevelForWidth(width: number, currentLevel: number): number {
  const collapseTarget =
    width < 460
      ? 5
      : width < 600
        ? 4
        : width < 760
          ? 3
          : width < 920
            ? 2
            : width < 1120
              ? 1
              : 0;

  if (collapseTarget > currentLevel) return collapseTarget;
  if (collapseTarget === currentLevel) return currentLevel;

  const expandAt = [1160, 960, 800, 640, 500, 0];
  return width >= expandAt[currentLevel] ? collapseTarget : currentLevel;
}

function ToolbarDivider({ className }: { className?: string }) {
  return (
    <Separator
      orientation="vertical"
      className={cn("mx-1.5 h-6 data-[orientation=vertical]:h-6", className)}
    />
  );
}

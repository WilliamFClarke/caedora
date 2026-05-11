"use client";

import React from "react";
import { Editor } from "@tiptap/core";
import { ChevronsRight, MoreVertical, PanelRightOpen } from "lucide-react";

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
import { isDesktopAiAvailable } from "@/lib/desktop-ai";
import { useSettings } from "@/lib/settings-context";
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
  const toolsRowRef = React.useRef<HTMLDivElement>(null);
  const collapseLevel = useToolbarCollapseLevel(toolsRowRef);

  return (
    <div className="caedora-editor-toolbar sticky top-0 z-20 h-11 w-full min-w-0 border-b bg-card">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <div
            className="flex h-11 w-full min-w-0 max-w-full items-center overflow-hidden px-2 py-0"
          >
            <div
              ref={toolsRowRef}
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

            <div className="caedora-editor-toolbar-actions ml-auto flex shrink-0 items-center gap-0.5">
              <ResponsiveOverflowToolbar collapseLevel={collapseLevel} />
              <DesktopAssistantToolbarToggle />
            </div>
          </div>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

function DesktopAssistantToolbarToggle() {
  const { settings, updateSettings } = useSettings();
  const [desktopReady, setDesktopReady] = React.useState(false);
  const open = settings.ai.sidebar.open;

  React.useEffect(() => {
    setDesktopReady(isDesktopAiAvailable());
  }, []);

  if (!desktopReady) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={open ? "Close Argus" : "Open Argus"}
      title={open ? "Close Argus" : "Open Argus"}
      className="h-8 w-8 shrink-0 p-0"
      onClick={() =>
        void updateSettings({
          ai: {
            ...settings.ai,
            sidebar: {
              ...settings.ai.sidebar,
              open: !open,
            },
          },
        })
      }
    >
      {open ? <ChevronsRight className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
    </Button>
  );
}

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

const MAX_TOOLBAR_COLLAPSE_LEVEL = 5;
const TOOLBAR_RESTORE_WIDTH_BY_LEVEL = [0, 224, 72, 120, 176, 156];

function useToolbarCollapseLevel(toolbarRef: React.RefObject<HTMLDivElement | null>) {
  const [level, setLevel] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const update = () => {
      setLevel((currentLevel) => {
        const overflows = toolbar.scrollWidth > toolbar.clientWidth + 1;

        if (overflows) {
          const nextLevel = Math.min(
            MAX_TOOLBAR_COLLAPSE_LEVEL,
            currentLevel + 1,
          );
          if (nextLevel !== currentLevel) {
            frameRef.current = requestAnimationFrame(update);
          }
          return nextLevel;
        }

        if (currentLevel === 0) return currentLevel;

        const availableExtraWidth = toolbar.clientWidth - toolbar.scrollWidth;
        const requiredWidth =
          TOOLBAR_RESTORE_WIDTH_BY_LEVEL[currentLevel] ?? 176;
        if (availableExtraWidth < requiredWidth) return currentLevel;

        frameRef.current = requestAnimationFrame(update);
        return currentLevel - 1;
      });
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

function ToolbarDivider({ className }: { className?: string }) {
  return (
    <Separator
      orientation="vertical"
      className={cn("mx-1.5 h-6 data-[orientation=vertical]:h-6", className)}
    />
  );
}

"use client";

import React from "react";
import { Editor } from "@tiptap/core";
import { ChevronsRight, Database, MoreVertical, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
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

export const EditorToolbar = ({
  editor,
  onOpenVaultSettings,
}: {
  editor: Editor;
  onOpenVaultSettings?: () => void;
}) => {
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
              <PrimarySidebarControls />

              <span data-collapse-threshold="16" className={hideAt(collapseLevel, 16)}>
                <UndoToolbar />
              </span>
              <span data-collapse-threshold="15" className={hideAt(collapseLevel, 15)}>
                <RedoToolbar />
              </span>
              <ToolbarDivider collapseThreshold={15} className={hideAt(collapseLevel, 15)} />

              <span data-collapse-threshold="14" className={hideAt(collapseLevel, 14)}>
                <HeadingsToolbar />
              </span>
              <span data-collapse-threshold="13" className={hideAt(collapseLevel, 13)}>
                <BlockquoteToolbar />
              </span>
              <span data-collapse-threshold="12" className={hideAt(collapseLevel, 12)}>
                <CodeToolbar />
              </span>
              <span data-collapse-threshold="11" className={hideAt(collapseLevel, 11)}>
                <CodeBlockToolbar />
              </span>
              <ToolbarDivider collapseThreshold={11} className={hideAt(collapseLevel, 11)} />

              <BoldToolbar />
              <ItalicToolbar />
              <span data-collapse-threshold="10" className={hideAt(collapseLevel, 10)}>
                <UnderlineToolbar />
              </span>
              <LinkToolbar />
              <MoreFormattingToolbar />
              <ToolbarDivider collapseThreshold={7} className={hideAt(collapseLevel, 7)} />

              <span data-collapse-threshold="9" className={hideAt(collapseLevel, 9)}>
                <BulletListToolbar />
              </span>
              <span data-collapse-threshold="8" className={hideAt(collapseLevel, 8)}>
                <OrderedListToolbar />
              </span>
              <span data-collapse-threshold="7" className={hideAt(collapseLevel, 7)}>
                <TaskListToolbar />
              </span>
              <span data-collapse-threshold="6" className={hideAt(collapseLevel, 6)}>
                <TableToolbar />
              </span>
              <span data-collapse-threshold="5" className={hideAt(collapseLevel, 5)}>
                <HorizontalRuleToolbar />
              </span>
              <ToolbarDivider collapseThreshold={4} className={hideAt(collapseLevel, 4)} />

              <span data-collapse-threshold="4" className={hideAt(collapseLevel, 4)}>
                <AlignmentTooolbar />
              </span>
              <span data-collapse-threshold="3" className={hideAt(collapseLevel, 3)}>
                <ImagePlaceholderToolbar />
              </span>
              <span data-collapse-threshold="2" className={hideAt(collapseLevel, 2)}>
                <ColorHighlightToolbar />
              </span>

              <span data-collapse-threshold="1" className={hideAt(collapseLevel, 1)}>
                <SearchAndReplaceToolbar />
              </span>
            </div>

            <div className="caedora-editor-toolbar-actions ml-auto flex shrink-0 items-center gap-0.5">
              <MobileVaultToolbarButton onOpenVaultSettings={onOpenVaultSettings} />
              <ResponsiveOverflowToolbar collapseLevel={collapseLevel} />
              <DesktopAssistantToolbarToggle />
            </div>
          </div>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

function MobileVaultToolbarButton({
  onOpenVaultSettings,
}: {
  onOpenVaultSettings?: () => void;
}) {
  if (!onOpenVaultSettings) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Manage vaults"
      title="Manage vaults"
      className="h-8 w-8 shrink-0 p-0 sm:hidden"
      onClick={onOpenVaultSettings}
    >
      <Database className="h-4 w-4" />
    </Button>
  );
}

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
      aria-label={open ? "Close Argus (AI Assistant)" : "Open Argus (AI Assistant)"}
      title={open ? "Close Argus (AI Assistant)" : "Open Argus (AI Assistant)"}
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

function PrimarySidebarControls() {
  const { canCollapse } = useSidebar();

  if (!canCollapse) return null;

  return (
    <>
      <SidebarTrigger className="size-8 shrink-0" />
      <ToolbarDivider className="shrink-0" />
    </>
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
        <OverflowSection label="History" hidden={collapseLevel < 15}>
          <span className={showAt(collapseLevel, 16)}><UndoToolbar /></span>
          <span className={showAt(collapseLevel, 15)}><RedoToolbar /></span>
        </OverflowSection>

        <OverflowSection label="Text blocks" hidden={collapseLevel < 11}>
          <span className={showAt(collapseLevel, 14)}>
            <HeadingsToolbar />
          </span>
          <span className={showAt(collapseLevel, 13)}>
            <BlockquoteToolbar />
          </span>
          <span className={showAt(collapseLevel, 12)}>
            <CodeToolbar />
          </span>
          <span className={showAt(collapseLevel, 11)}>
            <CodeBlockToolbar />
          </span>
        </OverflowSection>

        <OverflowSection label="Formatting" hidden={collapseLevel < 10}>
          <span className={showAt(collapseLevel, 10)}><UnderlineToolbar /></span>
        </OverflowSection>

        <OverflowSection label="Lists and inserts" hidden={collapseLevel < 5}>
          <span className={showAt(collapseLevel, 9)}>
            <BulletListToolbar />
          </span>
          <span className={showAt(collapseLevel, 8)}>
            <OrderedListToolbar />
          </span>
          <span className={showAt(collapseLevel, 7)}>
            <TaskListToolbar />
          </span>
          <span className={showAt(collapseLevel, 6)}>
            <TableToolbar />
          </span>
          <span className={showAt(collapseLevel, 5)}>
            <HorizontalRuleToolbar />
          </span>
        </OverflowSection>

        <OverflowSection label="Layout and color" hidden={collapseLevel < 2}>
          <span className={showAt(collapseLevel, 4)}><AlignmentTooolbar /></span>
          <span className={showAt(collapseLevel, 3)}><ImagePlaceholderToolbar /></span>
          <span className={showAt(collapseLevel, 2)}><ColorHighlightToolbar /></span>
        </OverflowSection>

        <OverflowSection label="Utilities" hidden={collapseLevel < 1}>
          <span className={showAt(collapseLevel, 1)}><SearchAndReplaceToolbar /></span>
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

const MAX_TOOLBAR_COLLAPSE_LEVEL = 16;
const OVERFLOW_BUTTON_WIDTH = 36;

function useToolbarCollapseLevel(toolbarRef: React.RefObject<HTMLDivElement | null>) {
  const [level, setLevel] = React.useState(0);
  const frameRef = React.useRef<number | null>(null);
  const measurementsRef = React.useRef<ToolbarMeasurements | null>(null);

  React.useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const update = () => {
      const measurements = measurementsRef.current;
      if (!measurements) return;
      setLevel(collapseLevelForWidth(measurements, toolbar.clientWidth));
    };

    const measureAndUpdate = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        measurementsRef.current ??= measureToolbar(toolbar);
        update();
      });
    };

    measurementsRef.current = measureToolbar(toolbar);
    update();

    const observer = new ResizeObserver(measureAndUpdate);
    observer.observe(toolbar);
    window.addEventListener("resize", measureAndUpdate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureAndUpdate);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [toolbarRef]);

  return level;
}

type ToolbarMeasurements = {
  fullWidth: number;
  widthsByThreshold: number[];
};

function measureToolbar(toolbar: HTMLDivElement): ToolbarMeasurements {
  const widthsByThreshold = Array.from({ length: MAX_TOOLBAR_COLLAPSE_LEVEL + 1 }, () => 0);

  for (const item of toolbar.querySelectorAll<HTMLElement>("[data-collapse-threshold]")) {
    const threshold = Number.parseInt(item.dataset.collapseThreshold ?? "", 10);
    if (!Number.isFinite(threshold)) continue;
    widthsByThreshold[threshold] += item.getBoundingClientRect().width;
  }

  return {
    fullWidth: toolbar.scrollWidth,
    widthsByThreshold,
  };
}

function collapseLevelForWidth(measurements: ToolbarMeasurements, availableWidth: number) {
  let hiddenWidth = 0;

  for (let level = 0; level <= MAX_TOOLBAR_COLLAPSE_LEVEL; level++) {
    if (level > 0) hiddenWidth += measurements.widthsByThreshold[level] ?? 0;
    const overflowReserve = level > 0 ? OVERFLOW_BUTTON_WIDTH : 0;
    if (measurements.fullWidth - hiddenWidth <= availableWidth - overflowReserve) {
      return level;
    }
  }

  return MAX_TOOLBAR_COLLAPSE_LEVEL;
}

function ToolbarDivider({
  className,
  collapseThreshold,
}: {
  className?: string;
  collapseThreshold?: number;
}) {
  return (
    <Separator
      orientation="vertical"
      data-collapse-threshold={collapseThreshold}
      className={cn("mx-1.5 h-6 data-[orientation=vertical]:h-6", className)}
    />
  );
}

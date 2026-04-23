import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolbarProvider } from "./toolbar-provider";
import { Editor } from "@tiptap/core";
import { UndoToolbar } from "./undo";
import { RedoToolbar } from "./redo";
import { HeadingsToolbar } from "./headings";
import { BlockquoteToolbar } from "./blockquote";
import { CodeToolbar } from "./code";
import { BoldToolbar } from "./bold";
import { ItalicToolbar } from "./italic";
import { UnderlineToolbar } from "./underline";
import { LinkToolbar } from "./link";
import { BulletListToolbar } from "./bullet-list";
import { OrderedListToolbar } from "./ordered-list";
import { HorizontalRuleToolbar } from "./horizontal-rule";
import { AlignmentTooolbar } from "./alignment";
import { ImagePlaceholderToolbar } from "./image-placeholder-toolbar";
import { ColorHighlightToolbar } from "./color-and-highlight";
import { SearchAndReplaceToolbar } from "./search-and-replace-toolbar";
import { CodeBlockToolbar } from "./code-block";
import { TableToolbar } from "./table";
import { TaskListToolbar } from "./task-list";
import { MoreFormattingToolbar } from "./more-formatting";

// Groups that hide progressively at smaller widths. Dividers use the same
// responsive visibility as the group that follows them so we don't leave
// orphaned separators floating in the bar.
const hideBelowSm = "hidden sm:inline-flex";
const hideBelowMd = "hidden md:inline-flex";
const hideBelowLg = "hidden lg:inline-flex";

export const EditorToolbar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-card">
      <ToolbarProvider editor={editor}>
        <TooltipProvider>
          <ScrollArea className="h-fit">
            <div className="flex items-center gap-0.5 px-2 py-1">
              {/* Sidebar toggle — always visible */}
              <SidebarTrigger className="size-8 shrink-0" />
              <ToolbarDivider />

              {/* History — always visible */}
              <UndoToolbar />
              <RedoToolbar />
              <ToolbarDivider />

              {/* Text structure — headings always visible, the rest from sm up */}
              <HeadingsToolbar />
              <span className={hideBelowSm}>
                <BlockquoteToolbar />
              </span>
              <span className={hideBelowSm}>
                <CodeToolbar />
              </span>
              <span className={hideBelowMd}>
                <CodeBlockToolbar />
              </span>
              <ToolbarDivider />

              {/* Inline formatting — core marks always visible */}
              <BoldToolbar />
              <ItalicToolbar />
              <span className={hideBelowSm}>
                <UnderlineToolbar />
              </span>
              <LinkToolbar />
              {/* Strikethrough, sub, sup live in a single "More" dropdown
                  so the bar stays tight. Always shown. */}
              <MoreFormattingToolbar />
              <ToolbarDivider />

              {/* Lists & structural blocks */}
              <BulletListToolbar />
              <OrderedListToolbar />
              <span className={hideBelowSm}>
                <TaskListToolbar />
              </span>
              <span className={hideBelowMd}>
                <TableToolbar />
              </span>
              <span className={hideBelowMd}>
                <HorizontalRuleToolbar />
              </span>
              <span className={`${hideBelowLg} ml-0.5`}>
                <Separator orientation="vertical" className="h-6" />
              </span>

              {/* Layout & media — appear only on wider screens */}
              <span className={hideBelowLg}>
                <AlignmentTooolbar />
              </span>
              <span className={hideBelowLg}>
                <ImagePlaceholderToolbar />
              </span>
              <span className={hideBelowLg}>
                <ColorHighlightToolbar />
              </span>

              <div className="flex-1" />

              {/* Utility — always on the right */}
              <SearchAndReplaceToolbar />
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </TooltipProvider>
      </ToolbarProvider>
    </div>
  );
};

function ToolbarDivider() {
  return (
    <Separator
      orientation="vertical"
      className="mx-1.5 h-6 data-[orientation=vertical]:h-6"
    />
  );
}

"use client";

import {
	ChevronDown,
	Strikethrough,
	Subscript as SubscriptIcon,
	Superscript as SuperscriptIcon,
} from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToolbar } from "./toolbar-provider";

/**
 * Groups the less-frequently-used inline marks (strikethrough, subscript,
 * superscript) behind a single dropdown so the toolbar stays uncluttered
 * at narrow widths. Also works fine at wide widths — space is the real
 * constraint, not discoverability.
 */
export const MoreFormattingToolbar = () => {
	const { editor } = useToolbar();
	if (!editor) return null;

	const strikeActive = editor.isActive("strike");
	const subActive = editor.isActive("subscript");
	const supActive = editor.isActive("superscript");
	const anyActive = strikeActive || subActive || supActive;

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							aria-label="More formatting"
							className={cn(
								"h-8 w-8 p-0 sm:h-9 sm:w-9",
								anyActive && "bg-accent",
							)}
						>
							<span className="flex items-center gap-0.5">
								<Strikethrough className="h-4 w-4" />
								<ChevronDown className="h-3 w-3 opacity-60" />
							</span>
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>More formatting</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="start" className="w-44">
				<DropdownMenuCheckboxItem
					checked={strikeActive}
					onCheckedChange={() => editor.chain().focus().toggleStrike().run()}
				>
					<Strikethrough className="mr-2 h-4 w-4" />
					Strikethrough
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={subActive}
					onCheckedChange={() =>
						editor.chain().focus().toggleSubscript().run()
					}
				>
					<SubscriptIcon className="mr-2 h-4 w-4" />
					Subscript
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={supActive}
					onCheckedChange={() =>
						editor.chain().focus().toggleSuperscript().run()
					}
				>
					<SuperscriptIcon className="mr-2 h-4 w-4" />
					Superscript
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

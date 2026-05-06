"use client";
// @ts-nocheck
import { ArrowLeftIcon, ArrowRightIcon, X, Repeat } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToolbar } from "./toolbar-provider";
import { type SearchAndReplaceStorage } from "../extensions/search-and-replace";

export function SearchAndReplaceToolbar() {
	const { editor } = useToolbar();

	const [open, setOpen] = useState(false);
	const [replacing, setReplacing] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [replaceText, setReplaceText] = useState("");
	const [checked, setChecked] = useState(false);

	const results = editor?.storage?.searchAndReplace
		.results as SearchAndReplaceStorage["results"];
	const selectedResult = editor?.storage?.searchAndReplace
		.selectedResult as SearchAndReplaceStorage["selectedResult"];

	const replace = () => editor?.chain().replace().run();
	const replaceAll = () => editor?.chain().replaceAll().run();
	const selectNext = () => editor?.chain().selectNextResult().run();
	const selectPrevious = () => editor?.chain().selectPreviousResult().run();

	useEffect(() => {
		editor?.chain().setSearchTerm(searchText).run();
	}, [searchText, editor]);

	useEffect(() => {
		editor?.chain().setReplaceTerm(replaceText).run();
	}, [replaceText, editor]);

	useEffect(() => {
		editor?.chain().setCaseSensitive(checked).run();
	}, [checked, editor]);

	useEffect(() => {
		if (!open) {
			setReplaceText("");
			setSearchText("");
			setReplacing(false);
		}
	}, [open]);

	return (
		<Popover open={open}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger disabled={!editor} asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setOpen(!open);
							}}
							className={cn("h-8 w-8 shrink-0 p-0")}
							aria-label="Search and replace"
						>
							<Repeat className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>
					<span>Search & Replace</span>
				</TooltipContent>
			</Tooltip>

			<PopoverContent
				align="end"
				onCloseAutoFocus={(e) => {
					e.preventDefault();
				}}
				onEscapeKeyDown={() => {
					setOpen(false);
				}}
				className="relative flex w-[min(400px,calc(100vw-1rem))] px-3 py-2.5"
			>
				{!replacing ? (
					<div className={cn("relative flex w-full flex-wrap items-center gap-1.5")}>
						<Input
							value={searchText}
							className="min-w-0 flex-1 sm:w-48 sm:flex-none"
							onChange={(e) => {
								setSearchText(e.target.value);
							}}
							placeholder="Search..."
						/>
						<span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
							{results?.length === 0 ? selectedResult : selectedResult + 1}/
							{results?.length}
						</span>
						<Button
							onClick={selectPrevious}
							size="icon"
							variant="ghost"
							className="size-7"
						>
							<ArrowLeftIcon className="size-4" />
						</Button>
						<Button
							onClick={selectNext}
							size="icon"
							className="size-7"
							variant="ghost"
						>
							<ArrowRightIcon className="h-4 w-4" />
						</Button>
						<Separator orientation="vertical" className="mx-0.5 h-7" />
						<Button
							onClick={() => {
								setReplacing(true);
							}}
							size="icon"
							className="size-7"
							variant="ghost"
						>
							<Repeat className="h-4 w-4" />
						</Button>
						<Button
							onClick={() => {
								setOpen(false);
							}}
							size="icon"
							className="size-7"
							variant="ghost"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				) : (
					<div className={cn("relative w-full")}>
						<div className="flex w-full items-center gap-3">
							<Button
								size="icon"
								className="size-7 rounded-full"
								variant="ghost"
								onClick={() => {
									setReplacing(false);
								}}
							>
								<ArrowLeftIcon className="h-4 w-4" />
							</Button>
							<h2 className="text-sm font-medium">Search and replace</h2>
							<Button
								onClick={() => {
									setOpen(false);
								}}
								size="icon"
								className="ml-auto size-7"
								variant="ghost"
								aria-label="Close search and replace"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>

						<div className="my-2 w-full">
							<div className="mb-3">
								<Label className="mb-1 text-xs text-gray-11">Search</Label>
								<Input
									value={searchText}
									onChange={(e) => {
										setSearchText(e.target.value);
									}}
									placeholder="Search..."
								/>
								{results?.length === 0 ? selectedResult : selectedResult + 1}/
								{results?.length}
							</div>
							<div className="mb-2">
								<Label className="mb-1 text-xs text-gray-11">
									Replace with
								</Label>
								<Input
									className="w-full"
									value={replaceText}
									onChange={(e) => {
										setReplaceText(e.target.value);
									}}
									placeholder="Replace..."
								/>
							</div>
							<div className="mt-3 flex items-center space-x-2">
								<Checkbox
									checked={checked}
									onCheckedChange={(checked: boolean) => {
										setChecked(checked);
									}}
									id="match_case"
								/>
								<Label
									htmlFor="match_case"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Match case
								</Label>
							</div>
						</div>

						<div className="actions mt-6 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Button
									onClick={selectPrevious}
									size="icon"
									className="h-7 w-7"
									variant="secondary"
								>
									<ArrowLeftIcon className="h-4 w-4" />
								</Button>
								<Button
									onClick={selectNext}
									size="icon"
									className="h-7 w-7"
									variant="secondary"
								>
									<ArrowRightIcon className="h-4 w-4" />
								</Button>
							</div>

							<div className="main-actions flex flex-wrap items-center justify-end gap-2">
								<Button
									size="sm"
									className="h-7 px-2 text-xs sm:px-3"
									variant="secondary"
									onClick={replaceAll}
								>
									Replace All
								</Button>
								<Button
									onClick={replace}
									size="sm"
									className="h-7 px-2 text-xs sm:px-3"
								>
									Replace
								</Button>
							</div>
						</div>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

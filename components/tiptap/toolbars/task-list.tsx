"use client";

import { ListChecks } from "lucide-react";
import React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToolbar } from "./toolbar-provider";

const TaskListToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, onClick, children, ...props }, ref) => {
		const { editor } = useToolbar();
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"h-8 w-8 p-0 sm:h-9 sm:w-9",
							editor?.isActive("taskList") && "bg-accent",
							className,
						)}
						onClick={(e) => {
							editor?.chain().focus().toggleTaskList().run();
							onClick?.(e);
						}}
						ref={ref}
						{...props}
					>
						{children ?? <ListChecks className="h-4 w-4" />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<span>Task list</span>
				</TooltipContent>
			</Tooltip>
		);
	},
);

TaskListToolbar.displayName = "TaskListToolbar";

export { TaskListToolbar };

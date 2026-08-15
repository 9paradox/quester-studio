import type * as React from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { cn } from "@/lib/utils.js";
import { IconSearch } from "@tabler/icons-react";

function Command({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="command"
			className={cn(
				"flex size-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function CommandDialog({
	title = "Command Palette",
	description = "Search for a command to run…",
	children,
	className,
	showCloseButton = false,
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof Dialog> & {
	title?: string;
	description?: string;
	className?: string;
	showCloseButton?: boolean;
	children: React.ReactNode;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange} {...props}>
			<DialogContent
				className={cn(
					"top-[20%] max-w-lg translate-y-0 overflow-hidden p-0 sm:max-w-xl",
					className,
				)}
				showCloseButton={showCloseButton}
			>
				<DialogHeader className="sr-only">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex items-center gap-3 border-b border-border px-3 py-2"
		>
			<IconSearch className="size-3.5 shrink-0 opacity-50" aria-hidden />
			<Input
				data-slot="command-input"
				aria-label="Search commands"
				className={cn(
					"h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="command-list"
			className={cn(
				"max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto p-1 outline-none",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="command-empty"
			className={cn(
				"py-6 text-center text-xs text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	heading,
	children,
	...props
}: React.ComponentProps<"div"> & { heading?: string }) {
	return (
		<div
			data-slot="command-group"
			className={cn("overflow-hidden p-1 text-foreground", className)}
			{...props}
		>
			{heading ? (
				<div className="px-2 py-1.5 text-2xs font-medium text-muted-foreground">
					{heading}
				</div>
			) : null}
			{children}
		</div>
	);
}

function CommandItem({
	className,
	selected = false,
	...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
	return (
		<button
			type="button"
			data-slot="command-item"
			aria-selected={selected}
			className={cn(
				"flex w-full min-h-7 cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none select-none disabled:pointer-events-none disabled:opacity-50",
				selected ? "bg-muted text-foreground" : "text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function CommandShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="command-shortcut"
			className={cn(
				"ml-auto font-mono text-3xs tracking-widest text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
};

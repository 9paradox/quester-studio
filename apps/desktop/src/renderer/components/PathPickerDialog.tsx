import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { focusRing } from "@/lib/focusRing.js";
import { cn } from "@/lib/utils.js";
import { IconListSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";

type PathPickerDialogProps = {
	paths: readonly string[];
	title: string;
	description: string;
	emptyMessage: string;
	onPick: (path: string) => void;
	/** Tooltip + accessible name. */
	triggerTitle?: string;
};

export function PathPickerDialog({
	paths,
	title,
	description,
	emptyMessage,
	onPick,
	triggerTitle = "Insert a path from available sources",
}: PathPickerDialogProps) {
	const [open, setOpen] = useState(false);

	const pickPath = (path: string) => {
		onPick(path);
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{/* Base UI merges trigger props onto `render`; keep Button here (not a
			    wrapper) so open handlers attach. Children become Button content. */}
			<DialogTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="pointer-events-auto text-muted-foreground hover:text-foreground"
						title={triggerTitle}
						aria-label="Pick path"
					/>
				}
			>
				<IconListSearch />
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{paths.length === 0 ? (
					<p className="text-xs text-muted-foreground">{emptyMessage}</p>
				) : (
					<ScrollArea className="max-h-64">
						<ul className="flex flex-col gap-0.5 pr-3">
							{paths.map((path) => (
								<li key={path}>
									<button
										type="button"
										className={cn(
											focusRing,
											"w-full rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-muted",
										)}
										onClick={() => pickPath(path)}
									>
										{path}
									</button>
								</li>
							))}
						</ul>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Wrap a field editor and nest the path picker icon inside the chrome. */
export function PathPickerField({
	children,
	paths,
	title,
	description,
	emptyMessage,
	onPick,
	triggerTitle,
	className,
}: PathPickerDialogProps & {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("relative min-w-0", className)}>
			<div className="min-w-0 [&_.cm-theme-none]:pr-7">{children}</div>
			<div className="pointer-events-none absolute top-0.5 right-0.5 z-20">
				<div className="pointer-events-auto">
					<PathPickerDialog
						paths={paths}
						title={title}
						description={description}
						emptyMessage={emptyMessage}
						onPick={onPick}
						triggerTitle={triggerTitle}
					/>
				</div>
			</div>
		</div>
	);
}

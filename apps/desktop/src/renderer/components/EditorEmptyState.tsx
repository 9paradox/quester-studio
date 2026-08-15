import { cn } from "@/lib/utils.js";
import type { ReactNode } from "react";

/** Centered next-step empty / error pane for the editor area. */
export function EditorEmptyState({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description: string;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6",
				className,
			)}
		>
			<div className="max-w-md text-center">
				<h2 className="text-sm font-medium text-foreground">{title}</h2>
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			</div>
			{children ? (
				<div className="flex flex-wrap items-center justify-center gap-2">
					{children}
				</div>
			) : null}
		</div>
	);
}

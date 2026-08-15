import { cn } from "@/lib/utils.js";
import type { ReactNode } from "react";

/** Inline `code` chip for template tokens and file names in prose. */
export function CodeChip({ children }: { children: ReactNode }) {
	return (
		<code className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
			{children}
		</code>
	);
}

/** Helper text under a field or section. */
export function FieldHint({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"text-2xs leading-relaxed text-muted-foreground",
				className,
			)}
		>
			{children}
		</p>
	);
}

/** Small uppercase section heading used in panels and response views. */
export function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
	);
}

/** Empty / zero-result state for sidebar lists and panels. */
export function EmptyState({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p className={cn("px-2 py-4 text-xs text-muted-foreground", className)}>
			{children}
		</p>
	);
}

export function KeyValueGridHead({
	keyLabel,
	valueLabel,
}: {
	keyLabel: string;
	valueLabel: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 px-0.5 text-3xs font-medium tracking-wide text-muted-foreground uppercase">
			<span>{keyLabel}</span>
			<span>{valueLabel}</span>
			<span className="w-7" />
		</div>
	);
}

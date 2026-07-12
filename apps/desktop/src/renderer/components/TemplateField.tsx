import { cn } from "@/lib/utils.js";
import type { CSSProperties, ReactNode } from "react";

export function highlightTemplateSegments(text: string): ReactNode[] {
	const re = /\{\{[^}]+\}\}/g;
	const nodes: ReactNode[] = [];
	let last = 0;
	let i = 0;
	for (const match of text.matchAll(re)) {
		const index = match.index ?? 0;
		if (index > last) {
			nodes.push(<span key={`p-${i}`}>{text.slice(last, index)}</span>);
			i += 1;
		}
		nodes.push(
			<span key={`t-${i}`} className="rounded-[2px] bg-primary/15 text-primary">
				{match[0]}
			</span>,
		);
		i += 1;
		last = index + match[0].length;
	}
	if (last < text.length || nodes.length === 0) {
		nodes.push(<span key={`p-${i}`}>{text.slice(last)}</span>);
	}
	return nodes;
}

type TemplateFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	multiline?: boolean;
	rows?: number;
	className?: string;
	onBlur?: () => void;
};

/**
 * Postman-style template field: editable text with {{var}} highlighting overlay.
 */
export function TemplateField({
	id,
	value,
	onChange,
	placeholder,
	multiline = false,
	rows = 4,
	className,
	onBlur,
}: TemplateFieldProps) {
	const shared =
		"w-full rounded-md border border-input bg-transparent px-2 py-1.5 font-mono text-xs/relaxed outline-none";

	if (!multiline) {
		return (
			<div className={cn("relative", className)}>
				<div
					aria-hidden
					className={cn(
						shared,
						"pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-foreground",
					)}
				>
					{value ? (
						highlightTemplateSegments(value)
					) : (
						<span className="text-transparent">{placeholder ?? "\u00a0"}</span>
					)}
				</div>
				<input
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={placeholder}
					spellCheck={false}
					className={cn(
						shared,
						"relative caret-foreground text-transparent selection:bg-primary/25 placeholder:text-muted-foreground",
					)}
				/>
			</div>
		);
	}

	const style = {
		minHeight: `${Math.max(rows, 2) * 1.25 + 0.75}rem`,
	} satisfies CSSProperties;

	return (
		<div className={cn("relative", className)}>
			<pre
				aria-hidden
				style={style}
				className={cn(
					shared,
					"pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words text-foreground",
				)}
			>
				{value ? (
					highlightTemplateSegments(value)
				) : (
					<span className="text-transparent">{placeholder ?? "\u00a0"}</span>
				)}
			</pre>
			<textarea
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				placeholder={placeholder}
				spellCheck={false}
				style={style}
				className={cn(
					shared,
					"relative resize-y caret-foreground text-transparent selection:bg-primary/25 placeholder:text-muted-foreground",
				)}
			/>
		</div>
	);
}

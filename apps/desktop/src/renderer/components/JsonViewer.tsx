import { Button } from "@/components/ui/button.js";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { cn } from "@/lib/utils.js";
import {
	IconChevronDown,
	IconCopy,
	IconSquareMinus,
	IconSquarePlus,
} from "@tabler/icons-react";
import { useState } from "react";

type JsonViewerProps = {
	value: unknown;
	className?: string;
	defaultExpandedDepth?: number;
	showCopy?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringifyJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}

function ValueToken({ value }: { value: unknown }) {
	if (value === null) {
		return <span className="text-muted-foreground">null</span>;
	}
	if (typeof value === "boolean") {
		return (
			<span className="text-amber-700 dark:text-amber-400">
				{String(value)}
			</span>
		);
	}
	if (typeof value === "number") {
		return <span className="text-sky-700 dark:text-sky-400">{value}</span>;
	}
	if (typeof value === "string") {
		return (
			<span className="break-all text-emerald-700 dark:text-emerald-400">
				&quot;{value}&quot;
			</span>
		);
	}
	if (typeof value === "undefined") {
		return <span className="text-muted-foreground">undefined</span>;
	}
	return <span className="text-foreground">{String(value)}</span>;
}

function Preview({ value }: { value: unknown }) {
	if (Array.isArray(value)) {
		return <span className="text-muted-foreground">Array({value.length})</span>;
	}
	if (isPlainObject(value)) {
		const keys = Object.keys(value);
		return (
			<span className="text-muted-foreground">
				{`{${keys.length} ${keys.length === 1 ? "key" : "keys"}}`}
			</span>
		);
	}
	return <ValueToken value={value} />;
}

type NodeProps = {
	name?: string;
	value: unknown;
	depth: number;
	defaultExpandedDepth: number;
};

function JsonNode({ name, value, depth, defaultExpandedDepth }: NodeProps) {
	const expandable = Array.isArray(value) || isPlainObject(value);
	const [open, setOpen] = useState(depth < defaultExpandedDepth);

	if (!expandable) {
		return (
			<div className="flex flex-wrap items-baseline gap-1 font-mono text-[11px] leading-5">
				{name !== undefined ? (
					<span className="text-violet-700 dark:text-violet-300">{name}</span>
				) : null}
				{name !== undefined ? (
					<span className="text-muted-foreground">:</span>
				) : null}
				<ValueToken value={value} />
			</div>
		);
	}

	const entries = Array.isArray(value)
		? value.map((item, i) => [String(i), item] as const)
		: Object.entries(value);
	const brackets = Array.isArray(value)
		? (["[", "]"] as const)
		: (["{", "}"] as const);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className="font-mono text-[11px] leading-5">
				<CollapsibleTrigger className="group flex w-full items-center gap-1 rounded-sm text-left hover:bg-muted/60">
					{open ? (
						<IconSquareMinus className="size-3 shrink-0 text-muted-foreground" />
					) : (
						<IconSquarePlus className="size-3 shrink-0 text-muted-foreground" />
					)}
					{name !== undefined ? (
						<>
							<span className="text-violet-700 dark:text-violet-300">
								{name}
							</span>
							<span className="text-muted-foreground">:</span>
						</>
					) : null}
					<span className="text-muted-foreground">{brackets[0]}</span>
					{!open ? (
						<>
							<Preview value={value} />
							<span className="text-muted-foreground">{brackets[1]}</span>
						</>
					) : null}
					<IconChevronDown
						className={cn(
							"ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-transform group-hover:opacity-100",
							open && "rotate-180",
						)}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="ml-2 border-l border-border/70 pl-3">
						{entries.length === 0 ? (
							<div className="text-muted-foreground italic">empty</div>
						) : (
							entries.map(([key, child]) => (
								<JsonNode
									key={key}
									name={key}
									value={child}
									depth={depth + 1}
									defaultExpandedDepth={defaultExpandedDepth}
								/>
							))
						)}
					</div>
					<div className="text-muted-foreground">{brackets[1]}</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

export function JsonViewer({
	value,
	className,
	defaultExpandedDepth = 2,
	showCopy = true,
}: JsonViewerProps) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard.writeText(stringifyJson(value));
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	};

	return (
		<div
			className={cn("relative rounded-md border bg-muted/20 p-2.5", className)}
		>
			{showCopy ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="absolute top-1.5 right-1.5"
					onClick={() => void copy()}
					aria-label="Copy JSON"
				>
					{copied ? (
						<span className="text-[10px] text-muted-foreground">OK</span>
					) : (
						<IconCopy />
					)}
				</Button>
			) : null}
			<div className={cn(showCopy && "pr-7")}>
				<JsonNode
					value={value}
					depth={0}
					defaultExpandedDepth={defaultExpandedDepth}
				/>
			</div>
		</div>
	);
}

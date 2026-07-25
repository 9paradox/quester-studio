import { Button } from "@/components/ui/button.js";
import { formatTemplateNodePath, joinPathSegments } from "@/lib/pathShapes.js";
import { cn } from "@/lib/utils.js";
import {
	IconChevronDown,
	IconChevronRight,
	IconCopy,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { JsonView } from "react-json-view-lite";

type JsonViewerProps = {
	value: unknown;
	className?: string;
	defaultExpandedDepth?: number;
	showCopy?: boolean;
	/**
	 * When set, shows per-path copy actions (JMESPath and optional
	 * `{{nodes.<id>.…}}` template).
	 */
	pathCopyNodeId?: string | null;
	/** Enable path copy without a node id (JMESPath only). */
	enablePathCopy?: boolean;
};

export function stringifyJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}

/** Build relative JMESPath for a segment stack. */
export function pathFromSegments(segments: Array<string | number>): string {
	return joinPathSegments(segments);
}

const jsonViewStyles = {
	container: "quester-json-view",
	basicChildStyle: "quester-json-child",
	childFieldsContainer: "quester-json-children",
	label: "quester-json-label",
	clickableLabel: "quester-json-label quester-json-clickable",
	nullValue: "quester-json-null",
	undefinedValue: "quester-json-null",
	numberValue: "quester-json-number",
	stringValue: "quester-json-string",
	booleanValue: "quester-json-boolean",
	otherValue: "quester-json-other",
	punctuation: "quester-json-punctuation",
	collapseIcon: "quester-json-toggle quester-json-collapse",
	expandIcon: "quester-json-toggle quester-json-expand",
	collapsedContent: "quester-json-collapsed",
	stringifyStringValues: true,
} as const;

function CopyPathButtons({
	relativePath,
	nodeId,
}: {
	relativePath: string;
	nodeId?: string | null;
}) {
	const [copied, setCopied] = useState<string | null>(null);

	const copy = async (text: string, kind: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(kind);
		window.setTimeout(() => setCopied(null), 1200);
	};

	if (!relativePath) return null;

	return (
		<span className="ml-1 inline-flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				className="size-5"
				title={`Copy JMESPath: ${relativePath}`}
				aria-label={`Copy JMESPath ${relativePath}`}
				onClick={(e) => {
					e.stopPropagation();
					void copy(relativePath, "jmes");
				}}
			>
				{copied === "jmes" ? (
					<span className="text-[9px] text-muted-foreground">OK</span>
				) : (
					<IconCopy className="size-3" />
				)}
			</Button>
			{nodeId ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="size-5 px-0.5 text-[9px] font-mono"
					title={`Copy template: ${formatTemplateNodePath(nodeId, relativePath)}`}
					aria-label={`Copy template for ${relativePath}`}
					onClick={(e) => {
						e.stopPropagation();
						void copy(formatTemplateNodePath(nodeId, relativePath), "tpl");
					}}
				>
					{copied === "tpl" ? "OK" : "{{}}"}
				</Button>
			) : null}
		</span>
	);
}

function PathTreeNode({
	label,
	value,
	segments,
	nodeId,
	depth,
	defaultExpandedDepth,
}: {
	label: string;
	value: unknown;
	segments: Array<string | number>;
	nodeId?: string | null;
	depth: number;
	defaultExpandedDepth: number;
}) {
	const [open, setOpen] = useState(depth < defaultExpandedDepth);
	const path = pathFromSegments(segments);
	const isObject =
		value !== null && typeof value === "object" && !Array.isArray(value);
	const isArray = Array.isArray(value);
	const expandable = isObject || isArray;

	return (
		<div className="font-mono text-[11px] leading-5">
			<div className="group/row flex min-w-0 items-start gap-0.5">
				{expandable ? (
					<button
						type="button"
						className="mt-0.5 shrink-0 text-muted-foreground"
						aria-label={open ? "Collapse" : "Expand"}
						onClick={() => setOpen((v) => !v)}
					>
						{open ? (
							<IconChevronDown className="size-3" />
						) : (
							<IconChevronRight className="size-3" />
						)}
					</button>
				) : (
					<span className="inline-block w-3 shrink-0" />
				)}
				<span className="min-w-0 break-all">
					<span className="text-[var(--syntax-key)]">{label}</span>
					{!expandable ? (
						<>
							<span className="text-muted-foreground">: </span>
							<span
								className={
									typeof value === "string"
										? "text-[var(--syntax-string)]"
										: typeof value === "number" || typeof value === "boolean"
											? "text-[var(--syntax-number)]"
											: "text-muted-foreground"
								}
							>
								{typeof value === "string"
									? JSON.stringify(value)
									: String(value)}
							</span>
						</>
					) : (
						<span className="text-muted-foreground">
							{isArray ? ` [${(value as unknown[]).length}]` : " {…}"}
						</span>
					)}
				</span>
				{path ? <CopyPathButtons relativePath={path} nodeId={nodeId} /> : null}
			</div>
			{expandable && open ? (
				<div className="ml-3 border-l border-border/60 pl-2">
					{isArray
						? (value as unknown[]).map((child, i) => {
								const rowKey = joinPathSegments([...segments, i]);
								return (
									<PathTreeNode
										key={rowKey}
										label={String(i)}
										value={child}
										segments={[...segments, i]}
										nodeId={nodeId}
										depth={depth + 1}
										defaultExpandedDepth={defaultExpandedDepth}
									/>
								);
							})
						: Object.entries(value as Record<string, unknown>).map(
								([key, child]) => (
									<PathTreeNode
										key={key}
										label={key}
										value={child}
										segments={[...segments, key]}
										nodeId={nodeId}
										depth={depth + 1}
										defaultExpandedDepth={defaultExpandedDepth}
									/>
								),
							)}
				</div>
			) : null}
		</div>
	);
}

export function JsonViewer({
	value,
	className,
	defaultExpandedDepth = 2,
	showCopy = true,
	pathCopyNodeId = null,
	enablePathCopy = false,
}: JsonViewerProps) {
	const [copied, setCopied] = useState(false);
	const pathMode = enablePathCopy || Boolean(pathCopyNodeId);
	const shouldExpandNode = useCallback(
		(level: number) => level < defaultExpandedDepth,
		[defaultExpandedDepth],
	);

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
					className="absolute top-1.5 right-1.5 z-10"
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
				{pathMode && value !== null && typeof value === "object" ? (
					<div className="flex flex-col gap-0.5">
						{Array.isArray(value)
							? value.map((child, i) => {
									const rowKey = joinPathSegments([i]);
									return (
										<PathTreeNode
											key={rowKey}
											label={String(i)}
											value={child}
											segments={[i]}
											nodeId={pathCopyNodeId}
											depth={0}
											defaultExpandedDepth={defaultExpandedDepth}
										/>
									);
								})
							: Object.entries(value as Record<string, unknown>).map(
									([key, child]) => (
										<PathTreeNode
											key={key}
											label={key}
											value={child}
											segments={[key]}
											nodeId={pathCopyNodeId}
											depth={0}
											defaultExpandedDepth={defaultExpandedDepth}
										/>
									),
								)}
					</div>
				) : (
					<JsonView
						data={value as object}
						style={jsonViewStyles}
						shouldExpandNode={shouldExpandNode}
						clickToExpandNode
					/>
				)}
			</div>
		</div>
	);
}

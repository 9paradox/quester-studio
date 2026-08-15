import { Badge } from "@/components/ui/badge.js";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import { cn } from "@/lib/utils.js";
import type { BuiltinNodeType } from "@quester-studio/schema";
import {
	IconCircleCheck,
	IconCircleDashed,
	IconCircleX,
	IconForms,
	IconLoader2,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import type { NodeRunStatus } from "../../shared/rpc.js";

export type FlowNodeData = {
	label?: string;
	[key: string]: unknown;
};

const statusLabel: Record<NodeRunStatus, string> = {
	idle: "Idle",
	running: "Running",
	success: "Succeeded",
	error: "Failed",
	skipped: "Skipped",
	awaiting_form: "Awaiting form",
};

type PortSpec = { id?: string; label?: string; connected?: boolean };

/** First stacked out / step between outs (rem) — matches try success/failed spacing. */
const HEADER_OUT_START_REM = 1.1;
const HEADER_OUT_STEP_REM = 1.05;
/** Padding below the last stacked out so the handle sits inside the border. */
const HEADER_OUT_BOTTOM_PAD_REM = 1.25;

function headerOutTopRem(index: number): number {
	return HEADER_OUT_START_REM + index * HEADER_OUT_STEP_REM;
}

function headerOutMinHeightRem(portCount: number): number | undefined {
	if (portCount <= 1) return undefined;
	return headerOutTopRem(portCount - 1) + HEADER_OUT_BOTTOM_PAD_REM;
}

type BaseFlowNodeProps = {
	type: BuiltinNodeType;
	/** Stable flow node id — shown for `{{nodes.<id>}}` references. */
	nodeId: string;
	title: string;
	subtitle?: string;
	children?: ReactNode;
	targetPorts?: PortSpec[];
	sourcePorts?: PortSpec[];
	/**
	 * Where to place multiple source handles on the right edge.
	 * `header` matches framed try (stacked in the title row); `spread`
	 * distributes along the full node height.
	 */
	sourcePortPlacement?: "header" | "spread";
	selected?: boolean;
	runStatus?: NodeRunStatus;
	/** Fill the React Flow node box (for resizable nodes). */
	fill?: boolean;
	className?: string;
};

export function BaseFlowNode({
	type,
	nodeId,
	title,
	subtitle,
	children,
	targetPorts = [{}],
	sourcePorts = [{}],
	sourcePortPlacement = "spread",
	selected,
	runStatus,
	fill = false,
	className,
}: BaseFlowNodeProps) {
	const presentation = getNodePresentation(type);
	const TypeIcon = presentation.icon;
	const updateNodeInternals = useUpdateNodeInternals();
	const labeledSources = sourcePorts.some((p) => Boolean(p.label ?? p.id));
	const headerPad =
		sourcePortPlacement === "header" && sourcePorts.length > 0
			? sourcePorts.length > 1
				? "pr-16"
				: "pr-14"
			: labeledSources
				? "pr-12"
				: undefined;
	const autoMinHeightRem =
		sourcePortPlacement === "header"
			? headerOutMinHeightRem(sourcePorts.length)
			: undefined;
	const sourcePortKey = sourcePorts.map((p) => p.id ?? "").join("\0");
	const handleLayoutKey = [
		sourcePortKey,
		String(sourcePorts.length),
		String(autoMinHeightRem ?? ""),
		sourcePortPlacement,
	].join("|");

	// Dynamic outs (switch cases) move/resize the node — refresh RF handle
	// geometry so edges attach to the labeled port, not a stale slot.
	useEffect(() => {
		void handleLayoutKey;
		updateNodeInternals(nodeId);
		const raf = requestAnimationFrame(() => {
			updateNodeInternals(nodeId);
		});
		return () => cancelAnimationFrame(raf);
	}, [nodeId, handleLayoutKey, updateNodeInternals]);

	return (
		<div
			className={cn(
				"relative rounded-lg border bg-card text-card-foreground transition-[box-shadow,opacity,transform] duration-200",
				sourcePortPlacement === "header"
					? "overflow-visible"
					: "overflow-hidden",
				fill
					? "flex h-full min-h-0 w-full min-w-0 flex-col"
					: "min-w-[210px] max-w-[300px]",
				presentation.accentTone,
				"border-l-[3px]",
				selected && "border-primary shadow-sm",
				runStatus === "running" &&
					"quester-node-running ring-1 ring-primary/40",
				runStatus === "success" && "quester-node-success",
				runStatus === "error" && "ring-1 ring-destructive/50",
				runStatus === "skipped" && "opacity-70",
				className,
			)}
			style={
				autoMinHeightRem != null
					? { minHeight: `${autoMinHeightRem}rem` }
					: undefined
			}
			data-run-status={runStatus ?? "none"}
		>
			{targetPorts.map((port, index) => (
				<FlowHandle
					key={`in-${port.id ?? index}`}
					kind="target"
					id={port.id}
					index={index}
					total={targetPorts.length}
					connected={port.connected}
					placement="spread"
				/>
			))}
			{sourcePorts.map((port, index) => (
				<FlowHandle
					key={`out-${port.id ?? index}`}
					kind="source"
					id={port.id}
					index={index}
					total={sourcePorts.length}
					connected={port.connected}
					placement={sourcePortPlacement}
					label={port.label ?? port.id}
				/>
			))}

			<div
				className={cn(
					"flex shrink-0 items-center gap-2 overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted/20 px-2.5 py-2",
					headerPad,
				)}
			>
				<Badge
					variant="secondary"
					className={cn(
						"h-5 gap-1 rounded-sm px-1.5 text-3xs",
						presentation.badgeTone,
					)}
				>
					<TypeIcon className="size-3 shrink-0" aria-hidden />
					{presentation.label}
				</Badge>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium leading-tight">
						{title}
					</div>
					<div
						className="truncate font-mono text-3xs text-muted-foreground"
						title={nodeId}
					>
						{nodeId}
					</div>
					{subtitle ? (
						<div className="truncate text-2xs text-muted-foreground">
							{subtitle}
						</div>
					) : null}
				</div>
				{runStatus ? <NodeStatusIndicator status={runStatus} /> : null}
			</div>
			{children ? (
				<div
					className={cn(
						"px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground",
						fill && "flex min-h-0 flex-1 flex-col",
					)}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

function NodeStatusIndicator({ status }: { status: NodeRunStatus }) {
	const label = statusLabel[status];
	return (
		<Tooltip>
			<TooltipTrigger
				className={cn(
					"inline-flex shrink-0 items-center justify-center",
					status === "success" && "text-chart-2",
					status === "error" && "text-destructive",
					status === "running" && "text-primary",
					status === "awaiting_form" && "text-chart-2",
					status === "skipped" && "text-muted-foreground",
					status === "idle" && "text-muted-foreground/60",
				)}
				aria-label={`Run status: ${label}`}
				type="button"
			>
				{status === "running" ? (
					<IconLoader2
						className="size-3.5 animate-spin motion-reduce:animate-none"
						aria-hidden
					/>
				) : null}
				{status === "awaiting_form" ? (
					<IconForms className="size-3.5" aria-hidden />
				) : null}
				{status === "success" ? (
					<IconCircleCheck className="size-3.5" aria-hidden />
				) : null}
				{status === "error" ? (
					<IconCircleX className="size-3.5" aria-hidden />
				) : null}
				{status === "skipped" ? (
					<IconCircleDashed className="size-3.5" aria-hidden />
				) : null}
				{status === "idle" ? (
					<span
						className="size-2 rounded-full bg-muted-foreground/40"
						aria-hidden
					/>
				) : null}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function FlowHandle({
	kind,
	id,
	index,
	total,
	connected,
	placement,
	label,
}: {
	kind: "source" | "target";
	id?: string;
	index: number;
	total: number;
	connected?: boolean;
	placement: "header" | "spread";
	label?: string;
}) {
	// Single ports align to the header row (not 50% of body+header), so nodes
	// with a summary section (e.g. Assert) match Extract/HTTP handle placement.
	// Header placement stacks outs from the title row downward; the node
	// min-height grows with port count so nothing overflows the box.
	const top = (() => {
		if (total <= 1) return "2.125rem";
		if (placement === "header") {
			return `${headerOutTopRem(index)}rem`;
		}
		return `${20 + (index / Math.max(total - 1, 1)) * 60}%`;
	})();

	const showLabel = kind === "source" && Boolean(label);

	return (
		<>
			<Handle
				type={kind}
				id={id}
				position={kind === "target" ? Position.Left : Position.Right}
				style={{ top }}
				className={cn(
					"size-2.5! border-2! border-background!",
					connected ? "bg-primary!" : "bg-muted-foreground!",
				)}
				title={label}
			/>
			{showLabel ? (
				<span
					className="pointer-events-none absolute z-10 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
					style={{ top, right: 12 }}
				>
					{label}
				</span>
			) : null}
		</>
	);
}

export function isHandleConnected(
	edges: {
		source: string;
		target: string;
		sourceHandle?: string | null;
		targetHandle?: string | null;
	}[],
	nodeId: string,
	kind: "source" | "target",
	handleId?: string,
): boolean {
	if (kind === "target") {
		return edges.some(
			(e) =>
				e.target === nodeId && (handleId ? e.targetHandle === handleId : true),
		);
	}
	return edges.some(
		(e) =>
			e.source === nodeId &&
			(handleId ? e.sourceHandle === handleId : !e.sourceHandle),
	);
}

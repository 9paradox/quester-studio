import { Badge } from "@/components/ui/badge.js";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import { cn } from "@/lib/utils.js";
import type { BuiltinNodeType } from "@quester/schema";
import {
	IconCircleCheck,
	IconCircleDashed,
	IconCircleX,
	IconLoader2,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Handle, Position } from "reactflow";
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
};

type PortSpec = { id?: string; connected?: boolean };

type BaseFlowNodeProps = {
	type: BuiltinNodeType;
	title: string;
	subtitle?: string;
	children?: ReactNode;
	targetPorts?: PortSpec[];
	sourcePorts?: PortSpec[];
	selected?: boolean;
	runStatus?: NodeRunStatus;
};

export function BaseFlowNode({
	type,
	title,
	subtitle,
	children,
	targetPorts = [{}],
	sourcePorts = [{}],
	selected,
	runStatus,
}: BaseFlowNodeProps) {
	const presentation = getNodePresentation(type);
	const TypeIcon = presentation.icon;

	return (
		<div
			className={cn(
				"relative min-w-[210px] max-w-[300px] overflow-hidden rounded-lg border bg-card text-card-foreground",
				presentation.accentTone,
				"border-l-[3px]",
				selected && "border-primary shadow-sm",
				runStatus === "running" && "ring-1 ring-primary/40",
				runStatus === "error" && "ring-1 ring-destructive/50",
				runStatus === "skipped" && "opacity-70",
			)}
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
				/>
			))}

			<div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-2.5 py-2">
				<Badge
					variant="secondary"
					className={cn(
						"h-5 gap-1 rounded-sm px-1.5 text-[10px]",
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
					{subtitle ? (
						<div className="truncate text-[11px] text-muted-foreground">
							{subtitle}
						</div>
					) : null}
				</div>
				{runStatus ? <NodeStatusIndicator status={runStatus} /> : null}
			</div>
			{children ? (
				<div className="px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
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
					status === "skipped" && "text-muted-foreground",
					status === "idle" && "text-muted-foreground/60",
				)}
				aria-label={`Run status: ${label}`}
				type="button"
			>
				{status === "running" ? (
					<IconLoader2 className="size-3.5 animate-spin" aria-hidden />
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
}: {
	kind: "source" | "target";
	id?: string;
	index: number;
	total: number;
	connected?: boolean;
}) {
	// Single ports align to the header row (not 50% of body+header), so nodes
	// with a summary section (e.g. Assert) match Extract/HTTP handle placement.
	const top =
		total <= 1 ? "1.75rem" : `${20 + (index / Math.max(total - 1, 1)) * 60}%`;

	return (
		<Handle
			type={kind}
			id={id}
			position={kind === "target" ? Position.Left : Position.Right}
			style={{ top }}
			className={cn(
				"size-2.5! border-2! border-background!",
				connected ? "bg-primary!" : "bg-muted-foreground!",
			)}
		/>
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

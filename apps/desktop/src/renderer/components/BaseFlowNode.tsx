import { Badge } from "@/components/ui/badge.js";
import { cn } from "@/lib/utils.js";
import type { BuiltinNodeType } from "@quester/schema";
import type { ReactNode } from "react";
import { Handle, Position } from "reactflow";

export type FlowNodeData = {
	label?: string;
	[key: string]: unknown;
};

const typeLabel: Record<BuiltinNodeType, string> = {
	input: "Input",
	http: "HTTP",
	extract: "Extract",
	template: "Template",
	set: "Set",
	if: "If",
	output: "Output",
};

const accentTone: Record<BuiltinNodeType, string> = {
	input: "border-l-chart-2",
	http: "border-l-primary",
	extract: "border-l-chart-1",
	template: "border-l-chart-3",
	set: "border-l-muted-foreground/50",
	if: "border-l-chart-4",
	output: "border-l-destructive",
};

const badgeTone: Record<BuiltinNodeType, string> = {
	input: "bg-chart-2/15 text-chart-2",
	http: "bg-primary/15 text-primary",
	extract: "bg-chart-1/15 text-chart-1",
	template: "bg-chart-3/15 text-chart-3",
	set: "bg-muted text-muted-foreground",
	if: "bg-chart-4/15 text-foreground",
	output: "bg-destructive/10 text-destructive",
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
};

export function BaseFlowNode({
	type,
	title,
	subtitle,
	children,
	targetPorts = [{}],
	sourcePorts = [{}],
	selected,
}: BaseFlowNodeProps) {
	return (
		<div
			className={cn(
				"relative min-w-[210px] max-w-[300px] overflow-hidden rounded-lg border bg-card text-card-foreground",
				accentTone[type],
				"border-l-[3px]",
				selected && "border-primary shadow-sm",
			)}
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
					className={cn("h-5 rounded-sm px-1.5 text-[10px]", badgeTone[type])}
				>
					{typeLabel[type]}
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
			</div>
			{children ? (
				<div className="px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
					{children}
				</div>
			) : null}
		</div>
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
	const top =
		total <= 1 ? "50%" : `${20 + (index / Math.max(total - 1, 1)) * 60}%`;

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

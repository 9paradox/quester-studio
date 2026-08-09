import {
	formatAssertCheckSummary,
	normalizeAssertChecks,
} from "@/components/AssertChecksEditor.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectNodeRunStatus,
} from "@/stores/selectors.js";
import { NodeResizer } from "@reactflow/node-resizer";
import type { NodeProps } from "reactflow";
import "@reactflow/node-resizer/dist/style.css";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import { cn } from "@/lib/utils.js";
import { NOTE_FONT_SIZE_DEFAULT } from "@quester-studio/schema";
import { Handle, Position, useEdges } from "reactflow";
import {
	BaseFlowNode,
	type FlowNodeData,
	isHandleConnected,
} from "../BaseFlowNode.js";
import { JsonViewer } from "../JsonViewer.js";

const JSON_NODE_MIN_WIDTH = 210;
const JSON_NODE_MIN_HEIGHT = 140;
const NOTE_NODE_MIN_WIDTH = 180;
const NOTE_NODE_MIN_HEIGHT = 120;
const FRAME_NODE_MIN_WIDTH = 240;
const FRAME_NODE_MIN_HEIGHT = 160;
/** Inset from outer node edge to the inner body frame (entry/exit sit on this). */
const FRAME_INNER_INSET_PX = 14;

function useNodeRunStatus(nodeId: string) {
	return useQuesterStore((s) => selectNodeRunStatus(s, nodeId));
}

function FramePortLabel({
	side,
	top,
	insetPx,
	children,
}: {
	side: "left" | "right";
	top?: string;
	/** Distance from that outer side (px). Higher = further inward. */
	insetPx: number;
	children: string;
}) {
	return (
		<span
			className="pointer-events-none absolute z-10 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground"
			style={{
				top: top ?? "50%",
				...(side === "left" ? { left: insetPx } : { right: insetPx }),
			}}
		>
			{children}
		</span>
	);
}

function FrameContainerShell({
	id,
	type,
	title,
	subtitle,
	selected,
	runStatus,
	outerSources,
}: {
	id: string;
	type: "try" | "foreach";
	title: string;
	subtitle: string;
	selected?: boolean;
	runStatus?: ReturnType<typeof useNodeRunStatus>;
	outerSources: { id: string; label: string }[];
}) {
	const edges = useEdges();
	const presentation = getNodePresentation(type);
	const TypeIcon = presentation.icon;

	const outerInConnected = edges.some(
		(e) =>
			e.target === id &&
			(e.targetHandle == null ||
				e.targetHandle === "" ||
				e.targetHandle === "in"),
	);
	const entryConnected = isHandleConnected(edges, id, "source", "entry");
	const exitConnected = isHandleConnected(edges, id, "target", "exit");

	// Body mid of the inner frame (below header) — single entry / single exit.
	const innerPortTop = "62%";
	// Outer outs live on the header's right edge (not body mid).
	// Single: header vertical center. Two: SUCCESS above FAILED within header.
	const outerOutTops =
		outerSources.length <= 1 ? ["2.125rem"] : ["1.1rem", "2.9rem"];

	const handleClass = (connected: boolean) =>
		cn(
			"size-2.5! border-2! border-background!",
			connected ? "bg-primary!" : "bg-muted-foreground!",
		);

	return (
		<>
			<NodeResizer
				isVisible={Boolean(selected)}
				minWidth={FRAME_NODE_MIN_WIDTH}
				minHeight={FRAME_NODE_MIN_HEIGHT}
				lineClassName="!border-primary"
				handleClassName="!size-2 !rounded-sm !border-primary !bg-background"
			/>
			<div
				className={cn(
					"relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-visible rounded-lg border bg-muted/10 text-card-foreground transition-[box-shadow,opacity] duration-200",
					presentation.accentTone,
					"border-l-[3px]",
					selected && "border-primary shadow-sm",
					runStatus === "running" &&
						"quester-node-running ring-1 ring-primary/40",
					runStatus === "success" && "quester-node-success",
					runStatus === "error" && "ring-1 ring-destructive/50",
				)}
				data-run-status={runStatus ?? "none"}
			>
				{/* Outside → frame (outer left, header) */}
				<Handle
					type="target"
					position={Position.Left}
					style={{ top: "2.125rem" }}
					className={handleClass(outerInConnected)}
					title="in"
				/>

				{/*
				 * Single ENTRY on INNER left border, facing RIGHT into the body
				 * so edges leave inward instead of looping outside.
				 */}
				<Handle
					type="source"
					id="entry"
					position={Position.Right}
					style={{
						top: innerPortTop,
						left: FRAME_INNER_INSET_PX,
						right: "auto",
					}}
					className={cn(
						handleClass(entryConnected),
						"!left-[14px] !right-auto !translate-x-[-50%]",
					)}
					title="entry"
				/>
				<FramePortLabel
					side="left"
					top={innerPortTop}
					insetPx={FRAME_INNER_INSET_PX + 10}
				>
					entry
				</FramePortLabel>

				{/* Outer outs on HEADER right: success / failed / complete */}
				{outerSources.map((port, index) => {
					const top = outerOutTops[index] ?? "2.125rem";
					return (
						<Handle
							key={port.id}
							type="source"
							id={port.id}
							position={Position.Right}
							style={{ top }}
							className={handleClass(
								isHandleConnected(edges, id, "source", port.id),
							)}
							title={port.label}
						/>
					);
				})}
				{outerSources.map((port, index) => {
					const top = outerOutTops[index] ?? "2.125rem";
					return (
						<FramePortLabel
							key={`label-${port.id}`}
							side="right"
							top={top}
							insetPx={12}
						>
							{port.label}
						</FramePortLabel>
					);
				})}

				{/*
				 * Single EXIT on INNER right border, facing LEFT into the body
				 * so edges approach from inside instead of looping outside.
				 */}
				<Handle
					type="target"
					id="exit"
					position={Position.Left}
					style={{
						top: innerPortTop,
						right: FRAME_INNER_INSET_PX,
						left: "auto",
					}}
					className={cn(
						handleClass(exitConnected),
						"!right-[14px] !left-auto !translate-x-[50%]",
					)}
					title="exit"
				/>
				<FramePortLabel
					side="right"
					top={innerPortTop}
					insetPx={FRAME_INNER_INSET_PX + 10}
				>
					exit
				</FramePortLabel>

				<div
					className={cn(
						"flex shrink-0 items-center gap-2 overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-muted/40 px-2.5 py-2",
						outerSources.length > 1 ? "pr-16" : "pr-14",
					)}
				>
					<span
						className={cn(
							"inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[10px]",
							presentation.badgeTone,
							"bg-secondary text-secondary-foreground",
						)}
					>
						<TypeIcon className="size-3 shrink-0" aria-hidden />
						{presentation.label}
					</span>
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium leading-tight">
							{title}
						</div>
						<div
							className="truncate font-mono text-[10px] text-muted-foreground"
							title={id}
						>
							{id}
						</div>
						{subtitle ? (
							<div className="truncate text-[11px] text-muted-foreground">
								{subtitle}
							</div>
						) : null}
					</div>
				</div>

				{/* Inner frame — body area; entry/exit sit on these borders */}
				<div
					className="pointer-events-none relative m-3.5 min-h-0 flex-1 rounded-md border border-border/70 bg-background/25"
					aria-hidden
				/>
			</div>
		</>
	);
}

export function StartFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="start"
			nodeId={id}
			title={data.label ?? "Start"}
			subtitle="Flow entry"
			selected={selected}
			runStatus={runStatus}
			targetPorts={[]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			One outgoing connection only
		</BaseFlowNode>
	);
}

export function InputFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="input"
			nodeId={id}
			title={data.label ?? "Input"}
			subtitle="Run payload"
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			Puts run input on the wire
		</BaseFlowNode>
	);
}

export function HttpFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const method = String(data.method ?? "GET");
	const url = String(data.url ?? "");
	return (
		<BaseFlowNode
			type="http"
			nodeId={id}
			title={data.label ?? "HTTP Request"}
			subtitle={method}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<div className="truncate font-mono text-foreground/80">
				{url || "Set URL in inspector"}
			</div>
		</BaseFlowNode>
	);
}

export function ExtractFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="extract"
			nodeId={id}
			title={data.label ?? "Extract"}
			subtitle={String(data.expression ?? "body")}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function TemplateFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const template = String(data.template ?? "");
	return (
		<BaseFlowNode
			type="template"
			nodeId={id}
			title={data.label ?? "Template"}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<div className="line-clamp-3 font-mono">{template || "…"}</div>
		</BaseFlowNode>
	);
}

export function SetFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const vars = data.variables as Record<string, unknown> | undefined;
	return (
		<BaseFlowNode
			type="set"
			nodeId={id}
			title={data.label ?? "Set"}
			subtitle={`${vars ? Object.keys(vars).length : 0} vars`}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function IfFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const checks = Array.isArray(data.checks)
		? normalizeAssertChecks(data.checks, { allowEmpty: true })
		: [];
	const condition =
		typeof data.condition === "string" && data.condition.length > 0
			? data.condition
			: null;
	const subtitle =
		condition ??
		(checks.length > 0 ? formatAssertCheckSummary(checks) : "condition");
	return (
		<BaseFlowNode
			type="if"
			nodeId={id}
			title={data.label ?? "If"}
			subtitle={subtitle}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[
				{
					id: "true",
					connected: isHandleConnected(edges, id, "source", "true"),
				},
				{
					id: "false",
					connected: isHandleConnected(edges, id, "source", "false"),
				},
			]}
		>
			<span className="font-mono">
				{condition ??
					(checks.length > 0 ? formatAssertCheckSummary(checks) : "true")}
			</span>
		</BaseFlowNode>
	);
}

function switchSourcePorts(
	data: FlowNodeData,
	edges: ReturnType<typeof useEdges>,
	nodeId: string,
) {
	const cases = Array.isArray(data.cases)
		? (data.cases as Array<{ value?: string; handle?: string }>)
		: [];
	const handles = cases
		.map((c) => (typeof c.handle === "string" ? c.handle : null))
		.filter((h): h is string => h !== null && h.length > 0);
	const defaultHandle =
		typeof data.defaultHandle === "string" && data.defaultHandle.length > 0
			? data.defaultHandle
			: "default";
	if (!handles.includes(defaultHandle)) handles.push(defaultHandle);
	return handles.map((handleId) => ({
		id: handleId,
		connected: isHandleConnected(edges, nodeId, "source", handleId),
	}));
}

export function SwitchFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const expression =
		typeof data.expression === "string" && data.expression.length > 0
			? data.expression
			: null;
	const path =
		typeof data.path === "string" && data.path.length > 0 ? data.path : null;
	const cases = Array.isArray(data.cases) ? data.cases.length : 0;
	const subtitle =
		expression ?? path ?? `${cases} case${cases === 1 ? "" : "s"}`;
	return (
		<BaseFlowNode
			type="switch"
			nodeId={id}
			title={data.label ?? "Switch"}
			subtitle={subtitle}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={switchSourcePorts(data, edges, id)}
		>
			<span className="font-mono">{subtitle}</span>
		</BaseFlowNode>
	);
}

export function DelayFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const ms = typeof data.ms === "number" ? data.ms : 0;
	const jitterMs = typeof data.jitterMs === "number" ? data.jitterMs : 0;
	const subtitle =
		jitterMs > 0 ? `${ms}ms + 0–${jitterMs}ms jitter` : `${ms}ms`;
	return (
		<BaseFlowNode
			type="delay"
			nodeId={id}
			title={data.label ?? "Delay"}
			subtitle={subtitle}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<span className="font-mono">{subtitle}</span>
		</BaseFlowNode>
	);
}

export function ForeachFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const runStatus = useNodeRunStatus(id);
	const items =
		typeof data.items === "string" && data.items.length > 0
			? data.items
			: "items";
	const conc =
		typeof data.concurrency === "number" && data.concurrency > 1
			? ` · conc=${data.concurrency}`
			: "";
	return (
		<FrameContainerShell
			id={id}
			type="foreach"
			title={data.label ?? "Foreach"}
			subtitle={`${items}${conc}`}
			selected={selected}
			runStatus={runStatus}
			outerSources={[{ id: "complete", label: "complete" }]}
		/>
	);
}

export function TryFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const runStatus = useNodeRunStatus(id);
	return (
		<FrameContainerShell
			id={id}
			type="try"
			title={data.label ?? "Try"}
			subtitle="Exception boundary"
			selected={selected}
			runStatus={runStatus}
			outerSources={[
				{ id: "success", label: "success" },
				{ id: "failed", label: "failed" },
			]}
		/>
	);
}

export function SubflowFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const flowId =
		typeof data.flowId === "string" && data.flowId.length > 0
			? data.flowId
			: "flow-id";
	return (
		<BaseFlowNode
			type="subflow"
			nodeId={id}
			title={data.label ?? "Subflow"}
			subtitle={flowId}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<span className="font-mono">{flowId}</span>
		</BaseFlowNode>
	);
}

export function OutputFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="output"
			nodeId={id}
			title={data.label ?? "Output"}
			subtitle="Flow result"
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[]}
		/>
	);
}

export function AssertFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const checks = normalizeAssertChecks(data.checks);
	return (
		<BaseFlowNode
			type="assert"
			nodeId={id}
			title={data.label ?? "Assert"}
			subtitle={`${checks.length} check${checks.length === 1 ? "" : "s"}`}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<div className="truncate font-mono text-foreground/80">
				{formatAssertCheckSummary(checks)}
			</div>
		</BaseFlowNode>
	);
}

export function TransformFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const map = data.map as Record<string, unknown> | undefined;
	const keys = map ? Object.keys(map).length : 0;
	return (
		<BaseFlowNode
			type="transform"
			nodeId={id}
			title={data.label ?? "Transform"}
			subtitle={`${keys} field${keys === 1 ? "" : "s"}`}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function MergeFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const sources = Array.isArray(data.sources) ? data.sources : [];
	return (
		<BaseFlowNode
			type="merge"
			nodeId={id}
			title={data.label ?? "Merge"}
			subtitle={sources.join(" + ") || "sources"}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function JoinFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const ins = edges.filter((e) => e.target === id).length;
	return (
		<BaseFlowNode
			type="join"
			nodeId={id}
			title={data.label ?? "Join"}
			subtitle={`${ins} arm${ins === 1 ? "" : "s"}`}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function JsonFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const runResult = useQuesterStore(selectActiveFlowRun).runResult;
	const output = runResult?.nodeOutputs?.[id];
	return (
		<>
			<NodeResizer
				isVisible={Boolean(selected)}
				minWidth={JSON_NODE_MIN_WIDTH}
				minHeight={JSON_NODE_MIN_HEIGHT}
				lineClassName="!border-primary"
				handleClassName="!size-2 !rounded-sm !border-primary !bg-background"
			/>
			<BaseFlowNode
				type="json"
				nodeId={id}
				title={data.label ?? "JSON"}
				subtitle={String(data.expression ?? "previous")}
				selected={selected}
				runStatus={runStatus}
				fill
				targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
				sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
			>
				{output !== undefined ? (
					<div className="min-h-0 flex-1 overflow-auto rounded border bg-background/80 p-1 text-left">
						<JsonViewer value={output} defaultExpandedDepth={1} />
					</div>
				) : (
					<span className="text-muted-foreground">Run flow to preview</span>
				)}
			</BaseFlowNode>
		</>
	);
}

export function InspectFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const runResult = useQuesterStore(selectActiveFlowRun).runResult;
	const output = runResult?.nodeOutputs?.[id];
	return (
		<>
			<NodeResizer
				isVisible={Boolean(selected)}
				minWidth={JSON_NODE_MIN_WIDTH}
				minHeight={JSON_NODE_MIN_HEIGHT}
				lineClassName="!border-primary"
				handleClassName="!size-2 !rounded-sm !border-primary !bg-background"
			/>
			<BaseFlowNode
				type="inspect"
				nodeId={id}
				title={data.label ?? "Inspect"}
				subtitle={String(data.expression ?? "previous")}
				selected={selected}
				runStatus={runStatus}
				fill
				targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
				sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
			>
				{output !== undefined ? (
					<div className="min-h-0 flex-1 overflow-auto rounded border bg-background/80 p-1 text-left">
						<JsonViewer value={output} defaultExpandedDepth={1} />
					</div>
				) : (
					<span className="text-muted-foreground">Run flow to preview</span>
				)}
			</BaseFlowNode>
		</>
	);
}

export function LogFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const message = String(data.message ?? "");
	return (
		<BaseFlowNode
			type="log"
			nodeId={id}
			title={data.label ?? "Log"}
			subtitle={message || "message"}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<div className="line-clamp-3 font-mono text-xs">
				{message || "Set message…"}
			</div>
		</BaseFlowNode>
	);
}

export function NoteFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const text = typeof data.text === "string" ? data.text : "";
	const fontSize =
		typeof data.fontSize === "number" && Number.isFinite(data.fontSize)
			? data.fontSize
			: NOTE_FONT_SIZE_DEFAULT;
	return (
		<>
			<NodeResizer
				isVisible={Boolean(selected)}
				minWidth={NOTE_NODE_MIN_WIDTH}
				minHeight={NOTE_NODE_MIN_HEIGHT}
				lineClassName="!border-primary"
				handleClassName="!size-2 !rounded-sm !border-primary !bg-background"
			/>
			<BaseFlowNode
				type="note"
				nodeId={id}
				title={data.label ?? "Note"}
				subtitle="Canvas only"
				selected={selected}
				fill
				targetPorts={[]}
				sourcePorts={[]}
				className="bg-muted/40"
			>
				{text.trim() ? (
					<div
						className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-left leading-relaxed"
						style={{ fontSize }}
					>
						{text}
					</div>
				) : (
					<span className="text-muted-foreground" style={{ fontSize }}>
						Add note text…
					</span>
				)}
			</BaseFlowNode>
		</>
	);
}

export const flowNodeTypes = {
	start: StartFlowNode,
	input: InputFlowNode,
	http: HttpFlowNode,
	extract: ExtractFlowNode,
	template: TemplateFlowNode,
	set: SetFlowNode,
	if: IfFlowNode,
	switch: SwitchFlowNode,
	delay: DelayFlowNode,
	foreach: ForeachFlowNode,
	try: TryFlowNode,
	subflow: SubflowFlowNode,
	output: OutputFlowNode,
	assert: AssertFlowNode,
	transform: TransformFlowNode,
	merge: MergeFlowNode,
	join: JoinFlowNode,
	json: JsonFlowNode,
	inspect: InspectFlowNode,
	preview: InspectFlowNode,
	log: LogFlowNode,
	note: NoteFlowNode,
};

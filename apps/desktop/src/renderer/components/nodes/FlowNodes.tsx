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
import { useEdges } from "reactflow";
import "@reactflow/node-resizer/dist/style.css";
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

function useNodeRunStatus(nodeId: string) {
	return useQuesterStore((s) => selectNodeRunStatus(s, nodeId));
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
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	const items =
		typeof data.items === "string" && data.items.length > 0
			? data.items
			: "items";
	const map =
		typeof data.map === "string" && data.map.length > 0 ? data.map : null;
	const subtitle = map ? `${items} → ${map}` : items;
	return (
		<BaseFlowNode
			type="foreach"
			nodeId={id}
			title={data.label ?? "Foreach"}
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

export function TryFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
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
		(checks.length > 0 ? formatAssertCheckSummary(checks) : "checks");
	return (
		<BaseFlowNode
			type="try"
			nodeId={id}
			title={data.label ?? "Try"}
			subtitle={subtitle}
			selected={selected}
			runStatus={runStatus}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[
				{
					id: "ok",
					connected: isHandleConnected(edges, id, "source", "ok"),
				},
				{
					id: "catch",
					connected: isHandleConnected(edges, id, "source", "catch"),
				},
			]}
		>
			<span className="font-mono">{subtitle}</span>
		</BaseFlowNode>
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
					<div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-left text-xs leading-relaxed">
						{text}
					</div>
				) : (
					<span className="text-muted-foreground">Add note text…</span>
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
	json: JsonFlowNode,
	inspect: InspectFlowNode,
	preview: InspectFlowNode,
	log: LogFlowNode,
	note: NoteFlowNode,
};

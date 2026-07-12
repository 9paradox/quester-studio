import { useQuesterStore } from "@/stores/quester-store.js";
import type { NodeProps } from "reactflow";
import { useEdges } from "reactflow";
import {
	BaseFlowNode,
	type FlowNodeData,
	isHandleConnected,
} from "../BaseFlowNode.js";
import { JsonViewer } from "../JsonViewer.js";

export function InputFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	return (
		<BaseFlowNode
			type="input"
			title={data.label ?? "Input"}
			subtitle="Flow entry"
			selected={selected}
			targetPorts={[]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			Accepts flow input JSON
		</BaseFlowNode>
	);
}

export function HttpFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const method = String(data.method ?? "GET");
	const url = String(data.url ?? "");
	return (
		<BaseFlowNode
			type="http"
			title={data.label ?? "HTTP Request"}
			subtitle={method}
			selected={selected}
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
	return (
		<BaseFlowNode
			type="extract"
			title={data.label ?? "Extract"}
			subtitle={String(data.expression ?? "body")}
			selected={selected}
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
	const template = String(data.template ?? "");
	return (
		<BaseFlowNode
			type="template"
			title={data.label ?? "Template"}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			<div className="line-clamp-3 font-mono">{template || "…"}</div>
		</BaseFlowNode>
	);
}

export function SetFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const vars = data.variables as Record<string, unknown> | undefined;
	return (
		<BaseFlowNode
			type="set"
			title={data.label ?? "Set"}
			subtitle={`${vars ? Object.keys(vars).length : 0} vars`}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function IfFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	return (
		<BaseFlowNode
			type="if"
			title={data.label ?? "If"}
			subtitle={String(data.condition ?? "")}
			selected={selected}
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
			<span className="font-mono">{String(data.condition ?? "true")}</span>
		</BaseFlowNode>
	);
}

export function OutputFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	return (
		<BaseFlowNode
			type="output"
			title={data.label ?? "Output"}
			subtitle="Flow result"
			selected={selected}
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
	const checks = Array.isArray(data.checks) ? data.checks.length : 0;
	return (
		<BaseFlowNode
			type="assert"
			title={data.label ?? "Assert"}
			subtitle={`${checks} check${checks === 1 ? "" : "s"}`}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function TransformFlowNode({
	id,
	data,
	selected,
}: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const map = data.map as Record<string, unknown> | undefined;
	const keys = map ? Object.keys(map).length : 0;
	return (
		<BaseFlowNode
			type="transform"
			title={data.label ?? "Transform"}
			subtitle={`${keys} field${keys === 1 ? "" : "s"}`}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function MergeFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const sources = Array.isArray(data.sources) ? data.sources : [];
	return (
		<BaseFlowNode
			type="merge"
			title={data.label ?? "Merge"}
			subtitle={sources.join(" + ") || "sources"}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		/>
	);
}

export function JsonFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runResult = useQuesterStore((s) => s.runResult);
	const output = runResult?.nodeOutputs?.[id];
	return (
		<BaseFlowNode
			type="json"
			title={data.label ?? "JSON"}
			subtitle={String(data.expression ?? data.source ?? "previous")}
			selected={selected}
			targetPorts={[{ connected: isHandleConnected(edges, id, "target") }]}
			sourcePorts={[{ connected: isHandleConnected(edges, id, "source") }]}
		>
			{output !== undefined ? (
				<div className="max-h-40 max-w-[280px] overflow-auto rounded border bg-background/80 p-1 text-left">
					<JsonViewer value={output} defaultExpandedDepth={1} />
				</div>
			) : (
				<span className="text-muted-foreground">Run flow to preview</span>
			)}
		</BaseFlowNode>
	);
}

export const flowNodeTypes = {
	input: InputFlowNode,
	http: HttpFlowNode,
	extract: ExtractFlowNode,
	template: TemplateFlowNode,
	set: SetFlowNode,
	if: IfFlowNode,
	output: OutputFlowNode,
	assert: AssertFlowNode,
	transform: TransformFlowNode,
	merge: MergeFlowNode,
	json: JsonFlowNode,
};

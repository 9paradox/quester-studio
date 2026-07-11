import type { NodeProps } from "reactflow";
import { useEdges } from "reactflow";
import {
	BaseFlowNode,
	type FlowNodeData,
	isHandleConnected,
} from "../BaseFlowNode.js";

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

export const flowNodeTypes = {
	input: InputFlowNode,
	http: HttpFlowNode,
	extract: ExtractFlowNode,
	template: TemplateFlowNode,
	set: SetFlowNode,
	if: IfFlowNode,
	output: OutputFlowNode,
};

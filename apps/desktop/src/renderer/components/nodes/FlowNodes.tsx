import {
	formatAssertCheckSummary,
	normalizeAssertChecks,
} from "@/components/AssertChecksEditor.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectNodeRunStatus } from "@/stores/selectors.js";
import type { NodeProps } from "reactflow";
import { useEdges } from "reactflow";
import {
	BaseFlowNode,
	type FlowNodeData,
	isHandleConnected,
} from "../BaseFlowNode.js";
import { JsonViewer } from "../JsonViewer.js";

function useNodeRunStatus(nodeId: string) {
	return useQuesterStore((s) => selectNodeRunStatus(s, nodeId));
}

export function StartFlowNode({ id, data, selected }: NodeProps<FlowNodeData>) {
	const edges = useEdges();
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="start"
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
	return (
		<BaseFlowNode
			type="if"
			title={data.label ?? "If"}
			subtitle={String(data.condition ?? "")}
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
	const runStatus = useNodeRunStatus(id);
	return (
		<BaseFlowNode
			type="output"
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
	const runResult = useQuesterStore((s) => s.runResult);
	const output = runResult?.nodeOutputs?.[id];
	return (
		<BaseFlowNode
			type="json"
			title={data.label ?? "JSON"}
			subtitle={String(data.expression ?? "previous")}
			selected={selected}
			runStatus={runStatus}
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
	start: StartFlowNode,
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

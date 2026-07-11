import type { BuiltinNodeType, FlowV1 } from "@quester/schema";
import type { Edge, Node } from "reactflow";
import { defaultNodeData, newNodeId } from "./nodeCatalog.js";

export type FlowTab = {
	flowId: string;
	flow: FlowV1;
	dirty: boolean;
};

/** @deprecated Use EditorTab from editorTabs.js */
export function flowTabLabel(flow: FlowV1): string {
	return flow.name ?? flow.id;
}

/** @deprecated Use createFlowEditorTab from editorTabs.js */
export function createFlowTab(flow: FlowV1): FlowTab {
	return { flowId: flow.id, flow, dirty: false };
}

export function flowToReactFlow(flow: FlowV1): {
	nodes: Node[];
	edges: Edge[];
} {
	const nodes = flow.nodes.map((n) => ({
		id: n.id,
		type: n.type,
		position: n.position ?? { x: 0, y: 0 },
		data: {
			...(n.data as Record<string, unknown>),
			label: (n.data as { label?: string })?.label ?? `${n.type} (${n.id})`,
		},
	}));
	const edges = flow.edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle ?? undefined,
	}));
	return { nodes, edges };
}

export function reactFlowToFlow(
	baseFlow: FlowV1,
	nodes: Node[],
	edges: Edge[],
): FlowV1 {
	return {
		...baseFlow,
		nodes: nodes.map((n) => ({
			id: n.id,
			type: n.type ?? "input",
			data: stripNodeData(n.data as Record<string, unknown>),
			position: n.position,
		})),
		edges: edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? null,
		})),
	};
}

function stripNodeData(data: Record<string, unknown>): Record<string, unknown> {
	const { label, ...rest } = data;
	const out: Record<string, unknown> = { ...rest };
	if (typeof label === "string") out.label = label;
	return out;
}

export function addNodeToFlow(
	flow: FlowV1,
	type: BuiltinNodeType,
	position = { x: 120, y: 120 },
): FlowV1 {
	const id = newNodeId(type);
	return {
		...flow,
		nodes: [
			...flow.nodes,
			{
				id,
				type,
				data: defaultNodeData(type),
				position,
			},
		],
	};
}

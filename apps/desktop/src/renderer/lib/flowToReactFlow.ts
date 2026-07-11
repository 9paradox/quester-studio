import type { FlowV1 } from "@quester/schema";
import type { Edge, Node } from "reactflow";

export function flowToReactFlow(flow: FlowV1): {
	nodes: Node[];
	edges: Edge[];
} {
	const nodes = flow.nodes.map((n) => ({
		id: n.id,
		type: "default",
		position: n.position ?? { x: 0, y: 0 },
		data: {
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

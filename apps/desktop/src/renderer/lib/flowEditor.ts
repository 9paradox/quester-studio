import type { BuiltinNodeType, FlowV1 } from "@quester-studio/schema";
import type { Edge, Node } from "reactflow";
import { defaultNodeData, newNodeId } from "./nodeCatalog.js";

const JSON_NODE_DEFAULT_WIDTH = 280;
const JSON_NODE_DEFAULT_HEIGHT = 220;
const NOTE_NODE_DEFAULT_WIDTH = 240;
const NOTE_NODE_DEFAULT_HEIGHT = 160;

function defaultSizeForType(
	type: string,
): { width: number; height: number } | undefined {
	if (type === "json" || type === "inspect" || type === "preview") {
		return { width: JSON_NODE_DEFAULT_WIDTH, height: JSON_NODE_DEFAULT_HEIGHT };
	}
	if (type === "note") {
		return { width: NOTE_NODE_DEFAULT_WIDTH, height: NOTE_NODE_DEFAULT_HEIGHT };
	}
	return undefined;
}

/** Wider hit target so edges are easier to select, delete, and reconnect. */
export const EDGE_INTERACTION_WIDTH = 24;

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
	const nodes = flow.nodes.map((n) => {
		const defaults = defaultSizeForType(n.type);
		const width = n.width ?? defaults?.width;
		const height = n.height ?? defaults?.height;
		return {
			id: n.id,
			type: n.type,
			position: n.position ?? { x: 0, y: 0 },
			...(width != null ? { width } : {}),
			...(height != null ? { height } : {}),
			style:
				width != null || height != null
					? {
							...(width != null ? { width } : {}),
							...(height != null ? { height } : {}),
						}
					: undefined,
			data: {
				...(n.data as Record<string, unknown>),
				label: (n.data as { label?: string })?.label ?? `${n.type} (${n.id})`,
			},
		};
	});
	const edges = flow.edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle ?? undefined,
		interactionWidth: EDGE_INTERACTION_WIDTH,
		reconnectable: true as const,
	}));
	return { nodes, edges };
}

type ConnectionNodes = ReadonlyArray<{ id: string; type?: string | null }>;
type ConnectionEdges = ReadonlyArray<{ id: string; source: string }>;

/**
 * Canvas connection rules: no incoming edges to `start`; `start` has at most
 * one outgoing edge (ignoreEdgeId lets reconnect move the existing edge);
 * `note` stickies cannot be connected.
 */
export function isValidFlowConnection(options: {
	source: string | null | undefined;
	target: string | null | undefined;
	nodes: ConnectionNodes;
	edges: ConnectionEdges;
	ignoreEdgeId?: string | null;
}): boolean {
	const { source, target, nodes, edges, ignoreEdgeId } = options;
	if (!source || !target) return false;
	const sourceNode = nodes.find((n) => n.id === source);
	const targetNode = nodes.find((n) => n.id === target);
	if (sourceNode?.type === "note" || targetNode?.type === "note") return false;
	if (targetNode?.type === "start") return false;
	if (sourceNode?.type === "start") {
		return !edges.some((e) => e.source === source && e.id !== ignoreEdgeId);
	}
	return true;
}

export function reactFlowToFlow(
	baseFlow: FlowV1,
	nodes: Node[],
	edges: Edge[],
): FlowV1 {
	return {
		...baseFlow,
		nodes: nodes.map((n) => {
			const width = readNodeSize(n, "width");
			const height = readNodeSize(n, "height");
			return {
				id: n.id,
				type: n.type ?? "input",
				data: stripNodeData(n.data as Record<string, unknown>),
				position: n.position,
				...(width != null ? { width } : {}),
				...(height != null ? { height } : {}),
			};
		}),
		edges: edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? null,
		})),
	};
}

function readNodeSize(
	node: Node,
	axis: "width" | "height",
): number | undefined {
	const fromNode = node[axis];
	if (
		typeof fromNode === "number" &&
		Number.isFinite(fromNode) &&
		fromNode > 0
	) {
		return fromNode;
	}
	const fromStyle = node.style?.[axis];
	if (
		typeof fromStyle === "number" &&
		Number.isFinite(fromStyle) &&
		fromStyle > 0
	) {
		return fromStyle;
	}
	if (typeof fromStyle === "string") {
		const parsed = Number.parseFloat(fromStyle);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return undefined;
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
	if (type === "start" && flow.nodes.some((n) => n.type === "start")) {
		return flow;
	}
	const id = type === "start" ? "start" : newNodeId(type);
	return {
		...flow,
		nodes: [
			...flow.nodes,
			{
				id,
				type,
				data: defaultNodeData(type),
				position,
				...(defaultSizeForType(type) ?? {}),
			},
		],
	};
}

export function deleteNodesFromFlow(flow: FlowV1, nodeIds: string[]): FlowV1 {
	const remove = new Set(nodeIds);
	for (const n of flow.nodes) {
		if (n.type === "start") remove.delete(n.id);
	}
	if (remove.size === 0) return flow;
	return {
		...flow,
		nodes: flow.nodes.filter((n) => !remove.has(n.id)),
		edges: flow.edges.filter(
			(e) => !remove.has(e.source) && !remove.has(e.target),
		),
	};
}

export function deleteEdgesFromFlow(flow: FlowV1, edgeIds: string[]): FlowV1 {
	const remove = new Set(edgeIds);
	if (remove.size === 0) return flow;
	return {
		...flow,
		edges: flow.edges.filter((e) => !remove.has(e.id)),
	};
}

const DUPLICATE_OFFSET = { x: 40, y: 40 };

export function duplicateNodeInFlow(
	flow: FlowV1,
	nodeId: string,
): { flow: FlowV1; newNodeId: string } | null {
	const node = flow.nodes.find((n) => n.id === nodeId);
	if (!node || node.type === "start") return null;
	const type = node.type as BuiltinNodeType;
	const id = newNodeId(type);
	const position = {
		x: (node.position?.x ?? 0) + DUPLICATE_OFFSET.x,
		y: (node.position?.y ?? 0) + DUPLICATE_OFFSET.y,
	};
	const data = { ...(node.data as Record<string, unknown>) };
	const label = typeof data.label === "string" ? data.label : undefined;
	if (label && !label.endsWith(" (copy)")) {
		data.label = `${label} (copy)`;
	}
	return {
		newNodeId: id,
		flow: {
			...flow,
			nodes: [
				...flow.nodes,
				{
					id,
					type,
					data,
					position,
					...(node.width != null ? { width: node.width } : {}),
					...(node.height != null ? { height: node.height } : {}),
				},
			],
		},
	};
}

export type AlignNodesMode =
	| "left"
	| "right"
	| "top"
	| "bottom"
	| "centerX"
	| "centerY";

function nodeX(node: FlowV1["nodes"][number]): number {
	return node.position?.x ?? 0;
}

function nodeY(node: FlowV1["nodes"][number]): number {
	return node.position?.y ?? 0;
}

function nodeW(node: FlowV1["nodes"][number]): number {
	return typeof node.width === "number" && node.width > 0 ? node.width : 0;
}

function nodeH(node: FlowV1["nodes"][number]): number {
	return typeof node.height === "number" && node.height > 0 ? node.height : 0;
}

/** Align selected nodes; preserves each node's size. Needs ≥2 ids. */
export function alignNodes(
	flow: FlowV1,
	nodeIds: readonly string[],
	mode: AlignNodesMode,
): FlowV1 {
	const idSet = new Set(nodeIds);
	const targets = flow.nodes.filter((n) => idSet.has(n.id));
	if (targets.length < 2) return flow;

	let nextX: ((n: FlowV1["nodes"][number]) => number) | null = null;
	let nextY: ((n: FlowV1["nodes"][number]) => number) | null = null;

	switch (mode) {
		case "left": {
			const v = Math.min(...targets.map(nodeX));
			nextX = () => v;
			break;
		}
		case "right": {
			const v = Math.max(...targets.map((n) => nodeX(n) + nodeW(n)));
			nextX = (n) => v - nodeW(n);
			break;
		}
		case "centerX": {
			const min = Math.min(...targets.map(nodeX));
			const max = Math.max(...targets.map((n) => nodeX(n) + nodeW(n)));
			const mid = (min + max) / 2;
			nextX = (n) => mid - nodeW(n) / 2;
			break;
		}
		case "top": {
			const v = Math.min(...targets.map(nodeY));
			nextY = () => v;
			break;
		}
		case "bottom": {
			const v = Math.max(...targets.map((n) => nodeY(n) + nodeH(n)));
			nextY = (n) => v - nodeH(n);
			break;
		}
		case "centerY": {
			const min = Math.min(...targets.map(nodeY));
			const max = Math.max(...targets.map((n) => nodeY(n) + nodeH(n)));
			const mid = (min + max) / 2;
			nextY = (n) => mid - nodeH(n) / 2;
			break;
		}
		default: {
			const _exhaustive: never = mode;
			return _exhaustive;
		}
	}

	return {
		...flow,
		nodes: flow.nodes.map((n) => {
			if (!idSet.has(n.id)) return n;
			return {
				...n,
				position: {
					x: nextX ? nextX(n) : nodeX(n),
					y: nextY ? nextY(n) : nodeY(n),
				},
			};
		}),
	};
}

/** Evenly space nodes between the first and last along an axis. Needs ≥3 ids. */
export function distributeNodes(
	flow: FlowV1,
	nodeIds: readonly string[],
	axis: "horizontal" | "vertical",
): FlowV1 {
	const idSet = new Set(nodeIds);
	const targets = flow.nodes.filter((n) => idSet.has(n.id));
	if (targets.length < 3) return flow;

	const sorted = [...targets].sort((a, b) =>
		axis === "horizontal" ? nodeX(a) - nodeX(b) : nodeY(a) - nodeY(b),
	);
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	if (!first || !last) return flow;

	const start = axis === "horizontal" ? nodeX(first) : nodeY(first);
	const end = axis === "horizontal" ? nodeX(last) : nodeY(last);
	const step = (end - start) / (sorted.length - 1);
	const positions = new Map<string, { x: number; y: number }>();
	for (let i = 0; i < sorted.length; i += 1) {
		const n = sorted[i];
		if (!n) continue;
		if (axis === "horizontal") {
			positions.set(n.id, { x: start + step * i, y: nodeY(n) });
		} else {
			positions.set(n.id, { x: nodeX(n), y: start + step * i });
		}
	}

	return {
		...flow,
		nodes: flow.nodes.map((n) => {
			const pos = positions.get(n.id);
			if (!pos) return n;
			return { ...n, position: pos };
		}),
	};
}

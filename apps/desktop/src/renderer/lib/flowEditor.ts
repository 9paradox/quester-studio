import type { BuiltinNodeType, FlowV1 } from "@quester-studio/schema";
import type { CSSProperties } from "react";
import type { Edge, Node } from "reactflow";
import { defaultNodeData, newNodeId } from "./nodeCatalog.js";

const JSON_NODE_DEFAULT_WIDTH = 280;
const JSON_NODE_DEFAULT_HEIGHT = 220;
const NOTE_NODE_DEFAULT_WIDTH = 240;
const NOTE_NODE_DEFAULT_HEIGHT = 160;
const FRAME_NODE_DEFAULT_WIDTH = 320;
const FRAME_NODE_DEFAULT_HEIGHT = 240;

function defaultSizeForType(
	type: string,
): { width: number; height: number } | undefined {
	if (type === "json" || type === "inspect" || type === "preview") {
		return { width: JSON_NODE_DEFAULT_WIDTH, height: JSON_NODE_DEFAULT_HEIGHT };
	}
	if (type === "note") {
		return { width: NOTE_NODE_DEFAULT_WIDTH, height: NOTE_NODE_DEFAULT_HEIGHT };
	}
	if (type === "try" || type === "foreach") {
		return {
			width: FRAME_NODE_DEFAULT_WIDTH,
			height: FRAME_NODE_DEFAULT_HEIGHT,
		};
	}
	return undefined;
}

export function isFrameContainerType(type: string | null | undefined): boolean {
	return type === "try" || type === "foreach";
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

/** React Flow requires parents before children so kids/edges paint above the frame. */
export function sortParentsBeforeChildren<
	T extends { id: string; parentId?: string },
>(nodes: T[]): T[] {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const depth = (id: string): number => {
		let d = 0;
		let cur = byId.get(id)?.parentId;
		const seen = new Set<string>();
		while (cur && !seen.has(cur)) {
			seen.add(cur);
			d += 1;
			cur = byId.get(cur)?.parentId;
		}
		return d;
	};
	return [...nodes].sort((a, b) => depth(a.id) - depth(b.id));
}

export function flowToReactFlow(flow: FlowV1): {
	nodes: Node[];
	edges: Edge[];
} {
	const parentIds = new Set(
		flow.nodes.filter((n) => n.parentId).map((n) => n.parentId as string),
	);
	const ordered = sortParentsBeforeChildren(flow.nodes);
	const nodes = ordered.map((n) => {
		const defaults = defaultSizeForType(n.type);
		const width = n.width ?? defaults?.width;
		const height = n.height ?? defaults?.height;
		const isFrame = isFrameContainerType(n.type);
		const isChild = Boolean(n.parentId);
		const style: CSSProperties = {
			...(width != null ? { width } : {}),
			...(height != null ? { height } : {}),
			...(isFrame ? { zIndex: 0 } : {}),
			...(isChild ? { zIndex: 1 } : {}),
		};
		return {
			id: n.id,
			type: n.type,
			position: n.position ?? { x: 0, y: 0 },
			...(width != null ? { width } : {}),
			...(height != null ? { height } : {}),
			...(n.parentId ? { parentId: n.parentId } : {}),
			...(n.extent === "parent" ? { extent: "parent" as const } : {}),
			...(isFrame || isChild ? { zIndex: isFrame ? 0 : 1 } : {}),
			...(Object.keys(style).length > 0 ? { style } : {}),
			data: {
				...(n.data as Record<string, unknown>),
				label: (n.data as { label?: string })?.label ?? `${n.type} (${n.id})`,
			},
		};
	});
	const edges = flow.edges.map((e) => {
		const sourceIsFrame = parentIds.has(e.source);
		const targetIsFrame = parentIds.has(e.target);
		const sourceChild = flow.nodes.find((n) => n.id === e.source)?.parentId;
		const targetChild = flow.nodes.find((n) => n.id === e.target)?.parentId;
		const inFrame =
			Boolean(sourceChild) ||
			Boolean(targetChild) ||
			sourceIsFrame ||
			targetIsFrame ||
			e.sourceHandle === "entry" ||
			e.targetHandle === "exit";
		return {
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? undefined,
			targetHandle: e.targetHandle ?? undefined,
			interactionWidth: EDGE_INTERACTION_WIDTH,
			reconnectable: true as const,
			// Body + entry/exit edges must paint above the frame fill.
			...(inFrame ? { zIndex: 1002 } : {}),
		};
	});
	return { nodes, edges };
}

type ConnectionNodes = ReadonlyArray<{
	id: string;
	type?: string | null;
	parentId?: string | null;
}>;
type ConnectionEdges = ReadonlyArray<{
	id: string;
	source: string;
	target?: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
}>;

/**
 * Canvas connection rules: start/note constraints, max-1-in (except join),
 * framed try/foreach entry/exit and pierce bans.
 */
export function isValidFlowConnection(options: {
	source: string | null | undefined;
	target: string | null | undefined;
	sourceHandle?: string | null;
	targetHandle?: string | null;
	nodes: ConnectionNodes;
	edges: ConnectionEdges;
	ignoreEdgeId?: string | null;
}): boolean {
	const {
		source,
		target,
		sourceHandle,
		targetHandle,
		nodes,
		edges,
		ignoreEdgeId,
	} = options;
	if (!source || !target) return false;
	const sourceNode = nodes.find((n) => n.id === source);
	const targetNode = nodes.find((n) => n.id === target);
	if (!sourceNode || !targetNode) return false;
	if (sourceNode.type === "note" || targetNode.type === "note") return false;
	if (targetNode.type === "start") return false;
	if (sourceNode.type === "start") {
		return !edges.some((e) => e.source === source && e.id !== ignoreEdgeId);
	}

	const sp = sourceNode.parentId ?? undefined;
	const tp = targetNode.parentId ?? undefined;
	const sh = sourceHandle ?? null;
	const th = targetHandle ?? null;

	// Frame entry: container → child (at most one entry edge per frame)
	if (isFrameContainerType(sourceNode.type) && tp === source) {
		if (!(sh === "entry" || sh === null)) return false;
		const hasEntry = edges.some((e) => {
			if (e.id === ignoreEdgeId || e.source !== source) return false;
			const tgt = nodes.find((n) => n.id === e.target);
			if (tgt?.parentId !== source) return false;
			return (
				e.sourceHandle === "entry" ||
				e.sourceHandle == null ||
				e.sourceHandle === ""
			);
		});
		if (hasEntry) return false;
	} else if (isFrameContainerType(targetNode.type) && sp === target) {
		// Frame exit: child → container (at most one exit edge per frame)
		if (!(th === "exit" || th === null)) return false;
		const hasExit = edges.some((e) => {
			if (e.id === ignoreEdgeId || e.target !== target) return false;
			const pred = nodes.find((n) => n.id === e.source);
			if (pred?.parentId !== target) return false;
			return (
				e.targetHandle === "exit" ||
				e.targetHandle == null ||
				e.targetHandle === ""
			);
		});
		if (hasExit) return false;
	} else if (isFrameContainerType(sourceNode.type) && tp !== source) {
		// Outer from frame
		if (sp !== tp) return false;
		if (sourceNode.type === "try") {
			if (!(sh === "success" || sh === "failed")) return false;
		} else if (sourceNode.type === "foreach") {
			if (sh !== "complete") return false;
		} else {
			return false;
		}
	} else if (sp !== tp) {
		// Pierce ban
		return false;
	}

	// Max one incoming (join is N-in); body→frame exits do not count on containers.
	if (targetNode.type !== "join") {
		const newCountsAsIncoming = !(
			isFrameContainerType(targetNode.type) && sp === target
		);
		if (newCountsAsIncoming) {
			const existing = edges.filter((e) => {
				if (e.target !== target || e.id === ignoreEdgeId) return false;
				const pred = nodes.find((n) => n.id === e.source);
				if (
					isFrameContainerType(targetNode.type) &&
					pred?.parentId === target
				) {
					return false;
				}
				return true;
			});
			if (existing.length >= 1) return false;
		}
	}

	// Ban cycles among siblings (same parent, including root). Frame entry/exit
	// edges intentionally touch the container and are excluded from this walk.
	const isFrameEntry = isFrameContainerType(sourceNode.type) && tp === source;
	const isFrameExit = isFrameContainerType(targetNode.type) && sp === target;
	if (
		!isFrameEntry &&
		!isFrameExit &&
		wouldCreateSiblingCycle(nodes, edges, source, target, ignoreEdgeId)
	) {
		return false;
	}

	return true;
}

/** True if adding source→target would close a cycle in the non-frame-loop graph. */
function wouldCreateSiblingCycle(
	nodes: ConnectionNodes,
	edges: ConnectionEdges,
	source: string,
	target: string,
	ignoreEdgeId?: string | null,
): boolean {
	if (source === target) return true;
	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const adj = new Map<string, string[]>();
	for (const n of nodes) adj.set(n.id, []);
	for (const e of edges) {
		if (e.id === ignoreEdgeId || !e.target) continue;
		const sn = nodeById.get(e.source);
		const tn = nodeById.get(e.target);
		if (!sn || !tn) continue;
		// Skip frame entry/exit (container ↔ body)
		if (isFrameContainerType(sn.type) && tn.parentId === sn.id) continue;
		if (isFrameContainerType(tn.type) && sn.parentId === tn.id) continue;
		adj.get(e.source)?.push(e.target);
	}
	// Can target already reach source?
	const seen = new Set<string>();
	const stack = [target];
	while (stack.length > 0) {
		const cur = stack.pop();
		if (cur == null) break;
		if (cur === source) return true;
		if (seen.has(cur)) continue;
		seen.add(cur);
		for (const next of adj.get(cur) ?? []) stack.push(next);
	}
	return false;
}

export function reactFlowToFlow(
	baseFlow: FlowV1,
	nodes: Node[],
	edges: Edge[],
): FlowV1 {
	const mapped = nodes.map((n) => {
		const width = readNodeSize(n, "width");
		const height = readNodeSize(n, "height");
		return {
			id: n.id,
			type: n.type ?? "input",
			data: stripNodeData(n.data as Record<string, unknown>),
			position: n.position,
			...(width != null ? { width } : {}),
			...(height != null ? { height } : {}),
			...(n.parentId ? { parentId: n.parentId } : {}),
			...(n.extent === "parent" ? { extent: "parent" as const } : {}),
		};
	});
	return {
		...baseFlow,
		nodes: sortParentsBeforeChildren(mapped),
		edges: edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? null,
			targetHandle: e.targetHandle ?? null,
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
	// Cascade delete frame children
	let grew = true;
	while (grew) {
		grew = false;
		for (const n of flow.nodes) {
			if (n.parentId && remove.has(n.parentId) && !remove.has(n.id)) {
				if (n.type === "start") continue;
				remove.add(n.id);
				grew = true;
			}
		}
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

function hasInFramePredecessor(
	flow: FlowV1,
	containerId: string,
	childId: string,
): boolean {
	return flow.edges.some((e) => {
		if (e.target !== childId) return false;
		if (e.source === containerId) return true;
		const src = flow.nodes.find((n) => n.id === e.source);
		return src?.parentId === containerId;
	});
}

function hasInFrameSuccessor(
	flow: FlowV1,
	containerId: string,
	childId: string,
): boolean {
	return flow.edges.some((e) => {
		if (e.source !== childId) return false;
		if (e.target === containerId) return true;
		const tgt = flow.nodes.find((n) => n.id === e.target);
		return tgt?.parentId === containerId;
	});
}

/**
 * Ensure a child inside a frame has entry/exit only when the frame still
 * has none and this child is a body root/sink. Frames allow at most one
 * entry edge and one exit edge.
 */
export function ensureFrameBodyWiring(
	flow: FlowV1,
	containerId: string,
	childId: string,
): FlowV1 {
	const frameHasEntry = flow.edges.some((e) => {
		if (e.source !== containerId) return false;
		if (
			!(
				e.sourceHandle === "entry" ||
				e.sourceHandle == null ||
				e.sourceHandle === ""
			)
		) {
			return false;
		}
		return flow.nodes.find((n) => n.id === e.target)?.parentId === containerId;
	});
	const frameHasExit = flow.edges.some(
		(e) =>
			e.target === containerId &&
			(e.targetHandle === "exit" ||
				e.targetHandle == null ||
				e.targetHandle === "") &&
			flow.nodes.find((n) => n.id === e.source)?.parentId === containerId,
	);
	const needsEntry =
		!frameHasEntry && !hasInFramePredecessor(flow, containerId, childId);
	const needsExit =
		!frameHasExit && !hasInFrameSuccessor(flow, containerId, childId);
	if (!needsEntry && !needsExit) return flow;

	const edges = [...flow.edges];
	if (needsEntry) {
		edges.push({
			id: `e-${containerId}-entry-${childId}`,
			source: containerId,
			target: childId,
			sourceHandle: "entry",
		});
	}
	if (needsExit) {
		edges.push({
			id: `e-${childId}-exit-${containerId}`,
			source: childId,
			target: containerId,
			targetHandle: "exit",
		});
	}
	return { ...flow, edges };
}

/**
 * After wiring body siblings A→B, drop redundant entry→B and A→exit edges,
 * then re-attach a single exit on B when the frame no longer has one.
 */
export function pruneRedundantFrameWiring(
	flow: FlowV1,
	bodySourceId: string,
	bodyTargetId: string,
): FlowV1 {
	const source = flow.nodes.find((n) => n.id === bodySourceId);
	const target = flow.nodes.find((n) => n.id === bodyTargetId);
	if (!source?.parentId || source.parentId !== target?.parentId) return flow;
	const frameId = source.parentId;
	const filtered = flow.edges.filter((e) => {
		if (
			e.source === frameId &&
			e.target === bodyTargetId &&
			(e.sourceHandle === "entry" || e.sourceHandle == null)
		) {
			return false;
		}
		if (
			e.source === bodySourceId &&
			e.target === frameId &&
			(e.targetHandle === "exit" || e.targetHandle == null)
		) {
			return false;
		}
		return true;
	});
	const hasExit = filtered.some(
		(e) =>
			e.target === frameId &&
			(e.targetHandle === "exit" ||
				e.targetHandle == null ||
				e.targetHandle === "") &&
			flow.nodes.find((n) => n.id === e.source)?.parentId === frameId,
	);
	if (!hasExit) {
		return {
			...flow,
			edges: [
				...filtered,
				{
					id: `e-${bodyTargetId}-exit-${frameId}`,
					source: bodyTargetId,
					target: frameId,
					targetHandle: "exit",
				},
			],
		};
	}
	if (filtered.length === flow.edges.length) return flow;
	return { ...flow, edges: filtered };
}

/**
 * Reparent a node into a frame (or clear parent when frameId is null).
 * Positions are absolute canvas coords on the way in; converted to relative
 * when assigning a parent.
 */
export function reparentNodeInFlow(
	flow: FlowV1,
	nodeId: string,
	frameId: string | null,
	absolutePosition: { x: number; y: number },
): FlowV1 {
	const node = flow.nodes.find((n) => n.id === nodeId);
	if (!node || node.type === "start" || isFrameContainerType(node.type)) {
		return flow;
	}
	if (frameId === nodeId) return flow;
	if (frameId) {
		const frame = flow.nodes.find((n) => n.id === frameId);
		if (!frame || !isFrameContainerType(frame.type)) return flow;
		// No parenting onto own descendant
		let walk: string | undefined = frame.parentId;
		while (walk) {
			if (walk === nodeId) return flow;
			walk = flow.nodes.find((n) => n.id === walk)?.parentId;
		}
		const fx = frame.position?.x ?? 0;
		const fy = frame.position?.y ?? 0;
		const relative = {
			x: absolutePosition.x - fx,
			y: Math.max(40, absolutePosition.y - fy),
		};
		let next: FlowV1 = {
			...flow,
			nodes: flow.nodes.map((n) =>
				n.id === nodeId
					? {
							...n,
							parentId: frameId,
							extent: "parent" as const,
							position: relative,
						}
					: n,
			),
		};
		next = ensureFrameBodyWiring(next, frameId, nodeId);
		return next;
	}
	// Clear parent — use absolute position
	return {
		...flow,
		nodes: flow.nodes.map((n) => {
			if (n.id !== nodeId) return n;
			const { parentId: _p, extent: _e, ...rest } = n;
			return { ...rest, position: absolutePosition };
		}),
		edges: flow.edges.filter((e) => {
			// Drop entry/exit edges tied to old parent
			if (!node.parentId) return true;
			if (
				e.source === node.parentId &&
				e.target === nodeId &&
				(e.sourceHandle === "entry" || e.sourceHandle == null)
			) {
				return false;
			}
			if (
				e.source === nodeId &&
				e.target === node.parentId &&
				(e.targetHandle === "exit" || e.targetHandle == null)
			) {
				return false;
			}
			return true;
		}),
	};
}

export function findFrameAtPoint(
	flow: FlowV1,
	point: { x: number; y: number },
	excludeNodeId?: string,
): string | null {
	const frames = flow.nodes.filter(
		(n) =>
			isFrameContainerType(n.type) && n.id !== excludeNodeId && !n.parentId, // top-level frames for hit-test; nested ok later
	);
	// Prefer smallest containing frame (most specific)
	let best: { id: string; area: number } | null = null;
	for (const frame of frames) {
		const x = frame.position?.x ?? 0;
		const y = frame.position?.y ?? 0;
		const w = frame.width ?? FRAME_NODE_DEFAULT_WIDTH;
		const h = frame.height ?? FRAME_NODE_DEFAULT_HEIGHT;
		if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) {
			const area = w * h;
			if (!best || area < best.area) best = { id: frame.id, area };
		}
	}
	return best?.id ?? null;
}

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

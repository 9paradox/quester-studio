import {
	type FlowEdgeV1,
	type FlowNodeV1,
	type FlowV1,
	isFrameContainerType,
} from "@quester-studio/schema";

export function isFrameEntryEdge(
	edge: FlowEdgeV1,
	source: FlowNodeV1,
	target: FlowNodeV1,
): boolean {
	if (!isFrameContainerType(source.type)) return false;
	if (target.parentId !== source.id) return false;
	const h = edge.sourceHandle ?? "entry";
	return h === "entry" || h === null;
}

export function isFrameExitEdge(
	edge: FlowEdgeV1,
	source: FlowNodeV1,
	target: FlowNodeV1,
): boolean {
	if (!isFrameContainerType(target.type)) return false;
	if (source.parentId !== target.id) return false;
	const h = edge.targetHandle ?? "exit";
	return h === "exit" || h === null;
}

export function isFrameLoopEdge(
	edge: FlowEdgeV1,
	nodeById: Map<string, FlowNodeV1>,
): boolean {
	const source = nodeById.get(edge.source);
	const target = nodeById.get(edge.target);
	if (!source || !target) return false;
	return (
		isFrameEntryEdge(edge, source, target) ||
		isFrameExitEdge(edge, source, target)
	);
}

export function frameChildren(flow: FlowV1, containerId: string): FlowNodeV1[] {
	return flow.nodes.filter((n) => n.parentId === containerId);
}

export function frameEntryTargets(
	flow: FlowV1,
	container: FlowNodeV1,
	nodeById: Map<string, FlowNodeV1>,
): string[] {
	const targets: string[] = [];
	for (const edge of flow.edges) {
		if (edge.source !== container.id) continue;
		const target = nodeById.get(edge.target);
		if (!target) continue;
		if (isFrameEntryEdge(edge, container, target)) {
			targets.push(edge.target);
		}
	}
	return targets;
}

export function frameExitSources(
	flow: FlowV1,
	container: FlowNodeV1,
	nodeById: Map<string, FlowNodeV1>,
): Set<string> {
	const sources = new Set<string>();
	for (const edge of flow.edges) {
		if (edge.target !== container.id) continue;
		const source = nodeById.get(edge.source);
		if (!source) continue;
		if (isFrameExitEdge(edge, source, container)) {
			sources.add(edge.source);
		}
	}
	return sources;
}

/** Synthetic mini-flow for a frame body (direct children + child→child edges). */
export function buildBodyFlow(flow: FlowV1, containerId: string): FlowV1 {
	const children = frameChildren(flow, containerId);
	const childIds = new Set(children.map((c) => c.id));
	const edges = flow.edges.filter(
		(e) => childIds.has(e.source) && childIds.has(e.target),
	);
	return {
		id: `${flow.id}__body_${containerId}`,
		version: flow.version,
		nodes: children,
		edges,
	};
}

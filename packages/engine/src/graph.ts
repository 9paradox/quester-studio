import type { FlowEdgeV1, FlowNodeV1, FlowV1 } from "@quester-studio/schema";

export function topologicalSort(flow: FlowV1): FlowNodeV1[] {
	const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
	const indegree = new Map<string, number>();
	for (const node of flow.nodes) indegree.set(node.id, 0);
	for (const edge of flow.edges) {
		indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
	}
	const queue = flow.nodes
		.filter((n) => (indegree.get(n.id) ?? 0) === 0)
		.map((n) => n.id);
	const order: FlowNodeV1[] = [];
	const adj = new Map<string, string[]>();
	for (const edge of flow.edges) {
		const list = adj.get(edge.source) ?? [];
		list.push(edge.target);
		adj.set(edge.source, list);
	}
	while (queue.length > 0) {
		const id = queue.shift();
		if (!id) break;
		const node = nodeById.get(id);
		if (node) order.push(node);
		for (const next of adj.get(id) ?? []) {
			const d = (indegree.get(next) ?? 0) - 1;
			indegree.set(next, d);
			if (d === 0) queue.push(next);
		}
	}
	return order.length === flow.nodes.length ? order : flow.nodes;
}

export function outgoingEdges(flow: FlowV1, nodeId: string): FlowEdgeV1[] {
	return flow.edges.filter((e) => e.source === nodeId);
}

export function selectNextEdges(
	flow: FlowV1,
	node: FlowNodeV1,
	branch?: string,
): FlowEdgeV1[] {
	const edges = outgoingEdges(flow, node.id);
	if (node.type === "switch") {
		const handle = branch ?? "default";
		const filtered = edges.filter(
			(e) => (e.sourceHandle ?? "default") === handle,
		);
		return filtered.length > 0
			? filtered
			: edges.filter((e) => !e.sourceHandle);
	}
	const branchConfig: Record<
		string,
		{ defaultHandle: string; fallbackHandle: string }
	> = {
		if: { defaultHandle: "false", fallbackHandle: "true" },
		try: { defaultHandle: "catch", fallbackHandle: "ok" },
	};
	const config = branchConfig[node.type];
	if (!config) return edges;
	const handle = branch ?? config.defaultHandle;
	const filtered = edges.filter(
		(e) => (e.sourceHandle ?? config.fallbackHandle) === handle,
	);
	return filtered.length > 0 ? filtered : edges.filter((e) => !e.sourceHandle);
}

/** Nodes that have run or may still run given exclusive branch choices. */
export function computeLiveNodes(
	flow: FlowV1,
	executed: ReadonlySet<string>,
	branchTaken: ReadonlyMap<string, string | undefined>,
): Set<string> {
	const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
	const hasIncoming = new Set(flow.edges.map((e) => e.target));
	const starts = flow.nodes
		.filter((n) => !hasIncoming.has(n.id))
		.map((n) => n.id);
	const live = new Set<string>();
	const queue = [...starts];
	while (queue.length > 0) {
		const id = queue.shift();
		if (!id || live.has(id)) continue;
		live.add(id);
		const node = nodeById.get(id);
		if (!node || !executed.has(id)) continue;
		for (const edge of selectNextEdges(flow, node, branchTaken.get(id))) {
			if (!live.has(edge.target)) queue.push(edge.target);
		}
	}
	return live;
}

/**
 * AND-join with XOR orphan awareness: wait for all live predecessors.
 * Exclusive-branch arms that were not selected are treated as orphaned.
 */
export function isNodeReady(
	flow: FlowV1,
	nodeId: string,
	executed: ReadonlySet<string>,
	branchTaken: ReadonlyMap<string, string | undefined>,
): boolean {
	const incoming = flow.edges.filter((e) => e.target === nodeId);
	if (incoming.length === 0) return true;
	const live = computeLiveNodes(flow, executed, branchTaken);
	let hasExecutedPred = false;
	for (const edge of incoming) {
		const pred = edge.source;
		if (executed.has(pred)) {
			hasExecutedPred = true;
			continue;
		}
		if (!live.has(pred)) continue;
		return false;
	}
	return hasExecutedPred;
}

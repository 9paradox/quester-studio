import type { FlowEdgeV1, FlowNodeV1, FlowV1 } from "./flow.js";

export type FlowValidationIssue = {
	path: string;
	message: string;
};

export type FlowGraphValidationResult = {
	valid: boolean;
	issues: FlowValidationIssue[];
};

function indexNodes(nodes: FlowNodeV1[]): Map<string, FlowNodeV1> {
	return new Map(nodes.map((n) => [n.id, n]));
}

export function validateFlowGraph(flow: FlowV1): FlowGraphValidationResult {
	const issues: FlowValidationIssue[] = [];
	const nodeById = indexNodes(flow.nodes);

	const ids = flow.nodes.map((n) => n.id);
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) {
			issues.push({ path: "nodes", message: `Duplicate node id: ${id}` });
		}
		seen.add(id);
	}

	for (const edge of flow.edges) {
		if (!nodeById.has(edge.source)) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Unknown source node: ${edge.source}`,
			});
		}
		if (!nodeById.has(edge.target)) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Unknown target node: ${edge.target}`,
			});
		}
	}

	const inputNodes = flow.nodes.filter((n) => n.type === "input");
	if (inputNodes.length === 0) {
		issues.push({
			path: "nodes",
			message: "Flow must contain at least one input node",
		});
	}

	const adj = new Map<string, string[]>();
	for (const node of flow.nodes) {
		adj.set(node.id, []);
	}
	for (const edge of flow.edges) {
		adj.get(edge.source)?.push(edge.target);
	}

	const visited = new Set<string>();
	const stack = new Set<string>();
	const cycleNodes = new Set<string>();

	function dfs(nodeId: string): boolean {
		visited.add(nodeId);
		stack.add(nodeId);
		for (const next of adj.get(nodeId) ?? []) {
			if (!visited.has(next)) {
				if (dfs(next)) return true;
			} else if (stack.has(next)) {
				cycleNodes.add(next);
				return true;
			}
		}
		stack.delete(nodeId);
		return false;
	}

	for (const node of flow.nodes) {
		if (!visited.has(node.id)) {
			dfs(node.id);
		}
	}
	if (cycleNodes.size > 0) {
		issues.push({ path: "edges", message: "Flow graph contains a cycle" });
	}

	const reachable = new Set<string>();
	const queue = inputNodes.map((n) => n.id);
	for (const id of queue) reachable.add(id);
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		for (const next of adj.get(current) ?? []) {
			if (!reachable.has(next)) {
				reachable.add(next);
				queue.push(next);
			}
		}
	}

	for (const node of flow.nodes) {
		if (!reachable.has(node.id)) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `Node is not reachable from any input node: ${node.id}`,
			});
		}
	}

	return { valid: issues.length === 0, issues };
}

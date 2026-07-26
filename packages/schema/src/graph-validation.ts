import type { FlowV1 } from "./flow.js";

export type FlowValidationIssue = {
	path: string;
	message: string;
	/** Short, actionable hint for fixing this issue in the editor. */
	suggestion?: string;
};

export type FlowGraphValidationResult = {
	valid: boolean;
	issues: FlowValidationIssue[];
};

function indexNodes(flow: FlowV1) {
	return new Map(flow.nodes.map((n) => [n.id, n]));
}

export function validateFlowGraph(flow: FlowV1): FlowGraphValidationResult {
	const issues: FlowValidationIssue[] = [];
	const nodeById = indexNodes(flow);

	const ids = flow.nodes.map((n) => n.id);
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) {
			issues.push({
				path: "nodes",
				message: `Duplicate node id: ${id}`,
				suggestion: "Rename or delete the extra node so each id is unique",
			});
		}
		seen.add(id);
	}

	for (const edge of flow.edges) {
		if (!nodeById.has(edge.source)) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Unknown source node: ${edge.source}`,
				suggestion: `Delete edge ${edge.id}, or reconnect it from an existing node`,
			});
		}
		if (!nodeById.has(edge.target)) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Unknown target node: ${edge.target}`,
				suggestion: `Delete edge ${edge.id}, or reconnect it to an existing node`,
			});
		}
	}

	const startNodes = flow.nodes.filter((n) => n.type === "start");
	if (startNodes.length === 0) {
		issues.push({
			path: "nodes",
			message: "Flow must contain exactly one start node",
			suggestion:
				"Add a Start node from the palette and connect it to the first step",
		});
	} else if (startNodes.length > 1) {
		issues.push({
			path: "nodes",
			message: `Flow must contain exactly one start node (found ${startNodes.length})`,
			suggestion: `Keep one Start node and delete the extras (${startNodes
				.map((n) => n.id)
				.join(", ")})`,
		});
	}

	const start = startNodes[0];
	if (start) {
		const incoming = flow.edges.filter((e) => e.target === start.id);
		if (incoming.length > 0) {
			issues.push({
				path: `nodes/${start.id}`,
				message: "start node cannot have incoming edges",
				suggestion: `Remove edges into Start (${incoming
					.map((e) => e.id)
					.join(", ")}) — Start must be the root`,
			});
		}
		const outgoing = flow.edges.filter((e) => e.source === start.id);
		if (outgoing.length > 1) {
			issues.push({
				path: `nodes/${start.id}`,
				message: "start node can have at most one outgoing edge",
				suggestion: `Keep one edge from Start and delete the extras (${outgoing
					.map((e) => e.id)
					.join(", ")})`,
			});
		}
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
		const nodes = [...cycleNodes].join(", ");
		issues.push({
			path: "edges",
			message: "Flow graph contains a cycle",
			suggestion: `Remove an edge that loops back (near ${nodes}) so the graph is a DAG`,
		});
	}

	const reachable = new Set<string>();
	if (start) {
		const queue = [start.id];
		reachable.add(start.id);
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
	}

	for (const node of flow.nodes) {
		if (start && !reachable.has(node.id)) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `Node is not reachable from start: ${node.id}`,
				suggestion: `Connect ${node.id} from a reachable node (or from Start), or delete it`,
			});
		}
	}

	return { valid: issues.length === 0, issues };
}

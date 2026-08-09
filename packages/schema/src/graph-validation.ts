import {
	type FlowEdgeV1,
	type FlowNodeV1,
	type FlowV1,
	isFrameContainerType,
} from "./flow.js";

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

const OUTER_EXIT_HANDLES: Record<string, readonly string[]> = {
	try: ["success", "failed"],
	foreach: ["complete"],
};

function indexNodes(flow: FlowV1) {
	return new Map(flow.nodes.map((n) => [n.id, n]));
}

function isEntryEdge(
	edge: FlowEdgeV1,
	source: FlowNodeV1,
	target: FlowNodeV1,
): boolean {
	if (!isFrameContainerType(source.type)) return false;
	if (target.parentId !== source.id) return false;
	const h = edge.sourceHandle ?? "entry";
	return h === "entry" || h === null;
}

function isExitEdge(
	edge: FlowEdgeV1,
	source: FlowNodeV1,
	target: FlowNodeV1,
): boolean {
	if (!isFrameContainerType(target.type)) return false;
	if (source.parentId !== target.id) return false;
	const h = edge.targetHandle ?? "exit";
	return h === "exit" || h === null;
}

function isFrameBodyLoopEdge(
	edge: FlowEdgeV1,
	nodeById: Map<string, FlowNodeV1>,
): boolean {
	const source = nodeById.get(edge.source);
	const target = nodeById.get(edge.target);
	if (!source || !target) return false;
	return isEntryEdge(edge, source, target) || isExitEdge(edge, source, target);
}

function validateFrames(
	flow: FlowV1,
	nodeById: Map<string, FlowNodeV1>,
	issues: FlowValidationIssue[],
): void {
	const childrenByParent = new Map<string, FlowNodeV1[]>();
	for (const node of flow.nodes) {
		if (!node.parentId) continue;
		const parent = nodeById.get(node.parentId);
		if (!parent) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `Unknown parentId: ${node.parentId}`,
				suggestion: "Set parentId to an existing try/foreach, or clear it",
			});
			continue;
		}
		if (!isFrameContainerType(parent.type)) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `parentId must reference a try or foreach (got ${parent.type})`,
				suggestion: "Only try/foreach frames can own body children",
			});
			continue;
		}
		if (node.type === "start") {
			issues.push({
				path: `nodes/${node.id}`,
				message: "start node cannot be a frame child",
				suggestion: "Keep Start at the root of the flow",
			});
		}
		if (node.id === node.parentId) {
			issues.push({
				path: `nodes/${node.id}`,
				message: "Node cannot be its own parent",
			});
		}
		const list = childrenByParent.get(node.parentId) ?? [];
		list.push(node);
		childrenByParent.set(node.parentId, list);
	}

	// Detect parent cycles (nested frames)
	for (const node of flow.nodes) {
		const seen = new Set<string>();
		let cur: string | undefined = node.parentId;
		while (cur) {
			if (seen.has(cur) || cur === node.id) {
				issues.push({
					path: `nodes/${node.id}`,
					message: "parentId chain contains a cycle",
					suggestion: "Fix nested frame parenting so it is a tree",
				});
				break;
			}
			seen.add(cur);
			cur = nodeById.get(cur)?.parentId;
		}
	}

	for (const node of flow.nodes) {
		if (!isFrameContainerType(node.type)) continue;
		const children = childrenByParent.get(node.id) ?? [];
		if (children.length === 0) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `${node.type} frame "${node.id}" requires at least one body child`,
				suggestion: "Drag nodes into the frame and wire entry/exit edges",
			});
			continue;
		}

		const childIds = new Set(children.map((c) => c.id));
		const entryTargets = new Set<string>();
		const exitSources = new Set<string>();

		for (const edge of flow.edges) {
			const source = nodeById.get(edge.source);
			const target = nodeById.get(edge.target);
			if (!source || !target) continue;

			if (edge.source === node.id && childIds.has(edge.target)) {
				const h = edge.sourceHandle ?? "entry";
				if (OUTER_EXIT_HANDLES[node.type]?.includes(h)) {
					issues.push({
						path: `edges/${edge.id}`,
						message: `Frame entry edge cannot use outer handle "${h}"`,
						suggestion: 'Use sourceHandle "entry" for body entry edges',
					});
					continue;
				}
				if (h !== "entry" && h !== null) {
					issues.push({
						path: `edges/${edge.id}`,
						message: `Invalid entry sourceHandle "${h}" (expected "entry")`,
						suggestion: 'Set sourceHandle to "entry"',
					});
					continue;
				}
				entryTargets.add(edge.target);
			}

			if (edge.target === node.id && childIds.has(edge.source)) {
				const h = edge.targetHandle ?? "exit";
				if (OUTER_EXIT_HANDLES[node.type]?.includes(h)) {
					issues.push({
						path: `edges/${edge.id}`,
						message: `Body exit edge cannot use outer handle "${h}" as targetHandle`,
						suggestion: 'Use targetHandle "exit" for body exit edges',
					});
					continue;
				}
				if (h !== "exit" && h !== null) {
					issues.push({
						path: `edges/${edge.id}`,
						message: `Invalid exit targetHandle "${h}" (expected "exit")`,
						suggestion: 'Set targetHandle to "exit"',
					});
					continue;
				}
				exitSources.add(edge.source);
			}
		}

		if (entryTargets.size === 0) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `${node.type} frame "${node.id}" requires an entry edge to a body child`,
				suggestion: `Connect ${node.id} → child with sourceHandle "entry"`,
			});
		}
		if (exitSources.size === 0) {
			issues.push({
				path: `nodes/${node.id}`,
				message: `${node.type} frame "${node.id}" requires an exit edge from a body child`,
				suggestion: `Connect child → ${node.id} with targetHandle "exit"`,
			});
		}

		// Body adjacency: child→child only
		const bodyAdj = new Map<string, string[]>();
		for (const c of children) bodyAdj.set(c.id, []);
		for (const edge of flow.edges) {
			if (childIds.has(edge.source) && childIds.has(edge.target)) {
				bodyAdj.get(edge.source)?.push(edge.target);
			}
		}

		const reachableFromEntry = new Set<string>();
		const queue = [...entryTargets];
		for (const id of entryTargets) reachableFromEntry.add(id);
		while (queue.length > 0) {
			const cur = queue.shift();
			if (!cur) break;
			for (const next of bodyAdj.get(cur) ?? []) {
				if (!reachableFromEntry.has(next)) {
					reachableFromEntry.add(next);
					queue.push(next);
				}
			}
		}

		for (const c of children) {
			if (!reachableFromEntry.has(c.id)) {
				issues.push({
					path: `nodes/${c.id}`,
					message: `Body node "${c.id}" is not reachable from a frame entry`,
					suggestion: `Wire ${c.id} from an entry path inside ${node.id}`,
				});
			}
		}

		// From each entry, can we reach at least one exit?
		for (const entry of entryTargets) {
			const seen = new Set<string>();
			const q = [entry];
			seen.add(entry);
			let reachesExit = exitSources.has(entry);
			while (q.length > 0 && !reachesExit) {
				const cur = q.shift();
				if (!cur) break;
				for (const next of bodyAdj.get(cur) ?? []) {
					if (seen.has(next)) continue;
					seen.add(next);
					if (exitSources.has(next)) {
						reachesExit = true;
						break;
					}
					q.push(next);
				}
			}
			if (!reachesExit) {
				issues.push({
					path: `nodes/${node.id}`,
					message: `Entry target "${entry}" cannot reach a body exit`,
					suggestion: `Connect a path from ${entry} to a child that exits to ${node.id}`,
				});
			}
		}
	}

	// Pierce / invalid cross-frame edges (entry/exit already validated)
	for (const edge of flow.edges) {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);
		if (!source || !target) continue;
		if (isEntryEdge(edge, source, target) || isExitEdge(edge, source, target)) {
			continue;
		}
		const sp = source.parentId;
		const tp = target.parentId;
		if (sp === tp) continue;
		// Entry shape without matching handles is still "into frame"
		if (source.id === tp) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Invalid frame entry edge (use sourceHandle "entry")`,
				suggestion: 'Set sourceHandle to "entry" on the container→child edge',
			});
			continue;
		}
		if (target.id === sp) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Invalid frame exit edge (use targetHandle "exit")`,
				suggestion: 'Set targetHandle to "exit" on the child→container edge',
			});
			continue;
		}
		if (sp && sp !== tp) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Edge leaves frame "${sp}" illegally`,
				suggestion:
					"Wire body nodes to the frame exit port, then continue from the container's success/failed/complete handles",
			});
			continue;
		}
		if (tp && sp !== tp) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `Edge enters frame "${tp}" illegally`,
				suggestion:
					"Connect to the frame container, then use an entry edge from the frame to the body child",
			});
		}
	}

	// Outer exit handle validation when source is container (not entry)
	for (const edge of flow.edges) {
		const source = nodeById.get(edge.source);
		const target = nodeById.get(edge.target);
		if (!source || !target) continue;
		if (!isFrameContainerType(source.type)) continue;
		if (target.parentId === source.id) continue;
		const allowed = OUTER_EXIT_HANDLES[source.type];
		if (!allowed) continue;
		const h = edge.sourceHandle;
		if (h == null || !allowed.includes(h)) {
			issues.push({
				path: `edges/${edge.id}`,
				message: `${source.type} outer edge requires sourceHandle ${allowed.map((x) => `"${x}"`).join(" or ")}`,
				suggestion: `Set sourceHandle on edge ${edge.id}`,
			});
		}
	}
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
		const sourceNode = nodeById.get(edge.source);
		const targetNode = nodeById.get(edge.target);
		if (sourceNode?.type === "note" || targetNode?.type === "note") {
			issues.push({
				path: `edges/${edge.id}`,
				message: "note nodes cannot be connected",
				suggestion:
					"Delete the edge — notes are canvas stickies and stay off the execution graph",
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
		if (start.parentId) {
			issues.push({
				path: `nodes/${start.id}`,
				message: "start node cannot be a frame child",
				suggestion: "Keep Start at the root of the flow",
			});
		}
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

	validateFrames(flow, nodeById, issues);

	// Cycle detection — ignore frame entry/exit edges (they intentionally loop)
	const adj = new Map<string, string[]>();
	for (const node of flow.nodes) {
		adj.set(node.id, []);
	}
	for (const edge of flow.edges) {
		if (isFrameBodyLoopEdge(edge, nodeById)) continue;
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
			// Also walk entry edges into frame bodies for reachability
			const currentNode = nodeById.get(current);
			if (currentNode && isFrameContainerType(currentNode.type)) {
				for (const edge of flow.edges) {
					const target = nodeById.get(edge.target);
					if (
						edge.source === current &&
						target &&
						isEntryEdge(edge, currentNode, target) &&
						!reachable.has(edge.target)
					) {
						reachable.add(edge.target);
						queue.push(edge.target);
					}
				}
			}
		}
	}

	for (const node of flow.nodes) {
		if (node.type === "note") continue;
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

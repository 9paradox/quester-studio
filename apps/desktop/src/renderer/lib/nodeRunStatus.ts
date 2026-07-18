import type { NodeRunStatus, NodeRunStatusEvent } from "../../shared/rpc.js";

export type { NodeRunStatus };

export function initNodeStatuses(
	nodeIds: Iterable<string>,
): Record<string, NodeRunStatus> {
	const next: Record<string, NodeRunStatus> = {};
	for (const id of nodeIds) {
		next[id] = "idle";
	}
	return next;
}

export function applyNodeStatusEvent(
	statuses: Record<string, NodeRunStatus>,
	event: Pick<NodeRunStatusEvent, "nodeId" | "status">,
): Record<string, NodeRunStatus> {
	if (statuses[event.nodeId] === event.status) return statuses;
	return { ...statuses, [event.nodeId]: event.status };
}

export function reconcileNodeStatuses(
	nodeIds: Iterable<string>,
	steps: ReadonlyArray<{ nodeId: string; error?: string }>,
	current?: Record<string, NodeRunStatus>,
): Record<string, NodeRunStatus> {
	const next = { ...(current ?? initNodeStatuses(nodeIds)) };
	for (const id of nodeIds) {
		if (!(id in next)) next[id] = "idle";
	}

	const touched = new Set<string>();
	for (const step of steps) {
		touched.add(step.nodeId);
		next[step.nodeId] = step.error ? "error" : "success";
	}

	for (const id of nodeIds) {
		if (!touched.has(id)) {
			const status = next[id];
			if (status === "idle" || status === "running" || status === undefined) {
				next[id] = "skipped";
			}
		}
	}

	return next;
}

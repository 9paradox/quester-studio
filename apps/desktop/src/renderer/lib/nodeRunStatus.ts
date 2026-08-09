import type { NodeRunStatus, NodeRunStatusEvent } from "../../shared/rpc.js";

export type { NodeRunStatus };

export type NodeTiming = {
	startedAt: number;
	endedAt?: number;
};

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

export function applyNodeTimingEvent(
	timings: Record<string, NodeTiming>,
	event: Pick<NodeRunStatusEvent, "nodeId" | "status" | "ts">,
): Record<string, NodeTiming> {
	const prev = timings[event.nodeId];
	if (event.status === "running") {
		if (prev?.startedAt === event.ts && prev.endedAt === undefined) {
			return timings;
		}
		return {
			...timings,
			[event.nodeId]: { startedAt: event.ts },
		};
	}
	const startedAt = prev?.startedAt ?? event.ts;
	if (prev?.endedAt === event.ts && prev.startedAt === startedAt) {
		return timings;
	}
	return {
		...timings,
		[event.nodeId]: { startedAt, endedAt: event.ts },
	};
}

export function nodeTimingDurationMs(
	timing: NodeTiming | undefined,
): number | null {
	if (!timing?.endedAt) return null;
	return Math.max(0, timing.endedAt - timing.startedAt);
}

export function totalRunDurationMs(
	timings: Record<string, NodeTiming>,
): number | null {
	let minStart: number | undefined;
	let maxEnd: number | undefined;
	for (const t of Object.values(timings)) {
		if (minStart === undefined || t.startedAt < minStart)
			minStart = t.startedAt;
		const end = t.endedAt ?? t.startedAt;
		if (maxEnd === undefined || end > maxEnd) maxEnd = end;
	}
	if (minStart === undefined || maxEnd === undefined) return null;
	return Math.max(0, maxEnd - minStart);
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

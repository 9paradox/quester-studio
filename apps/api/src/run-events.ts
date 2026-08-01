import type { NodeRunStatusEvent } from "@quester-studio/api-contract";

type Listener = (event: NodeRunStatusEvent) => void;

const runListeners = new Map<string, Set<Listener>>();

export function subscribeRun(runId: string, listener: Listener): () => void {
	let set = runListeners.get(runId);
	if (!set) {
		set = new Set();
		runListeners.set(runId, set);
	}
	set.add(listener);
	return () => {
		set?.delete(listener);
		if (set && set.size === 0) {
			runListeners.delete(runId);
		}
	};
}

export function publishRunEvent(event: NodeRunStatusEvent): void {
	const set = runListeners.get(event.runId);
	if (!set) return;
	for (const listener of set) {
		listener(event);
	}
}

import { rejectFormAwaitsForRun } from "./form-await.js";

const runAbortControllers = new Map<string, AbortController>();

/** Register an AbortController for a run; returns its signal. */
export function registerRunAbortController(runId: string): AbortSignal {
	const controller = new AbortController();
	runAbortControllers.set(runId, controller);
	return controller.signal;
}

/** Abort an in-flight flow run by runId. Returns true when a run was found. */
export function cancelFlowRun(runId: string): boolean {
	const controller = runAbortControllers.get(runId);
	if (!controller) {
		rejectFormAwaitsForRun(runId);
		return false;
	}
	controller.abort();
	rejectFormAwaitsForRun(runId);
	return true;
}

export function unregisterRunAbortController(runId: string): void {
	runAbortControllers.delete(runId);
}

/** Test helper — clear all registered run controllers. */
export function resetRunAbortControllersForTests(): void {
	runAbortControllers.clear();
}

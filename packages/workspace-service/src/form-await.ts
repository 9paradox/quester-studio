import type { FormV1 } from "@quester-studio/schema";

export type FormAwaitRequest = {
	nodeId: string;
	formId: string;
	form: FormV1;
	resolved: {
		fields: Array<{
			id: string;
			type: string;
			label?: string;
			description?: string;
			placeholder?: string;
			required: boolean;
			readonly: boolean;
			value: unknown;
			options?: Array<{ value: string | number | boolean; label: string }>;
		}>;
	};
};

type Pending = {
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
};

/** Pending form awaits keyed by `${runId}\0${nodeId}`. */
const pendingByKey = new Map<string, Pending>();

function key(runId: string, nodeId: string): string {
	return `${runId}\0${nodeId}`;
}

export function createRunAwaitForm(
	runId: string,
	signal: AbortSignal | undefined,
	onAwait: (req: FormAwaitRequest) => void,
): (req: FormAwaitRequest) => Promise<unknown> {
	return (req) =>
		new Promise((resolve, reject) => {
			if (signal?.aborted) {
				reject(new DOMException("Flow run cancelled", "AbortError"));
				return;
			}
			const k = key(runId, req.nodeId);
			const prev = pendingByKey.get(k);
			if (prev) {
				prev.reject(new Error(`Superseded form await for ${req.nodeId}`));
			}
			const entry: Pending = { resolve, reject };
			pendingByKey.set(k, entry);

			const onAbort = () => {
				if (pendingByKey.get(k) === entry) {
					pendingByKey.delete(k);
					reject(new DOMException("Flow run cancelled", "AbortError"));
				}
			};
			signal?.addEventListener("abort", onAbort, { once: true });

			onAwait(req);
		});
}

export function submitFormRun(
	runId: string,
	nodeId: string,
	values: unknown,
): { ok: boolean; error?: string } {
	const k = key(runId, nodeId);
	const pending = pendingByKey.get(k);
	if (!pending) {
		return { ok: false, error: `No pending form await for ${nodeId}` };
	}
	pendingByKey.delete(k);
	pending.resolve(values);
	return { ok: true };
}

export function rejectFormAwaitsForRun(runId: string): void {
	const prefix = `${runId}\0`;
	for (const [k, pending] of [...pendingByKey.entries()]) {
		if (!k.startsWith(prefix)) continue;
		pendingByKey.delete(k);
		pending.reject(new DOMException("Flow run cancelled", "AbortError"));
	}
}

export function resetFormAwaitsForTests(): void {
	pendingByKey.clear();
}

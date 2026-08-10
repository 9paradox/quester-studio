import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

export const RUN_HISTORY_STORAGE_KEY = "quester.runHistory";
export const MAX_RUN_HISTORY_PER_FLOW = 10;
/** Soft ceiling so we leave headroom for other localStorage keys. */
export const MAX_RUN_HISTORY_BYTES = 1_500_000;

const MAX_STRING_LEN = 200;
const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_KEYS = 12;

export type RunHistoryEntry = {
	flowId: string;
	runId: string;
	ts: number;
	ok: boolean;
	error?: string;
	result: ExecuteFlowRpcResult;
};

function truncateUnknown(value: unknown, depth = 0): unknown {
	if (depth > MAX_DEPTH) return "[truncated]";
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return value.length > MAX_STRING_LEN
			? `${value.slice(0, MAX_STRING_LEN)}…`
			: value;
	}
	if (typeof value !== "object") return value;
	if (Array.isArray(value)) {
		const items = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => truncateUnknown(item, depth + 1));
		if (value.length > MAX_ARRAY_ITEMS) {
			items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
		}
		return items;
	}
	const out: Record<string, unknown> = {};
	let count = 0;
	for (const [key, child] of Object.entries(value)) {
		if (count >= MAX_OBJECT_KEYS) {
			out["…"] = "truncated";
			break;
		}
		out[key] = truncateUnknown(child, depth + 1);
		count += 1;
	}
	return out;
}

/** Trim large payloads before persisting to localStorage. */
export function truncateResultForHistory(
	result: ExecuteFlowRpcResult,
): ExecuteFlowRpcResult {
	return {
		...result,
		output: truncateUnknown(result.output),
		nodeOutputs: Object.fromEntries(
			Object.entries(result.nodeOutputs ?? {}).map(([id, output]) => [
				id,
				truncateUnknown(output),
			]),
		),
		// Wire dumps duplicate outputs and blow quota; replay does not need them.
		nodeInputs: {},
		steps: (result.steps ?? []).map((step) => ({
			nodeId: step.nodeId,
			type: step.type,
			input: undefined,
			error: step.error,
			output: truncateUnknown(step.output),
		})),
		logs: (result.logs ?? []).map((log) => ({
			...log,
			data: log.data === undefined ? undefined : truncateUnknown(log.data),
		})),
	};
}

function isQuotaExceeded(error: unknown): boolean {
	if (!(error instanceof DOMException)) return false;
	return (
		error.name === "QuotaExceededError" ||
		error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
		error.code === 22
	);
}

function readAllEntries(): RunHistoryEntry[] {
	try {
		const raw = localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(entry): entry is RunHistoryEntry =>
				entry !== null &&
				typeof entry === "object" &&
				typeof (entry as RunHistoryEntry).flowId === "string" &&
				typeof (entry as RunHistoryEntry).runId === "string" &&
				typeof (entry as RunHistoryEntry).ts === "number" &&
				typeof (entry as RunHistoryEntry).ok === "boolean" &&
				(entry as RunHistoryEntry).result !== undefined,
		);
	} catch {
		return [];
	}
}

function dropOldest(entries: RunHistoryEntry[]): RunHistoryEntry[] {
	if (entries.length === 0) return entries;
	const sorted = [...entries].sort((a, b) => a.ts - b.ts);
	return sorted.slice(1);
}

function slimEntry(entry: RunHistoryEntry): RunHistoryEntry {
	return {
		...entry,
		result: {
			output: truncateUnknown(entry.result.output),
			nodeOutputs: {},
			nodeInputs: {},
			steps: (entry.result.steps ?? []).map((step) => ({
				nodeId: step.nodeId,
				type: step.type,
				input: undefined,
				error: step.error,
				output: undefined,
			})),
			vars: {},
			logs: (entry.result.logs ?? []).slice(-20).map((log) => ({
				ts: log.ts,
				level: log.level,
				message:
					typeof log.message === "string" && log.message.length > MAX_STRING_LEN
						? `${log.message.slice(0, MAX_STRING_LEN)}…`
						: log.message,
			})),
			error: entry.result.error,
			cancelled: entry.result.cancelled,
			runDir: entry.result.runDir,
		},
	};
}

/**
 * Persist entries, pruning oldest (and eventually slimming) when quota is hit.
 * Never throws QuotaExceededError to callers.
 */
export function writeAllEntries(entries: RunHistoryEntry[]): void {
	let next = entries;
	let slimmed = false;
	for (let attempt = 0; attempt < 200; attempt += 1) {
		const payload = JSON.stringify(next);
		const overBudget = payload.length > MAX_RUN_HISTORY_BYTES;
		if (!overBudget) {
			try {
				localStorage.setItem(RUN_HISTORY_STORAGE_KEY, payload);
				return;
			} catch (error) {
				if (!isQuotaExceeded(error)) {
					console.warn("Failed to persist run history:", error);
					return;
				}
			}
		}
		if (next.length === 0) {
			try {
				localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
			} catch {
				// ignore
			}
			return;
		}
		if (!slimmed && next.length <= 3) {
			next = next.map(slimEntry);
			slimmed = true;
			continue;
		}
		next = dropOldest(next);
	}
	try {
		localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
	} catch {
		// ignore
	}
}

export function listRunHistory(flowId: string): RunHistoryEntry[] {
	return readAllEntries()
		.filter((entry) => entry.flowId === flowId)
		.sort((a, b) => b.ts - a.ts);
}

export function findRunHistoryEntry(
	flowId: string,
	runId: string,
): RunHistoryEntry | undefined {
	return readAllEntries().find(
		(entry) => entry.flowId === flowId && entry.runId === runId,
	);
}

export function appendRunHistory(entry: RunHistoryEntry): void {
	const all = readAllEntries();
	const others = all.filter((existing) => existing.flowId !== entry.flowId);
	const forFlow = all
		.filter((existing) => existing.flowId === entry.flowId)
		.concat(entry)
		.slice(-MAX_RUN_HISTORY_PER_FLOW);
	writeAllEntries([...others, ...forFlow]);
}

export function clearRunHistory(flowId?: string): void {
	if (!flowId) {
		try {
			localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
		} catch {
			// ignore
		}
		return;
	}
	writeAllEntries(readAllEntries().filter((entry) => entry.flowId !== flowId));
}

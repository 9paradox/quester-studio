import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

export const RUN_HISTORY_STORAGE_KEY = "quester.runHistory";
export const MAX_RUN_HISTORY_PER_FLOW = 10;

const MAX_STRING_LEN = 500;
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 12;
const MAX_OBJECT_KEYS = 24;
const MAX_LOGS = 40;
const MAX_STEPS = 80;

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
	const steps = (result.steps ?? []).slice(0, MAX_STEPS);
	const logs = (result.logs ?? []).slice(0, MAX_LOGS);
	return {
		...result,
		output: truncateUnknown(result.output),
		nodeOutputs: Object.fromEntries(
			Object.entries(result.nodeOutputs ?? {}).map(([id, output]) => [
				id,
				truncateUnknown(output),
			]),
		),
		nodeInputs: Object.fromEntries(
			Object.entries(result.nodeInputs ?? {}).map(([id, input]) => [
				id,
				truncateUnknown(input),
			]),
		),
		steps: steps.map((step) => ({
			...step,
			input: truncateUnknown(step.input),
			output: truncateUnknown(step.output),
		})),
		logs: logs.map((log) => ({
			...log,
			data: log.data === undefined ? undefined : truncateUnknown(log.data),
		})),
		vars: truncateUnknown(result.vars ?? {}) as ExecuteFlowRpcResult["vars"],
	};
}

/** Last-resort shrink when even truncated payloads exceed quota. */
export function minifyResultForHistory(
	result: ExecuteFlowRpcResult,
): ExecuteFlowRpcResult {
	return {
		...result,
		output: null,
		nodeOutputs: {},
		nodeInputs: {},
		vars: {},
		logs: [],
		steps: (result.steps ?? []).slice(0, MAX_STEPS).map((step) => ({
			nodeId: step.nodeId,
			type: step.type,
			input: {},
			output: {},
			error: step.error,
		})),
	};
}

export function isQuotaExceededError(error: unknown): boolean {
	if (typeof DOMException !== "undefined" && error instanceof DOMException) {
		return (
			error.name === "QuotaExceededError" ||
			error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
			error.code === 22 ||
			error.code === 1014
		);
	}
	if (error instanceof Error) {
		return /quota/i.test(error.message);
	}
	return false;
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

function dropOldestEntries(
	entries: RunHistoryEntry[],
	dropCount: number,
): RunHistoryEntry[] {
	if (dropCount <= 0 || entries.length === 0) return entries;
	const sorted = [...entries].sort((a, b) => a.ts - b.ts);
	const dropping = new Set(
		sorted
			.slice(0, Math.min(dropCount, sorted.length))
			.map((entry) => `${entry.flowId}\0${entry.runId}`),
	);
	return entries.filter(
		(entry) => !dropping.has(`${entry.flowId}\0${entry.runId}`),
	);
}

function writeAllEntries(entries: RunHistoryEntry[]): void {
	let next = entries;
	for (let attempt = 0; attempt < 12; attempt += 1) {
		try {
			localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(next));
			return;
		} catch (error) {
			if (!isQuotaExceededError(error)) {
				console.warn("Failed to persist run history", error);
				return;
			}
			if (next.length === 0) {
				try {
					localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
				} catch {
					/* ignore */
				}
				return;
			}
			if (attempt < 5) {
				next = dropOldestEntries(next, Math.max(1, Math.ceil(next.length / 2)));
				continue;
			}
			if (attempt === 5) {
				next = next.map((entry) => ({
					...entry,
					result: minifyResultForHistory(entry.result),
				}));
				continue;
			}
			if (next.length > 1) {
				next = dropOldestEntries(next, 1);
				continue;
			}
			try {
				localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
			} catch {
				/* ignore */
			}
			return;
		}
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
	try {
		const all = readAllEntries();
		const others = all.filter((existing) => existing.flowId !== entry.flowId);
		const forFlow = all
			.filter((existing) => existing.flowId === entry.flowId)
			.concat(entry)
			.slice(-MAX_RUN_HISTORY_PER_FLOW);
		writeAllEntries([...others, ...forFlow]);
	} catch (error) {
		console.warn("Failed to append run history", error);
	}
}

export function clearRunHistory(flowId?: string): void {
	if (!flowId) {
		try {
			localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
		} catch (error) {
			console.warn("Failed to clear run history", error);
		}
		return;
	}
	writeAllEntries(readAllEntries().filter((entry) => entry.flowId !== flowId));
}

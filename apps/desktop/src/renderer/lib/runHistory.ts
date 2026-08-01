import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

export const RUN_HISTORY_STORAGE_KEY = "quester.runHistory";
export const MAX_RUN_HISTORY_PER_FLOW = 20;

const MAX_STRING_LEN = 500;
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 30;

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
		nodeInputs: Object.fromEntries(
			Object.entries(result.nodeInputs ?? {}).map(([id, input]) => [
				id,
				truncateUnknown(input),
			]),
		),
		steps: (result.steps ?? []).map((step) => ({
			...step,
			input: truncateUnknown(step.input),
			output: truncateUnknown(step.output),
		})),
		logs: (result.logs ?? []).map((log) => ({
			...log,
			data: log.data === undefined ? undefined : truncateUnknown(log.data),
		})),
	};
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

function writeAllEntries(entries: RunHistoryEntry[]): void {
	localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(entries));
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
	const others = readAllEntries().filter(
		(existing) => existing.flowId !== entry.flowId,
	);
	const forFlow = readAllEntries()
		.filter((existing) => existing.flowId === entry.flowId)
		.concat(entry)
		.slice(-MAX_RUN_HISTORY_PER_FLOW);
	writeAllEntries([...others, ...forFlow]);
}

export function clearRunHistory(flowId?: string): void {
	if (!flowId) {
		localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
		return;
	}
	writeAllEntries(readAllEntries().filter((entry) => entry.flowId !== flowId));
}

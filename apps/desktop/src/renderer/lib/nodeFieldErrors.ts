import { validateNodeData } from "@quester-studio/schema";
import type { ZodIssue } from "zod";

/** Map top-level node data field → short message for inspector inline errors. */
export function getNodeFieldErrors(
	type: string,
	data: unknown,
): Record<string, string> {
	const result = validateNodeData(type, data);
	if (result.success) return {};
	const out: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = fieldKeyFromIssue(issue);
		if (!out[key]) out[key] = humanizeZodIssue(issue);
	}
	return out;
}

export function hasNodeFieldErrors(type: string, data: unknown): boolean {
	return Object.keys(getNodeFieldErrors(type, data)).length > 0;
}

/** True when any builtin node in the flow has invalid data. */
export function flowHasInvalidNodeData(flow: {
	nodes: ReadonlyArray<{ id: string; type: string; data: unknown }>;
}): { invalid: true; nodeId: string } | { invalid: false } {
	for (const node of flow.nodes) {
		if (hasNodeFieldErrors(node.type, node.data)) {
			return { invalid: true, nodeId: node.id };
		}
	}
	return { invalid: false };
}

function fieldKeyFromIssue(issue: ZodIssue): string {
	const head = issue.path[0];
	return typeof head === "string" || typeof head === "number"
		? String(head)
		: "_";
}

function humanizeZodIssue(issue: ZodIssue): string {
	if (
		issue.code === "too_small" &&
		"type" in issue &&
		issue.type === "string"
	) {
		return "Required";
	}
	if (issue.code === "invalid_type" && issue.received === "undefined") {
		return "Required";
	}
	return issue.message;
}

import type { FlowV1 } from "@quester/schema";

export const DEFAULT_INPUT = "{}\n";

/** Pretty-print run input JSON for the editor (trailing newline). */
export function formatRunInputJson(value: unknown): string {
	return `${JSON.stringify(value ?? {}, null, 2)}\n`;
}

/** Read persisted default run input from the first `input` node in a flow. */
export function runInputJsonFromFlow(flow: FlowV1): string {
	const inputNode = flow.nodes.find((n) => n.type === "input");
	if (!inputNode) return DEFAULT_INPUT;
	const data = inputNode.data as Record<string, unknown>;
	if (!("value" in data) || data.value === undefined) return DEFAULT_INPUT;
	return formatRunInputJson(data.value);
}

/** Write `value` onto the first `input` node (no-op if none). */
export function withInputNodeValue(flow: FlowV1, value: unknown): FlowV1 {
	let updated = false;
	const nodes = flow.nodes.map((n) => {
		if (n.type !== "input" || updated) return n;
		updated = true;
		return { ...n, data: { ...n.data, value } };
	});
	return updated ? { ...flow, nodes } : flow;
}

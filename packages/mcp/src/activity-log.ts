import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** One line in `.quester/mcp-activity.jsonl` (no secrets / raw bodies). */
export type McpActivityEvent = {
	ts: string;
	tool: string;
	ok: boolean;
	summary: string;
	flowId?: string;
	nodeId?: string;
	durationMs?: number;
	error?: string;
};

export function mcpActivityLogPath(workspaceRoot: string): string {
	return join(resolve(workspaceRoot), ".quester", "mcp-activity.jsonl");
}

/** Append a single JSONL event for desktop / tools to tail. Best-effort. */
export async function appendMcpActivity(
	workspaceRoot: string,
	event: Omit<McpActivityEvent, "ts"> & { ts?: string },
): Promise<void> {
	const path = mcpActivityLogPath(workspaceRoot);
	const line = `${JSON.stringify({
		ts: event.ts ?? new Date().toISOString(),
		tool: event.tool,
		ok: event.ok,
		summary: event.summary,
		...(event.flowId ? { flowId: event.flowId } : {}),
		...(event.nodeId ? { nodeId: event.nodeId } : {}),
		...(event.durationMs != null ? { durationMs: event.durationMs } : {}),
		...(event.error ? { error: event.error.slice(0, 400) } : {}),
	})}\n`;
	try {
		await mkdir(dirname(path), { recursive: true });
		await appendFile(path, line, "utf8");
	} catch {
		/* activity log must never break tool handlers */
	}
}

export function summarizeToolArgs(
	tool: string,
	args: Record<string, unknown>,
): { summary: string; flowId?: string; nodeId?: string } {
	const flowId =
		typeof args.flowId === "string"
			? args.flowId
			: args.flow &&
					typeof args.flow === "object" &&
					args.flow !== null &&
					"id" in args.flow &&
					typeof (args.flow as { id: unknown }).id === "string"
				? (args.flow as { id: string }).id
				: undefined;
	const nodeId = typeof args.nodeId === "string" ? args.nodeId : undefined;
	const type = typeof args.type === "string" ? args.type : undefined;

	switch (tool) {
		case "list_flows":
			return { summary: "Listed flows" };
		case "read_flow":
			return { summary: `Read flow ${flowId ?? "?"}`, flowId };
		case "validate_flow":
			return {
				summary: flowId ? `Validated ${flowId}` : "Validated flow JSON",
				flowId,
			};
		case "run_flow":
			return {
				summary: `Ran ${flowId ?? "?"}${args.env ? ` (env ${String(args.env)})` : ""}`,
				flowId,
			};
		case "inspect_last_run":
			return {
				summary: nodeId
					? `Inspected last run · ${flowId ?? "latest"} / ${nodeId}`
					: `Inspected last run · ${flowId ?? "latest"}`,
				flowId,
				nodeId,
			};
		case "save_flow":
			return { summary: `Saved flow ${flowId ?? "?"}`, flowId };
		case "patch_flow":
			return { summary: `Patched flow ${flowId ?? "?"}`, flowId };
		case "list_node_types":
			return { summary: "Listed node types" };
		case "describe_node_type":
			return { summary: `Described node type ${type ?? "?"}` };
		case "get_node":
			return {
				summary: `Got node ${nodeId ?? "?"} in ${flowId ?? "?"}`,
				flowId,
				nodeId,
			};
		case "patch_node":
			return {
				summary: `Patched node ${nodeId ?? "?"} in ${flowId ?? "?"}`,
				flowId,
				nodeId,
			};
		case "suggest_jmespath":
			return {
				summary: `Suggested JMESPath for ${nodeId ?? "?"} (${flowId ?? "?"})`,
				flowId,
				nodeId,
			};
		case "list_env_keys":
			return { summary: "Listed env keys" };
		default:
			return {
				summary: flowId ? `${tool} · ${flowId}` : tool,
				flowId,
				nodeId,
			};
	}
}

/** Tools that mutate workspace flow files — desktop should reload. */
export const MCP_MUTATING_TOOLS = new Set([
	"save_flow",
	"patch_flow",
	"patch_node",
]);

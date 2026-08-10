import {
	type McpServerConfig,
	callExternalMcpTool,
	resolveMcpServerConfig,
} from "./client-call.js";

export function createCallMcpTool(
	servers: Record<string, McpServerConfig> | undefined,
): (request: {
	serverId: string;
	tool: string;
	arguments?: Record<string, unknown>;
	timeoutMs?: number;
	signal?: AbortSignal;
}) => Promise<unknown> {
	return async (request) => {
		const server = resolveMcpServerConfig(servers, request.serverId);
		return callExternalMcpTool({
			server,
			tool: request.tool,
			arguments: request.arguments,
			timeoutMs: request.timeoutMs,
			signal: request.signal,
		});
	};
}

/** Normalize workspace settings.mcp.servers into client configs. */
export function mcpServersFromSettings(
	mcp: { servers?: Record<string, unknown> } | undefined,
): Record<string, McpServerConfig> | undefined {
	if (!mcp?.servers) return undefined;
	const out: Record<string, McpServerConfig> = {};
	for (const [id, raw] of Object.entries(mcp.servers)) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw as Record<string, unknown>;
		if (r.transport === "http" && typeof r.url === "string") {
			out[id] = {
				transport: "http",
				url: r.url,
				headers:
					r.headers && typeof r.headers === "object"
						? (r.headers as Record<string, string>)
						: undefined,
			};
		} else if (typeof r.command === "string") {
			out[id] = {
				transport: "stdio",
				command: r.command,
				args: Array.isArray(r.args)
					? r.args.filter((a): a is string => typeof a === "string")
					: undefined,
				env:
					r.env && typeof r.env === "object"
						? (r.env as Record<string, string>)
						: undefined,
			};
		}
	}
	return out;
}

import { z } from "zod";

export const mcpNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Named server from workspace `settings.mcp.servers`. */
	server: z.string().min(1),
	/** Tool name on the remote MCP server. */
	tool: z.string().min(1),
	/**
	 * Tool arguments. Object values may include `{{...}}` templates in strings.
	 * A string is treated as a JSON template string and parsed after resolution.
	 */
	arguments: z.union([z.record(z.unknown()), z.string()]).default({}),
	/** Call timeout in milliseconds (default 60s). */
	timeoutMs: z.number().int().positive().max(600_000).optional(),
});

export type McpNodeData = z.infer<typeof mcpNodeDataSchema>;

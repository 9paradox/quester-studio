import { appendMcpActivity, summarizeToolArgs } from "./activity-log.js";
import {
	describeNodeTypeTool,
	getNodeTool,
	listEnvKeysTool,
	listNodeTypesTool,
	patchNodeTool,
	suggestJmespathTool,
} from "./collab-tools.js";
import type { McpWorkspaceContext } from "./handlers.js";
import {
	createMcpWorkspaceContext,
	inspectLastRunTool,
	listFlowsTool,
	patchFlowTool,
	readFlowTool,
	runFlowTool,
	saveFlowTool,
	validateFlowTool,
} from "./handlers.js";

export type CreateQuesterMcpServerOptions = {
	workspaceRoot: string;
	/** Injected context for tests; defaults to a new context. */
	context?: McpWorkspaceContext;
	version?: string;
};

type ToolResult = {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
};

/** Minimal surface we need from the MCP SDK McpServer. */
export type QuesterMcpServerHandle = {
	registerTool: (
		name: string,
		config: {
			description: string;
			inputSchema: Record<string, unknown>;
		},
		handler: (args: Record<string, unknown>) => Promise<ToolResult>,
	) => void;
	connect: (transport: unknown) => Promise<void>;
};

type ZodLike = {
	string: () => {
		describe: (d: string) => unknown;
		optional: () => { describe: (d: string) => unknown };
	};
	unknown: () => {
		optional: () => { describe: (d: string) => unknown };
		describe: (d: string) => unknown;
	};
	boolean: () => {
		optional: () => { describe: (d: string) => unknown };
	};
};

async function loadSdk(): Promise<{
	McpServer: new (opts: {
		name: string;
		version: string;
	}) => QuesterMcpServerHandle;
	StdioServerTransport: new () => unknown;
	z: ZodLike;
}> {
	const mcpPath = "@modelcontextprotocol/sdk/server/mcp.js";
	const stdioPath = "@modelcontextprotocol/sdk/server/stdio.js";
	const zodPath = "zod";
	const [{ McpServer }, { StdioServerTransport }, zodMod] = await Promise.all([
		import(mcpPath) as Promise<{ McpServer: unknown }>,
		import(stdioPath) as Promise<{ StdioServerTransport: unknown }>,
		import(zodPath) as Promise<{ z: ZodLike }>,
	]);
	return {
		McpServer: McpServer as new (opts: {
			name: string;
			version: string;
		}) => QuesterMcpServerHandle,
		StdioServerTransport: StdioServerTransport as new () => unknown,
		z: zodMod.z,
	};
}

function extractToolError(result: ToolResult): string | undefined {
	if (!result.isError) return undefined;
	const text = result.content
		.map((c) => c.text)
		.join("\n")
		.trim();
	return text || "tool error";
}

export async function createQuesterMcpServer(
	options: CreateQuesterMcpServerOptions,
): Promise<{ server: QuesterMcpServerHandle; context: McpWorkspaceContext }> {
	const { McpServer, z } = await loadSdk();
	const context =
		options.context ?? createMcpWorkspaceContext(options.workspaceRoot);
	const server = new McpServer({
		name: "quester",
		version: options.version ?? "0.6.2",
	});

	const register = (
		name: string,
		config: {
			description: string;
			inputSchema: Record<string, unknown>;
		},
		handler: (args: Record<string, unknown>) => Promise<ToolResult>,
	) => {
		server.registerTool(name, config, async (args) => {
			const started = Date.now();
			const meta = summarizeToolArgs(name, args);
			try {
				const result = await handler(args);
				await appendMcpActivity(context.workspaceRoot, {
					tool: name,
					ok: !result.isError,
					summary: meta.summary,
					flowId: meta.flowId,
					nodeId: meta.nodeId,
					durationMs: Date.now() - started,
					error: extractToolError(result),
				});
				return result;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				await appendMcpActivity(context.workspaceRoot, {
					tool: name,
					ok: false,
					summary: meta.summary,
					flowId: meta.flowId,
					nodeId: meta.nodeId,
					durationMs: Date.now() - started,
					error: message,
				});
				throw err;
			}
		});
	};

	register(
		"list_flows",
		{
			description:
				"List flows in the configured Quester workspace (id and name). Does not expose secrets.",
			inputSchema: {},
		},
		async () => listFlowsTool(context),
	);

	register(
		"read_flow",
		{
			description:
				"Read a flow JSON document by id (graph/config only — not run bodies or secret values).",
			inputSchema: {
				flowId: z.string().describe("Flow id (filename without .flow.json)"),
			},
		},
		async (args) => readFlowTool(context, { flowId: String(args.flowId) }),
	);

	register(
		"validate_flow",
		{
			description:
				"Validate a flow by id (from workspace) or by providing flow JSON.",
			inputSchema: {
				flowId: z.string().optional().describe("Flow id to load and validate"),
				flow: z.unknown().optional().describe("Raw flow JSON to validate"),
			},
		},
		async (args) =>
			validateFlowTool(context, {
				flowId: args.flowId !== undefined ? String(args.flowId) : undefined,
				flow: args.flow,
			}),
	);

	register(
		"run_flow",
		{
			description:
				"Execute a workspace flow (may use secrets + network). Response returns step summary + TypeScript/JSON Schema shapes of outputs — not raw JSON bodies. Secrets are never returned.",
			inputSchema: {
				flowId: z.string().describe("Flow id to run"),
				env: z
					.string()
					.optional()
					.describe("Environment name (default: local)"),
				input: z
					.unknown()
					.optional()
					.describe("Flow input object (default: {})"),
			},
		},
		async (args) =>
			runFlowTool(context, {
				flowId: String(args.flowId),
				env: args.env !== undefined ? String(args.env) : undefined,
				input: args.input,
			}),
	);

	register(
		"inspect_last_run",
		{
			description:
				"Inspect last run as TypeScript/JSON Schema shapes and JMESPath paths (default). Pass includeValues=true only when needed — values are redacted (secrets + sensitive keys). Never returns secret store contents.",
			inputSchema: {
				flowId: z.string().optional().describe("Flow id (default: latest any)"),
				nodeId: z
					.string()
					.optional()
					.describe("If set, return that node's I/O shapes only"),
				includeValues: z
					.boolean()
					.optional()
					.describe("Opt-in redacted samples (default false)"),
			},
		},
		async (args) =>
			inspectLastRunTool(context, {
				flowId: args.flowId !== undefined ? String(args.flowId) : undefined,
				nodeId: args.nodeId !== undefined ? String(args.nodeId) : undefined,
				includeValues: args.includeValues === true,
			}),
	);

	register(
		"save_flow",
		{
			description:
				"Validate and write a full flow JSON to the workspace flows directory.",
			inputSchema: {
				flow: z.unknown().describe("Complete flow document (must pass schema)"),
			},
		},
		async (args) => saveFlowTool(context, { flow: args.flow }),
	);

	register(
		"patch_flow",
		{
			description:
				"Apply an RFC 7396 JSON Merge Patch to an existing flow, validate, and save. Null values delete keys.",
			inputSchema: {
				flowId: z.string().describe("Flow id to patch"),
				patch: z.unknown().describe("JSON Merge Patch object"),
			},
		},
		async (args) =>
			patchFlowTool(context, {
				flowId: String(args.flowId),
				patch: args.patch,
			}),
	);

	register(
		"list_node_types",
		{
			description:
				"List builtin node types with short summaries (for authoring).",
			inputSchema: {},
		},
		async () => listNodeTypesTool(),
	);

	register(
		"describe_node_type",
		{
			description:
				"JSON Schema for a builtin node type's data fields (helps agents edit nodes safely).",
			inputSchema: {
				type: z.string().describe("Node type, e.g. extract, http, assert"),
			},
		},
		async (args) => describeNodeTypeTool({ type: String(args.type) }),
	);

	register(
		"get_node",
		{
			description:
				"Get one node config + adjacent edges (no run bodies / secrets).",
			inputSchema: {
				flowId: z.string(),
				nodeId: z.string(),
			},
		},
		async (args) =>
			getNodeTool(context, {
				flowId: String(args.flowId),
				nodeId: String(args.nodeId),
			}),
	);

	register(
		"patch_node",
		{
			description:
				"Merge-patch a single node's data (validate), then save the flow. Ideal for setting extract.expression after JMESPath help.",
			inputSchema: {
				flowId: z.string(),
				nodeId: z.string(),
				dataPatch: z
					.unknown()
					.describe("JSON Merge Patch applied to node.data"),
			},
		},
		async (args) =>
			patchNodeTool(context, {
				flowId: String(args.flowId),
				nodeId: String(args.nodeId),
				dataPatch: args.dataPatch,
			}),
	);

	register(
		"suggest_jmespath",
		{
			description:
				"Collaborate on JMESPath for a node: returns upstream wire TypeScript/schema shapes, example paths, and how to patch_node. Does not send raw JSON values by default.",
			inputSchema: {
				flowId: z.string(),
				nodeId: z.string().describe("Usually an extract/assert/inspect node"),
				goal: z
					.string()
					.optional()
					.describe("What the user wants, e.g. 'product id from login body'"),
				includeValues: z
					.boolean()
					.optional()
					.describe("Opt-in redacted upstream samples"),
			},
		},
		async (args) =>
			suggestJmespathTool(context, {
				flowId: String(args.flowId),
				nodeId: String(args.nodeId),
				goal: args.goal !== undefined ? String(args.goal) : undefined,
				includeValues: args.includeValues === true,
			}),
	);

	register(
		"list_env_keys",
		{
			description:
				"List environment names and variable KEYS only (never values). Reminds agent that secrets stay in {{secrets.*}}.",
			inputSchema: {},
		},
		async () => listEnvKeysTool(context),
	);

	return { server, context };
}

export async function startStdioServer(options: {
	workspaceRoot: string;
	version?: string;
}): Promise<void> {
	const { StdioServerTransport } = await loadSdk();
	const { server } = await createQuesterMcpServer(options);
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(
		`Quester MCP server listening on stdio (workspace: ${options.workspaceRoot})`,
	);
}

/**
 * Call an external MCP server tool (stdio or HTTP).
 * Loads the SDK via dynamic import so package `tsc` stays fast.
 */
export type McpServerConfig =
	| {
			transport: "stdio";
			command: string;
			args?: string[];
			env?: Record<string, string>;
	  }
	| {
			transport: "http";
			url: string;
			headers?: Record<string, string>;
	  };

export type CallMcpToolOptions = {
	server: McpServerConfig;
	tool: string;
	arguments?: Record<string, unknown>;
	timeoutMs?: number;
	signal?: AbortSignal;
};

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return { value };
}

export async function callExternalMcpTool(
	options: CallMcpToolOptions,
): Promise<unknown> {
	const timeoutMs = options.timeoutMs ?? 60_000;
	const controller = new AbortController();
	const onAbort = () => controller.abort();
	options.signal?.addEventListener("abort", onAbort);
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const clientPath = "@modelcontextprotocol/sdk/client/index.js";
		const stdioPath = "@modelcontextprotocol/sdk/client/stdio.js";
		const httpPath = "@modelcontextprotocol/sdk/client/streamableHttp.js";

		const { Client } = (await import(clientPath)) as {
			Client: new (
				info: { name: string; version: string },
				caps?: Record<string, unknown>,
			) => {
				connect: (t: unknown) => Promise<void>;
				callTool: (req: {
					name: string;
					arguments?: Record<string, unknown>;
				}) => Promise<unknown>;
				close: () => Promise<void>;
			};
		};

		const client = new Client({ name: "quester", version: "0.6.2" });
		let transport: { close?: () => Promise<void> | void };

		if (options.server.transport === "stdio") {
			const { StdioClientTransport } = (await import(stdioPath)) as {
				StdioClientTransport: new (opts: {
					command: string;
					args?: string[];
					env?: Record<string, string>;
				}) => { close?: () => Promise<void> | void };
			};
			transport = new StdioClientTransport({
				command: options.server.command,
				args: options.server.args,
				env: options.server.env,
			});
		} else {
			const { StreamableHTTPClientTransport } = (await import(httpPath)) as {
				StreamableHTTPClientTransport: new (
					url: URL,
					opts?: { requestInit?: RequestInit },
				) => { close?: () => Promise<void> | void };
			};
			const headers = options.server.headers;
			transport = new StreamableHTTPClientTransport(
				new URL(options.server.url),
				headers ? { requestInit: { headers } } : undefined,
			);
		}

		await client.connect(transport);
		try {
			if (controller.signal.aborted) {
				throw new Error("MCP tool call aborted");
			}
			const result = await client.callTool({
				name: options.tool,
				arguments: options.arguments ?? {},
			});
			return asRecord(result);
		} finally {
			await client.close().catch(() => undefined);
			await Promise.resolve(transport.close?.()).catch(() => undefined);
		}
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener("abort", onAbort);
	}
}

export function resolveMcpServerConfig(
	servers: Record<string, McpServerConfig> | undefined,
	serverId: string,
): McpServerConfig {
	const cfg = servers?.[serverId];
	if (!cfg) {
		throw new Error(
			`Unknown MCP server "${serverId}" — add it under settings.mcp.servers in quester.json`,
		);
	}
	return cfg;
}

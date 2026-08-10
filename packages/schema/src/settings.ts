import { z } from "zod";

/** Shared HTTP defaults for workspace / flow settings. */
export const httpSettingsSchemaV1 = z.object({
	/** Applied before node headers; node keys win on conflict. */
	defaultHeaders: z.record(z.string()).default({}),
	/**
	 * Request timeout in milliseconds. `0` = no timeout.
	 * Omitted = inherit from the next outer layer (or none).
	 */
	timeoutMs: z.number().int().nonnegative().optional(),
	/**
	 * Max response body size in bytes. `0` = unlimited.
	 * Omitted = inherit.
	 */
	maxResponseBytes: z.number().int().nonnegative().optional(),
	/**
	 * HTTP(S) proxy URL for fetches. Empty string clears an outer proxy.
	 * Omitted = inherit.
	 */
	proxyUrl: z.string().optional(),
	/**
	 * Workspace-relative path to a PEM CA bundle for TLS.
	 * Empty string clears an outer CA. Omitted = inherit.
	 */
	caFile: z.string().optional(),
	/**
	 * Verify TLS certificates. Omitted = inherit (then app preference / env).
	 */
	verifyTls: z.boolean().optional(),
	/**
	 * Persist cookies across hops within a single run.
	 * Omitted = inherit; default on when unset at all layers.
	 */
	cookieJar: z.boolean().optional(),
});

/** Named external MCP servers callable from `mcp` flow nodes. */
export const mcpServerConfigSchemaV1 = z.union([
	z.object({
		transport: z.literal("stdio"),
		command: z.string().min(1),
		args: z.array(z.string()).optional(),
		env: z.record(z.string()).optional(),
	}),
	z.object({
		transport: z.literal("http"),
		url: z.string().url(),
		headers: z.record(z.string()).optional(),
	}),
]);

export const mcpSettingsSchemaV1 = z.object({
	servers: z.record(mcpServerConfigSchemaV1).default({}),
});

export const settingsSchemaV1 = z.object({
	http: httpSettingsSchemaV1.optional(),
	mcp: mcpSettingsSchemaV1.optional(),
});

export type HttpSettingsV1 = z.infer<typeof httpSettingsSchemaV1>;
export type McpServerConfigV1 = z.infer<typeof mcpServerConfigSchemaV1>;
export type McpSettingsV1 = z.infer<typeof mcpSettingsSchemaV1>;
export type SettingsV1 = z.infer<typeof settingsSchemaV1>;

function pickInherited<T>(
	flowValue: T | undefined,
	workspaceValue: T | undefined,
): T | undefined {
	return flowValue !== undefined ? flowValue : workspaceValue;
}

/** Merge workspace → flow HTTP settings (flow wins when set; headers merge with flow overriding keys). */
export function mergeHttpSettings(
	workspace?: HttpSettingsV1 | null,
	flow?: HttpSettingsV1 | null,
): HttpSettingsV1 {
	const defaultHeaders = {
		...(workspace?.defaultHeaders ?? {}),
		...(flow?.defaultHeaders ?? {}),
	};

	const timeoutMs = pickInherited(flow?.timeoutMs, workspace?.timeoutMs);
	const maxResponseBytes = pickInherited(
		flow?.maxResponseBytes,
		workspace?.maxResponseBytes,
	);
	const proxyUrl = pickInherited(flow?.proxyUrl, workspace?.proxyUrl);
	const caFile = pickInherited(flow?.caFile, workspace?.caFile);
	const verifyTls = pickInherited(flow?.verifyTls, workspace?.verifyTls);
	const cookieJar = pickInherited(flow?.cookieJar, workspace?.cookieJar);

	return {
		defaultHeaders,
		...(timeoutMs !== undefined ? { timeoutMs } : {}),
		...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}),
		...(proxyUrl !== undefined ? { proxyUrl } : {}),
		...(caFile !== undefined ? { caFile } : {}),
		...(verifyTls !== undefined ? { verifyTls } : {}),
		...(cookieJar !== undefined ? { cookieJar } : {}),
	};
}

/** Effective cookie jar: default on when neither layer sets it. */
export function isCookieJarEnabled(http?: HttpSettingsV1 | null): boolean {
	return http?.cookieJar !== false;
}

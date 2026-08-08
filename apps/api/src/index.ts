import { isAbsolute, relative, resolve } from "node:path";
import type { NodeRunStatusEvent } from "@quester-studio/api-contract";
import {
	cancelFlowRun,
	createCollection,
	createEnvironment,
	createFlow,
	createRequest,
	createSecretsFile,
	deleteFlow,
	deleteRequest,
	executeFlowRpc,
	executeRequestRpc,
	getAppTlsVerify,
	getDefaultWorkspace,
	listCollectionRequests,
	listCollections,
	listEnvs,
	listFlows,
	listSecretFiles,
	listSecretNames,
	loadEnvironment,
	loadFlow,
	loadRequest,
	loadSecretsFile,
	loadWorkspaceManifest,
	openWorkspaceSummary,
	readPathShapes,
	renameFlow,
	saveEnvironment,
	saveFlow,
	saveRequest,
	saveSecretsFile,
	saveWorkspaceManifest,
	scaffoldWorkspaceRpc,
	setAppTlsVerify,
	writePathShapes,
} from "@quester-studio/workspace-service";
import { publishRunEvent, subscribeRun } from "./run-events.js";

const PORT = Number(process.env.QUESTER_API_PORT ?? 8787);
const HOST = process.env.QUESTER_API_HOST ?? "127.0.0.1";

export function isLoopbackHost(hostname: string): boolean {
	const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	return h === "127.0.0.1" || h === "::1" || h === "localhost";
}

/** Refuse non-loopback bind unless QUESTER_API_ALLOW_REMOTE=1 (loud warn). */
export function assertBindAllowed(
	hostname: string,
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (isLoopbackHost(hostname)) return;
	if (env.QUESTER_API_ALLOW_REMOTE === "1") {
		console.warn(
			`[@quester-studio/api] WARNING: binding to non-loopback "${hostname}" with QUESTER_API_ALLOW_REMOTE=1. This API has no authentication and can expose workspace secrets. Intended for localhost development only — see SECURITY.md.`,
		);
		return;
	}
	throw new Error(
		`Refusing to bind to non-loopback host "${hostname}". Default is 127.0.0.1. Set QUESTER_API_ALLOW_REMOTE=1 only if you accept the risk (no auth; see SECURITY.md).`,
	);
}

/** When QUESTER_WORKSPACE_ROOT is set, reject paths outside that directory. */
export function assertWorkspaceAllowed(
	workspacePath: string,
	env: NodeJS.ProcessEnv = process.env,
): void {
	const jail = env.QUESTER_WORKSPACE_ROOT?.trim();
	if (!jail) return;
	const root = resolve(jail);
	const target = resolve(workspacePath);
	const rel = relative(root, target);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(
			`Workspace path outside QUESTER_WORKSPACE_ROOT: ${workspacePath}`,
		);
	}
}

function isLocalOrigin(origin: string): boolean {
	try {
		return isLoopbackHost(new URL(origin).hostname);
	} catch {
		return false;
	}
}

function corsHeaders(req: Request): HeadersInit {
	const origin = req.headers.get("origin");
	if (origin && isLocalOrigin(origin)) {
		return {
			"access-control-allow-origin": origin,
			"access-control-allow-methods": "GET,POST,OPTIONS",
			"access-control-allow-headers": "content-type,accept",
			"access-control-allow-credentials": "true",
			vary: "Origin",
		};
	}
	return {
		"access-control-allow-origin": "http://127.0.0.1",
		"access-control-allow-methods": "GET,POST,OPTIONS",
		"access-control-allow-headers": "content-type,accept",
		vary: "Origin",
	};
}

function json(req: Request, data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			...corsHeaders(req),
		},
	});
}

function errorResponse(req: Request, error: unknown, status = 400): Response {
	const message = error instanceof Error ? error.message : String(error);
	return json(req, { error: message }, status);
}

async function readBody<T>(req: Request): Promise<T> {
	const body = (await req.json()) as T;
	const record = body as Record<string, unknown>;
	for (const key of ["workspace", "path"] as const) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) {
			assertWorkspaceAllowed(value);
		}
	}
	return body;
}

type RouteHandler = (req: Request, url: URL) => Promise<Response> | Response;

const postRoutes: Record<string, RouteHandler> = {
	"/v1/workspace/scaffold": async (req) => {
		const body = await readBody<{ path: string; name?: string }>(req);
		return json(req, await scaffoldWorkspaceRpc(body.path, body.name));
	},
	"/v1/workspace/summary": async (req) => {
		const body = await readBody<{ path: string }>(req);
		return json(req, await openWorkspaceSummary(body.path));
	},
	"/v1/workspace/manifest/load": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await loadWorkspaceManifest(body.workspace));
	},
	"/v1/workspace/manifest/save": async (req) => {
		const body = await readBody<{
			workspace: string;
			manifest: Parameters<typeof saveWorkspaceManifest>[1];
		}>(req);
		return json(
			req,
			await saveWorkspaceManifest(body.workspace, body.manifest),
		);
	},
	"/v1/flows/list": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await listFlows(body.workspace));
	},
	"/v1/envs/list": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await listEnvs(body.workspace));
	},
	"/v1/flows/load": async (req) => {
		const body = await readBody<{ flowId: string; workspace: string }>(req);
		return json(req, await loadFlow(body.flowId, body.workspace));
	},
	"/v1/flows/execute": async (req) => {
		const body = await readBody<{
			flowId: string;
			workspace: string;
			runId: string;
			env?: string;
			input?: unknown;
		}>(req);
		const result = await executeFlowRpc(body.flowId, {
			workspace: body.workspace,
			env: body.env,
			input: body.input,
			runId: body.runId,
			onNodeStatus: (event) => {
				publishRunEvent({
					runId: body.runId,
					flowId: body.flowId,
					nodeId: event.nodeId,
					nodeType: event.nodeType,
					status: event.status,
					ts: event.ts,
				} satisfies NodeRunStatusEvent);
			},
		});
		return json(req, result);
	},
	"/v1/flows/cancel": async (req) => {
		const body = await readBody<{ runId: string }>(req);
		return json(req, { ok: cancelFlowRun(body.runId) });
	},
	"/v1/flows/save": async (req) => {
		const body = await readBody<{
			flow: Parameters<typeof saveFlow>[0];
			workspace: string;
		}>(req);
		return json(req, await saveFlow(body.flow, body.workspace));
	},
	"/v1/secrets/names": async (req) => {
		const body = await readBody<{ workspace: string; env: string }>(req);
		return json(req, await listSecretNames(body.workspace, body.env));
	},
	"/v1/flows/create": async (req) => {
		const body = await readBody<{
			workspace: string;
			flowId: string;
			name?: string;
		}>(req);
		return json(req, await createFlow(body.workspace, body.flowId, body.name));
	},
	"/v1/flows/delete": async (req) => {
		const body = await readBody<{ workspace: string; flowId: string }>(req);
		await deleteFlow(body.flowId, body.workspace);
		return json(req, { ok: true as const });
	},
	"/v1/flows/rename": async (req) => {
		const body = await readBody<{
			workspace: string;
			flowId: string;
			newId: string;
			name?: string;
		}>(req);
		return json(
			req,
			await renameFlow(body.workspace, body.flowId, body.newId, body.name),
		);
	},
	"/v1/envs/load": async (req) => {
		const body = await readBody<{ workspace: string; envName: string }>(req);
		return json(req, await loadEnvironment(body.workspace, body.envName));
	},
	"/v1/envs/save": async (req) => {
		const body = await readBody<{
			workspace: string;
			environment: Parameters<typeof saveEnvironment>[1];
		}>(req);
		return json(req, await saveEnvironment(body.workspace, body.environment));
	},
	"/v1/envs/create": async (req) => {
		const body = await readBody<{ workspace: string; envName: string }>(req);
		return json(req, await createEnvironment(body.workspace, body.envName));
	},
	"/v1/secrets/list": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await listSecretFiles(body.workspace));
	},
	"/v1/secrets/load": async (req) => {
		const body = await readBody<{ workspace: string; envName: string }>(req);
		return json(req, await loadSecretsFile(body.workspace, body.envName));
	},
	"/v1/secrets/save": async (req) => {
		const body = await readBody<{
			workspace: string;
			envName: string;
			secrets: Parameters<typeof saveSecretsFile>[2];
		}>(req);
		return json(
			req,
			await saveSecretsFile(body.workspace, body.envName, body.secrets),
		);
	},
	"/v1/secrets/create": async (req) => {
		const body = await readBody<{ workspace: string; envName: string }>(req);
		return json(req, await createSecretsFile(body.workspace, body.envName));
	},
	"/v1/collections/requests/list": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await listCollectionRequests(body.workspace));
	},
	"/v1/collections/list": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await listCollections(body.workspace));
	},
	"/v1/collections/requests/load": async (req) => {
		const body = await readBody<{
			workspace: string;
			requestPath: string;
		}>(req);
		return json(req, await loadRequest(body.workspace, body.requestPath));
	},
	"/v1/collections/requests/save": async (req) => {
		const body = await readBody<{
			workspace: string;
			requestPath: string;
			request: Parameters<typeof saveRequest>[2];
		}>(req);
		return json(
			req,
			await saveRequest(body.workspace, body.requestPath, body.request),
		);
	},
	"/v1/collections/requests/create": async (req) => {
		const body = await readBody<{
			workspace: string;
			requestPath: string;
			name?: string;
		}>(req);
		return json(
			req,
			await createRequest(body.workspace, body.requestPath, body.name),
		);
	},
	"/v1/collections/requests/delete": async (req) => {
		const body = await readBody<{
			workspace: string;
			requestPath: string;
		}>(req);
		await deleteRequest(body.workspace, body.requestPath);
		return json(req, { ok: true as const });
	},
	"/v1/collections/create": async (req) => {
		const body = await readBody<{
			workspace: string;
			collectionName: string;
		}>(req);
		return json(
			req,
			await createCollection(body.workspace, body.collectionName),
		);
	},
	"/v1/collections/requests/execute": async (req) => {
		const body = await readBody<{
			requestPath: string;
			workspace: string;
			env?: string;
		}>(req);
		return json(
			req,
			await executeRequestRpc(body.requestPath, {
				workspace: body.workspace,
				env: body.env,
			}),
		);
	},
	"/v1/path-shapes/read": async (req) => {
		const body = await readBody<{ workspace: string }>(req);
		return json(req, await readPathShapes(body.workspace));
	},
	"/v1/path-shapes/write": async (req) => {
		const body = await readBody<{ workspace: string; data: unknown }>(req);
		return json(req, await writePathShapes(body.workspace, body.data));
	},
	"/v1/prefs/tls": async (req) => {
		const body = await readBody<{ verifyTls: boolean }>(req);
		setAppTlsVerify(body.verifyTls);
		return json(req, { ok: true as const, verifyTls: getAppTlsVerify() });
	},
};

function sseForRun(req: Request, runId: string): Response {
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (event: string, data: unknown) => {
				controller.enqueue(
					encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
				);
			};
			send("ready", { runId });
			const unsubscribe = subscribeRun(runId, (event) => {
				send("nodeRunStatus", event);
			});
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": ping\n\n"));
				} catch {
					clearInterval(heartbeat);
				}
			}, 15_000);
			req.signal.addEventListener("abort", () => {
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		},
	});
	return new Response(stream, {
		headers: {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache",
			connection: "keep-alive",
			...corsHeaders(req),
		},
	});
}

export async function handleRequest(req: Request): Promise<Response> {
	const url = new URL(req.url);

	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders(req) });
	}

	if (req.method === "GET" && url.pathname === "/health") {
		return json(req, { ok: true });
	}

	if (req.method === "GET" && url.pathname === "/v1/workspace/default") {
		return json(req, { path: await getDefaultWorkspace() });
	}

	if (req.method === "GET" && url.pathname === "/v1/prefs/tls") {
		return json(req, { verifyTls: getAppTlsVerify() });
	}

	const runEventsMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/events$/);
	if (req.method === "GET" && runEventsMatch?.[1]) {
		return sseForRun(req, decodeURIComponent(runEventsMatch[1]));
	}

	if (req.method === "POST") {
		const handler = postRoutes[url.pathname];
		if (handler) {
			try {
				return await handler(req, url);
			} catch (error) {
				return errorResponse(req, error);
			}
		}
	}

	return errorResponse(req, `Not found: ${req.method} ${url.pathname}`, 404);
}

export function startServer(options?: {
	port?: number;
	hostname?: string;
}): ReturnType<typeof Bun.serve> {
	const port = options?.port ?? PORT;
	const hostname = options?.hostname ?? HOST;
	assertBindAllowed(hostname);
	const server = Bun.serve({
		port,
		hostname,
		fetch: handleRequest,
	});
	console.log(
		`[@quester-studio/api] listening on http://${hostname}:${server.port}`,
	);
	if (process.env.QUESTER_WORKSPACE_ROOT) {
		console.log(
			`[@quester-studio/api] QUESTER_WORKSPACE_ROOT=${process.env.QUESTER_WORKSPACE_ROOT}`,
		);
	}
	console.log(
		"[@quester-studio/api] localhost-dev only — no authentication; see SECURITY.md",
	);
	return server;
}

if (import.meta.main) {
	startServer();
}

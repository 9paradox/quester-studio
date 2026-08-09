import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";
import type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	NodeRunStatusEvent,
	QuesterClient,
} from "./types.js";

export type HttpQuesterClientOptions = {
	/** Base URL without trailing slash, e.g. http://127.0.0.1:8787 */
	baseUrl: string;
	fetch?: typeof fetch;
};

async function parseJson<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let message = `${res.status} ${res.statusText}`;
		try {
			const body = (await res.json()) as { error?: string };
			if (body.error) message = body.error;
		} catch {
			// ignore
		}
		throw new Error(message);
	}
	return (await res.json()) as T;
}

function wrapNetworkError(error: unknown, baseUrl: string): Error {
	const message = error instanceof Error ? error.message : String(error);
	if (
		message === "Failed to fetch" ||
		message.includes("NetworkError") ||
		message.includes("ECONNREFUSED")
	) {
		return new Error(
			`Cannot reach API at ${baseUrl}. Start it with: bun run --filter @quester-studio/api dev — or use UI mock: bun run --filter @quester-studio/desktop dev:web:mock`,
		);
	}
	return error instanceof Error ? error : new Error(message);
}

/**
 * Browser/Node client: HTTP JSON for requests, SSE for nodeRunStatus during runs.
 * Subscribe to SSE before calling executeFlowRpc so live status is received.
 */
export function createHttpQuesterClient(
	options: HttpQuesterClientOptions,
): QuesterClient {
	const baseUrl = options.baseUrl.replace(/\/$/, "");
	const fetchFn = options.fetch ?? fetch;
	const listeners = new Set<(event: NodeRunStatusEvent) => void>();
	const eventSources = new Map<string, EventSource>();

	const ensureRunEvents = (runId: string) => {
		if (eventSources.has(runId)) return;
		if (typeof EventSource === "undefined") return;
		const es = new EventSource(
			`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`,
		);
		es.addEventListener("nodeRunStatus", (msg) => {
			try {
				const event = JSON.parse(
					(msg as MessageEvent).data as string,
				) as NodeRunStatusEvent;
				for (const listener of listeners) {
					listener(event);
				}
			} catch {
				// ignore malformed events
			}
		});
		es.onerror = () => {
			es.close();
			eventSources.delete(runId);
		};
		eventSources.set(runId, es);
	};

	const post = async <T>(path: string, body?: unknown): Promise<T> => {
		try {
			const res = await fetchFn(`${baseUrl}${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			return await parseJson<T>(res);
		} catch (error) {
			throw wrapNetworkError(error, baseUrl);
		}
	};

	const get = async <T>(path: string): Promise<T> => {
		try {
			const res = await fetchFn(`${baseUrl}${path}`, {
				headers: { accept: "application/json" },
			});
			return await parseJson<T>(res);
		} catch (error) {
			throw wrapNetworkError(error, baseUrl);
		}
	};

	return {
		onNodeRunStatus: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getDefaultWorkspace: () =>
			get<{ path: string }>("/v1/workspace/default").then((r) => r.path),
		pickWorkspaceFolder: async () => null,
		pickCollectionFile: async () => null,
		scaffoldWorkspace: (path, name) =>
			post("/v1/workspace/scaffold", { path, name }),
		openWorkspaceSummary: (path) => post("/v1/workspace/summary", { path }),
		loadWorkspaceManifest: (workspace) =>
			post("/v1/workspace/manifest/load", { workspace }),
		saveWorkspaceManifest: (workspace, manifest) =>
			post("/v1/workspace/manifest/save", { workspace, manifest }),
		listFlows: (workspace) => post("/v1/flows/list", { workspace }),
		listEnvs: (workspace) => post("/v1/envs/list", { workspace }),
		loadFlow: (flowId, workspace) =>
			post("/v1/flows/load", { flowId, workspace }),
		executeFlowRpc: async (params) => {
			ensureRunEvents(params.runId);
			try {
				return await post<ExecuteFlowRpcResult>("/v1/flows/execute", params);
			} finally {
				const es = eventSources.get(params.runId);
				if (es) {
					es.close();
					eventSources.delete(params.runId);
				}
			}
		},
		cancelFlowRun: (params) =>
			post<{ ok: boolean }>("/v1/flows/cancel", params),
		saveFlow: (flow: FlowV1, workspace: string) =>
			post("/v1/flows/save", { flow, workspace }),
		listSecretNames: (workspace, env) =>
			post("/v1/secrets/names", { workspace, env }),
		createFlow: (workspace, flowId, name) =>
			post("/v1/flows/create", { workspace, flowId, name }),
		deleteFlow: (workspace, flowId) =>
			post("/v1/flows/delete", { workspace, flowId }),
		renameFlow: (workspace, flowId, newId, name) =>
			post("/v1/flows/rename", { workspace, flowId, newId, name }),
		loadEnvironment: (workspace, envName) =>
			post("/v1/envs/load", { workspace, envName }),
		saveEnvironment: (workspace, environment: EnvironmentV1) =>
			post("/v1/envs/save", { workspace, environment }),
		createEnvironment: (workspace, envName) =>
			post("/v1/envs/create", { workspace, envName }),
		listSecretFiles: (workspace) => post("/v1/secrets/list", { workspace }),
		loadSecretsFile: (workspace, envName) =>
			post("/v1/secrets/load", { workspace, envName }),
		saveSecretsFile: (workspace, envName, secrets: SecretsV1) =>
			post("/v1/secrets/save", { workspace, envName, secrets }),
		createSecretsFile: (workspace, envName) =>
			post("/v1/secrets/create", { workspace, envName }),
		listCollectionRequests: (workspace) =>
			post("/v1/collections/requests/list", { workspace }),
		listCollections: (workspace) => post("/v1/collections/list", { workspace }),
		loadRequest: (workspace, requestPath) =>
			post("/v1/collections/requests/load", { workspace, requestPath }),
		saveRequest: (workspace, requestPath, request: RequestV1) =>
			post("/v1/collections/requests/save", {
				workspace,
				requestPath,
				request,
			}),
		createRequest: (workspace, requestPath, name) =>
			post("/v1/collections/requests/create", {
				workspace,
				requestPath,
				name,
			}),
		deleteRequest: (workspace, requestPath) =>
			post("/v1/collections/requests/delete", { workspace, requestPath }),
		createCollection: (workspace, collectionName) =>
			post("/v1/collections/create", { workspace, collectionName }),
		importCollection: async () => {
			throw new Error(
				"Collection import is not available in web/API mode — use `quester import-collection` or the desktop app",
			);
		},
		executeRequestRpc: (params) =>
			post("/v1/collections/requests/execute", params),
		readPathShapes: (workspace) => post("/v1/path-shapes/read", { workspace }),
		writePathShapes: (workspace, data) =>
			post("/v1/path-shapes/write", { workspace, data }),
		setAppTlsVerify: (verifyTls) => post("/v1/prefs/tls", { verifyTls }),
		getAppTlsVerify: () => get("/v1/prefs/tls"),
		openPathInOs: async () => ({
			ok: false,
			error: "Opening folders is only supported in the desktop app",
		}),
		listRunTree: (workspace) => post("/v1/runs/list", { workspace }),
		readRunJson: (workspace, relativePath) =>
			post("/v1/runs/read", { workspace, relativePath }),
		deleteRunPath: (workspace, relativePath) =>
			post("/v1/runs/delete", { workspace, relativePath }),
	};
}

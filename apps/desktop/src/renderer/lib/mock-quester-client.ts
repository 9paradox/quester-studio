import type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	NodeRunStatusEvent,
	QuesterClient,
} from "@quester-studio/api-contract";
import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";

export const MOCK_WORKSPACE = "/mock/workspace";

const mockManifest: WorkspaceV1 = {
	version: "v1",
	name: "Mock Workspace",
	description: "In-memory fixture for UI-only (no API)",
	flowsDir: "flows",
	environmentsDir: "environments",
	collectionsDir: "collections",
	settings: {
		http: {
			defaultHeaders: {},
			timeoutMs: 30_000,
		},
	},
};

function emptyFlow(id: string, name?: string): FlowV1 {
	return {
		version: "v1",
		id,
		name: name ?? id,
		nodes: [
			{
				id: "start",
				type: "start",
				position: { x: 0, y: 120 },
				data: { label: "Start" },
			},
			{
				id: "input",
				type: "input",
				position: { x: 220, y: 120 },
				data: { label: "Input", value: { hello: "world" } },
			},
			{
				id: "out",
				type: "output",
				position: { x: 440, y: 120 },
				data: { label: "Output" },
			},
		],
		edges: [
			{
				id: "e-start-input",
				source: "start",
				target: "input",
				sourceHandle: null,
			},
			{
				id: "e-input-out",
				source: "input",
				target: "out",
				sourceHandle: null,
			},
		],
	};
}

/**
 * In-memory QuesterClient for UI-only development (no apps/api).
 * Enable with `VITE_QUESTER_CLIENT=mock` or `dev:web:mock`.
 */
export function createMockQuesterClient(): QuesterClient {
	const listeners = new Set<(event: NodeRunStatusEvent) => void>();
	let manifest = structuredClone(mockManifest);
	const flows = new Map<string, FlowV1>([
		["mock-flow", emptyFlow("mock-flow", "Mock Flow")],
	]);
	const environments = new Map<string, EnvironmentV1>([
		[
			"local",
			{
				version: "v1",
				name: "local",
				variables: { API_BASE: "https://example.com" },
			},
		],
	]);
	const secrets = new Map<string, SecretsV1>();
	const requests = new Map<string, RequestV1>();
	const collections = new Set<string>(["Demo"]);
	let pathShapes: unknown = null;
	let verifyTls = true;
	const runAbortControllers = new Map<string, AbortController>();

	const emitStatus = async (
		runId: string,
		flowId: string,
		nodeId: string,
		nodeType: string,
		status: NodeRunStatusEvent["status"],
		signal?: AbortSignal,
	) => {
		if (signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		const event: NodeRunStatusEvent = {
			runId,
			flowId,
			nodeId,
			nodeType,
			status,
			ts: Date.now(),
		};
		for (const listener of listeners) {
			listener(event);
		}
		await new Promise((resolve, reject) => {
			const timer = setTimeout(resolve, 40);
			signal?.addEventListener(
				"abort",
				() => {
					clearTimeout(timer);
					reject(new DOMException("Aborted", "AbortError"));
				},
				{ once: true },
			);
		});
	};

	return {
		onNodeRunStatus: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getDefaultWorkspace: async () => MOCK_WORKSPACE,
		pickWorkspaceFolder: async () => MOCK_WORKSPACE,
		pickCollectionFile: async () => null,
		scaffoldWorkspace: async (path, name) => {
			manifest = {
				...manifest,
				name: name ?? "scaffolded",
			};
			const flowId = "hello";
			flows.set(flowId, emptyFlow(flowId, "Hello"));
			return { root: path, name: manifest.name, flowId };
		},
		openWorkspaceSummary: async (path) => ({
			name: manifest.name,
			root: path || MOCK_WORKSPACE,
			envNames: [...environments.keys()],
			flowCount: flows.size,
			manifest,
		}),
		loadWorkspaceManifest: async () => structuredClone(manifest),
		saveWorkspaceManifest: async (_workspace, next) => {
			manifest = structuredClone(next);
			return structuredClone(manifest);
		},
		listFlows: async () =>
			[...flows.values()].map((f) => ({
				id: f.id,
				name: f.name ?? f.id,
			})),
		listEnvs: async () => [...environments.keys()],
		loadFlow: async (flowId) => {
			const flow = flows.get(flowId);
			if (!flow) throw new Error(`Flow not found: ${flowId}`);
			return structuredClone(flow);
		},
		executeFlowRpc: async ({ flowId, runId }) => {
			const flow = flows.get(flowId);
			if (!flow) throw new Error(`Flow not found: ${flowId}`);
			const controller = new AbortController();
			runAbortControllers.set(runId, controller);
			const { signal } = controller;
			const completedSteps: ExecuteFlowRpcResult["steps"] = [];
			try {
				for (const node of flow.nodes) {
					await emitStatus(
						runId,
						flowId,
						node.id,
						node.type,
						"running",
						signal,
					);
					if (signal.aborted) {
						return {
							output: undefined,
							nodeOutputs: Object.fromEntries(
								completedSteps.map((s) => [s.nodeId, s.output]),
							),
							nodeInputs: {},
							steps: completedSteps,
							vars: {},
							logs: [
								{
									ts: Date.now(),
									level: "info",
									message: "Flow run cancelled",
									phase: "complete",
								},
							],
							cancelled: true,
							error: "Flow run cancelled",
						};
					}
					await emitStatus(
						runId,
						flowId,
						node.id,
						node.type,
						"success",
						signal,
					);
					completedSteps.push({
						nodeId: node.id,
						type: node.type,
						input: {},
						output: { ok: true },
					});
				}
				const result: ExecuteFlowRpcResult = {
					output: { mock: true, flowId },
					nodeOutputs: Object.fromEntries(
						flow.nodes.map((n) => [n.id, { ok: true }]),
					),
					nodeInputs: {},
					steps: flow.nodes.map((n) => ({
						nodeId: n.id,
						type: n.type,
						input: {},
						output: { ok: true },
					})),
					vars: {},
					logs: [
						{
							ts: Date.now(),
							level: "info",
							message: "Mock run complete (no real HTTP)",
							phase: "complete",
						},
					],
				};
				return result;
			} catch (error) {
				if (signal.aborted) {
					return {
						output: undefined,
						nodeOutputs: Object.fromEntries(
							completedSteps.map((s) => [s.nodeId, s.output]),
						),
						nodeInputs: {},
						steps: completedSteps,
						vars: {},
						logs: [
							{
								ts: Date.now(),
								level: "info",
								message: "Flow run cancelled",
								phase: "complete",
							},
						],
						cancelled: true,
						error: "Flow run cancelled",
					};
				}
				throw error;
			} finally {
				runAbortControllers.delete(runId);
			}
		},
		cancelFlowRun: async ({ runId }) => {
			const controller = runAbortControllers.get(runId);
			if (!controller) return { ok: false };
			controller.abort();
			return { ok: true };
		},
		saveFlow: async (flow) => {
			flows.set(flow.id, structuredClone(flow));
			return structuredClone(flow);
		},
		listSecretNames: async (_workspace, env) => {
			const file = secrets.get(env);
			return file ? Object.keys(file.secrets) : [];
		},
		createFlow: async (_workspace, flowId, name) => {
			if (flows.has(flowId)) throw new Error(`Flow already exists: ${flowId}`);
			const flow = emptyFlow(flowId, name);
			flows.set(flowId, flow);
			return structuredClone(flow);
		},
		deleteFlow: async (_workspace, flowId) => {
			if (!flows.delete(flowId)) throw new Error(`Flow not found: ${flowId}`);
			return { ok: true as const };
		},
		renameFlow: async (_workspace, flowId, newId, name) => {
			const flow = flows.get(flowId);
			if (!flow) throw new Error(`Flow not found: ${flowId}`);
			const updated = {
				...flow,
				id: newId,
				name: name ?? flow.name,
			};
			flows.delete(flowId);
			flows.set(newId, updated);
			return structuredClone(updated);
		},
		loadEnvironment: async (_workspace, envName) => {
			const env = environments.get(envName);
			if (!env) throw new Error(`Environment not found: ${envName}`);
			return structuredClone(env);
		},
		saveEnvironment: async (_workspace, environment) => {
			environments.set(environment.name, structuredClone(environment));
			return structuredClone(environment);
		},
		createEnvironment: async (_workspace, envName) => {
			if (environments.has(envName)) {
				throw new Error(`Environment already exists: ${envName}`);
			}
			const environment: EnvironmentV1 = {
				version: "v1",
				name: envName,
				variables: {},
			};
			environments.set(envName, environment);
			return structuredClone(environment);
		},
		listSecretFiles: async () =>
			[...secrets.keys()].map((envName) => ({
				envName,
				fileName: `${envName}.secrets.json`,
			})),
		loadSecretsFile: async (_workspace, envName) => {
			const file = secrets.get(envName);
			if (!file) throw new Error(`Secrets file not found: ${envName}`);
			return structuredClone(file);
		},
		saveSecretsFile: async (_workspace, envName, next) => {
			secrets.set(envName, structuredClone(next));
			return structuredClone(next);
		},
		createSecretsFile: async (_workspace, envName) => {
			if (secrets.has(envName)) {
				throw new Error(`Secrets file already exists: ${envName}`);
			}
			const file: SecretsV1 = { version: "v1", secrets: {} };
			secrets.set(envName, file);
			return structuredClone(file);
		},
		listCollectionRequests: async () =>
			[...requests.entries()].map(([path, req]) => ({
				path,
				id: req.id,
				name: req.name,
				collection: path.includes("/") ? (path.split("/")[0] ?? "") : "",
			})),
		listCollections: async () => [...collections],
		loadRequest: async (_workspace, requestPath) => {
			const req = requests.get(requestPath);
			if (!req) throw new Error(`Request not found: ${requestPath}`);
			return structuredClone(req);
		},
		saveRequest: async (_workspace, requestPath, request) => {
			requests.set(requestPath, structuredClone(request));
			return structuredClone(request);
		},
		createRequest: async (_workspace, requestPath, name) => {
			if (requests.has(requestPath)) {
				throw new Error(`Request already exists: ${requestPath}`);
			}
			const id = requestPath.includes("/")
				? (requestPath.split("/").pop() ?? requestPath)
				: requestPath;
			const request: RequestV1 = {
				version: "v1",
				id,
				name: name ?? id,
				method: "GET",
				url: "https://example.com",
				headers: {},
			};
			requests.set(requestPath, request);
			return structuredClone(request);
		},
		deleteRequest: async (_workspace, requestPath) => {
			if (!requests.delete(requestPath)) {
				throw new Error(`Request not found: ${requestPath}`);
			}
			return { ok: true as const };
		},
		createCollection: async (_workspace, collectionName) => {
			collections.add(collectionName);
			return { ok: true as const };
		},
		importCollection: async () => ({ imported: [], skipped: [] }),
		executeRequestRpc: async ({ requestPath }) => {
			const req = requests.get(requestPath);
			const result: ExecuteRequestRpcResult = {
				output: { mock: true },
				nodeOutputs: {
					http: {
						status: 200,
						headers: {},
						body: { mock: true, path: requestPath },
					},
				},
				nodeInputs: {},
				steps: [],
				vars: {},
				logs: [],
				httpOutput: {
					status: 200,
					body: { mock: true, name: req?.name ?? requestPath },
				},
			};
			return result;
		},
		readPathShapes: async () => pathShapes,
		writePathShapes: async (_workspace, data) => {
			pathShapes = data;
			return { ok: true as const };
		},
		setAppTlsVerify: async (next) => {
			verifyTls = next;
			return { ok: true as const, verifyTls };
		},
		getAppTlsVerify: async () => ({ verifyTls }),
		openPathInOs: async () => ({ ok: true }),
		listRunTree: async () => [],
		readRunJson: async () => ({}),
		deleteRunPath: async () => ({ ok: true as const }),
	};
}

export function isMockClientEnabled(
	env: ImportMetaEnv = import.meta.env,
): boolean {
	const client = env.VITE_QUESTER_CLIENT?.toLowerCase();
	if (client === "mock") return true;
	const flag = env.VITE_QUESTER_USE_MOCK?.toLowerCase();
	return flag === "1" || flag === "true";
}

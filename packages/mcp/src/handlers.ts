import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import {
	CookieJar,
	type ExecuteFlowResult,
	FlowCancelledError,
	FlowExecutionError,
	RunFileLogger,
	collectSecretValues,
	createExecuteSubflow,
	createHttpFetch,
	createRunDirName,
	executeFlow,
	loadSecrets,
	loadWorkspace,
	redactForRunLog,
} from "@quester-studio/engine";
import {
	type FlowV1,
	isCookieJarEnabled,
	isSafeWorkspaceFileId,
	mergeHttpSettings,
	validateFlow,
} from "@quester-studio/schema";
import { describeValueForAgent } from "./json-shape.js";
import {
	assertSafeFlowId,
	isPathInside,
	resolveRunRelativePath,
	resolveRunsRoot,
} from "./path-safety.js";

export type LastRunSnapshot = {
	flowId: string;
	ok: boolean;
	cancelled?: boolean;
	error?: string;
	failedNodeId?: string;
	failedNodeType?: string;
	runDir?: string;
	output?: unknown;
	steps: ExecuteFlowResult["steps"];
	nodeOutputs?: Record<string, unknown>;
	env?: string;
	finishedAt: string;
	/** Secret strings used to redact if agent opts into values. */
	secretValues: string[];
};

export type McpWorkspaceContext = {
	workspaceRoot: string;
	/** In-session last-run map (redacted), keyed by flow id. */
	lastRuns: Map<string, LastRunSnapshot>;
};

export function createMcpWorkspaceContext(
	workspaceRoot: string,
): McpWorkspaceContext {
	return {
		workspaceRoot: resolve(workspaceRoot),
		lastRuns: new Map(),
	};
}

function toolJson(data: unknown): {
	content: Array<{ type: "text"; text: string }>;
} {
	return {
		content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
	};
}

function toolError(message: string): {
	content: Array<{ type: "text"; text: string }>;
	isError: true;
} {
	return {
		content: [{ type: "text", text: message }],
		isError: true,
	};
}

async function resolveRunLogger(options: {
	workspaceRoot: string;
	manifestRuns?: { enabled?: boolean; dir?: string } | null;
	flow: FlowV1;
	env?: string;
	secrets?: Record<string, unknown>;
}): Promise<RunFileLogger | undefined> {
	const runs = options.manifestRuns;
	const enabled = Boolean(runs?.enabled);
	if (!enabled) return undefined;
	const relativeDir = runs?.dir ?? "runs";
	const runsRoot = resolveRunsRoot(options.workspaceRoot, relativeDir);
	const runDir = join(runsRoot, options.flow.id, createRunDirName());
	await mkdir(runDir, { recursive: true });
	const logger = new RunFileLogger({
		runDir,
		secretValues: collectSecretValues(options.secrets),
		meta: {
			flowId: options.flow.id,
			flowName: options.flow.name,
			env: options.env,
			startedAt: new Date().toISOString(),
			status: "running",
		},
	});
	await logger.init();
	return logger;
}

function snapshotFromResult(
	flowId: string,
	env: string | undefined,
	result: ExecuteFlowResult,
	secretValues: string[],
): LastRunSnapshot {
	return {
		flowId,
		ok: true,
		runDir: result.runDir,
		output: redactForRunLog(result.output, secretValues),
		steps: redactForRunLog(
			result.steps,
			secretValues,
		) as ExecuteFlowResult["steps"],
		nodeOutputs: redactForRunLog(result.nodeOutputs, secretValues) as Record<
			string,
			unknown
		>,
		env,
		finishedAt: new Date().toISOString(),
		secretValues,
	};
}

function snapshotFromFailure(
	flowId: string,
	env: string | undefined,
	error: FlowExecutionError | FlowCancelledError,
	secretValues: string[],
): LastRunSnapshot {
	const cancelled = error instanceof FlowCancelledError;
	return {
		flowId,
		ok: false,
		cancelled: cancelled || undefined,
		error: error.message,
		failedNodeId:
			error instanceof FlowExecutionError ? error.failedNodeId : undefined,
		failedNodeType:
			error instanceof FlowExecutionError ? error.failedNodeType : undefined,
		runDir: error.partial.runDir,
		steps: redactForRunLog(
			error.partial.steps,
			secretValues,
		) as ExecuteFlowResult["steps"],
		nodeOutputs: redactForRunLog(
			error.partial.nodeOutputs,
			secretValues,
		) as Record<string, unknown>,
		env,
		finishedAt: new Date().toISOString(),
		secretValues,
	};
}

export async function listFlowsTool(ctx: McpWorkspaceContext) {
	try {
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flows = Object.values(ws.flows).map((f) => ({
			id: f.id,
			name: f.name ?? f.id,
		}));
		return toolJson({ workspace: ctx.workspaceRoot, flows });
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function readFlowTool(
	ctx: McpWorkspaceContext,
	args: { flowId: string },
) {
	try {
		assertSafeFlowId(args.flowId);
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flow = ws.flows[args.flowId];
		if (!flow) return toolError(`Flow not found: ${args.flowId}`);
		return toolJson(flow);
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function validateFlowTool(
	ctx: McpWorkspaceContext,
	args: { flowId?: string; flow?: unknown },
) {
	try {
		let raw: unknown = args.flow;
		if (raw === undefined) {
			if (!args.flowId) {
				return toolError("Provide flowId or flow JSON");
			}
			assertSafeFlowId(args.flowId);
			const ws = await loadWorkspace(ctx.workspaceRoot);
			raw = ws.flows[args.flowId];
			if (!raw) return toolError(`Flow not found: ${args.flowId}`);
		}
		const result = validateFlow(raw);
		if (!result.success) {
			return toolJson({
				ok: false,
				error: result.error,
				issues: result.issues ?? [],
			});
		}
		return toolJson({ ok: true, flowId: result.data.id });
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function runFlowTool(
	ctx: McpWorkspaceContext,
	args: { flowId: string; env?: string; input?: unknown },
) {
	try {
		assertSafeFlowId(args.flowId);
		const envName = args.env ?? "local";
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flowData = ws.flows[args.flowId];
		if (!flowData) return toolError(`Flow not found: ${args.flowId}`);
		const validated = validateFlow(flowData);
		if (!validated.success) return toolError(validated.error);

		const envVars = ws.environments[envName]?.variables ?? {};
		const secrets = await loadSecrets(
			ctx.workspaceRoot,
			envName,
			ws.manifest.environmentsDir,
		);
		const secretValues = collectSecretValues(secrets);
		const input = args.input ?? {};
		const httpDefaults = mergeHttpSettings(
			ws.manifest.settings?.http,
			validated.data.settings?.http,
		);
		const fetchImpl = createHttpFetch({
			httpDefaults,
			workspaceRoot: ctx.workspaceRoot,
		});
		const cookieJar = isCookieJarEnabled(httpDefaults)
			? new CookieJar()
			: undefined;
		const { createCallMcpTool, mcpServersFromSettings } = await import(
			"./create-call.js"
		);
		const callMcpTool = createCallMcpTool(
			mcpServersFromSettings(ws.manifest.settings?.mcp),
		);
		const executeSubflow = createExecuteSubflow(
			{ getFlow: (id) => ws.flows[id] },
			{
				env: envVars,
				secrets,
				httpDefaults,
				fetch: fetchImpl,
				cookieJar,
				callMcpTool,
			},
			validated.data.id,
		);
		const runLogger = await resolveRunLogger({
			workspaceRoot: ctx.workspaceRoot,
			manifestRuns: ws.manifest.runs,
			flow: validated.data,
			env: envName,
			secrets,
		});

		try {
			const result = await executeFlow(validated.data, {
				input,
				env: envVars,
				secrets,
				httpDefaults,
				fetch: fetchImpl,
				cookieJar,
				executeSubflow,
				callMcpTool,
				runLogger,
			});
			const snap = snapshotFromResult(
				validated.data.id,
				envName,
				result,
				secretValues,
			);
			ctx.lastRuns.set(validated.data.id, snap);
			return toolJson({
				ok: true,
				flowId: validated.data.id,
				env: envName,
				steps: snap.steps.map((s) => ({
					nodeId: s.nodeId,
					type: s.type,
					error: s.error ?? null,
				})),
				outputShape: describeValueForAgent(snap.output),
				runDir: snap.runDir,
				privacy:
					"Output bodies omitted — TypeScript/JSON Schema shapes only. Use inspect_last_run with includeValues=true for redacted samples. Secrets are never returned.",
			});
		} catch (error) {
			if (
				error instanceof FlowExecutionError ||
				error instanceof FlowCancelledError
			) {
				const snap = snapshotFromFailure(
					validated.data.id,
					envName,
					error,
					secretValues,
				);
				ctx.lastRuns.set(validated.data.id, snap);
				return toolJson({
					ok: false,
					flowId: validated.data.id,
					env: envName,
					error: snap.error,
					failedNodeId: snap.failedNodeId,
					failedNodeType: snap.failedNodeType,
					cancelled: snap.cancelled,
					steps: snap.steps.map((s) => ({
						nodeId: s.nodeId,
						type: s.type,
						error: s.error ?? null,
					})),
					outputShape: describeValueForAgent(
						snap.nodeOutputs?.[snap.failedNodeId ?? ""] ?? snap.output,
					),
					runDir: snap.runDir,
					privacy:
						"Output bodies omitted — shapes only. Secrets are never returned.",
				});
			}
			throw error;
		}
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

async function loadNewestDiskRun(
	ctx: McpWorkspaceContext,
	flowId: string,
): Promise<LastRunSnapshot | null> {
	const ws = await loadWorkspace(ctx.workspaceRoot);
	const runsRoot = resolveRunsRoot(
		ctx.workspaceRoot,
		ws.manifest.runs?.dir ?? "runs",
	);
	const flowRunsDir = join(runsRoot, flowId);
	if (!existsSync(flowRunsDir) || !isPathInside(runsRoot, flowRunsDir)) {
		return null;
	}
	const runDirs = (await readdir(flowRunsDir, { withFileTypes: true }))
		.filter((d) => d.isDirectory() && d.name !== "." && d.name !== "..")
		.map((d) => d.name)
		.sort((a, b) => b.localeCompare(a));
	const newest = runDirs[0];
	if (!newest) return null;
	const runPath = join(flowRunsDir, newest);
	const metaPath = join(runPath, "meta.json");
	let meta: Record<string, unknown> = {};
	if (existsSync(metaPath)) {
		meta = JSON.parse(await readFile(metaPath, "utf8")) as Record<
			string,
			unknown
		>;
	}
	const files = (await readdir(runPath))
		.filter((n) => n.endsWith(".json") && n !== "meta.json")
		.sort();
	const steps: ExecuteFlowResult["steps"] = [];
	const nodeOutputs: Record<string, unknown> = {};
	for (const name of files) {
		const abs = join(runPath, name);
		if (!isPathInside(runsRoot, abs)) continue;
		const rel = relative(runsRoot, abs).split(sep).join("/");
		resolveRunRelativePath(runsRoot, rel);
		const step = JSON.parse(await readFile(abs, "utf8")) as {
			nodeId?: string;
			type?: string;
			input?: unknown;
			output?: unknown;
			error?: string | null;
		};
		if (!step.nodeId || !step.type) continue;
		steps.push({
			nodeId: step.nodeId,
			type: step.type,
			input: step.input,
			output: step.output,
			error: step.error ?? undefined,
		});
		if (step.output !== undefined) nodeOutputs[step.nodeId] = step.output;
	}
	const status = meta.status;
	const ok = status === "success";
	return {
		flowId,
		ok,
		cancelled: status === "cancelled" || undefined,
		error: typeof meta.error === "string" ? meta.error : undefined,
		failedNodeId:
			typeof meta.failedNodeId === "string" ? meta.failedNodeId : undefined,
		runDir: runPath,
		steps,
		nodeOutputs,
		env: typeof meta.env === "string" ? meta.env : undefined,
		finishedAt:
			typeof meta.finishedAt === "string"
				? meta.finishedAt
				: new Date().toISOString(),
		secretValues: [],
	};
}

export async function inspectLastRunTool(
	ctx: McpWorkspaceContext,
	args: { flowId?: string; nodeId?: string; includeValues?: boolean },
) {
	try {
		const flowId = args.flowId;
		if (flowId) assertSafeFlowId(flowId);
		const includeValues = args.includeValues === true;

		let snap: LastRunSnapshot | undefined | null;
		if (flowId) {
			snap = ctx.lastRuns.get(flowId) ?? (await loadNewestDiskRun(ctx, flowId));
		} else {
			const entries = [...ctx.lastRuns.values()].sort((a, b) =>
				b.finishedAt.localeCompare(a.finishedAt),
			);
			snap = entries[0];
			if (!snap) {
				const ws = await loadWorkspace(ctx.workspaceRoot);
				for (const id of Object.keys(ws.flows)) {
					const disk = await loadNewestDiskRun(ctx, id);
					if (
						disk &&
						(!snap || disk.finishedAt.localeCompare(snap.finishedAt) > 0)
					) {
						snap = disk;
					}
				}
			}
		}

		if (!snap) {
			return toolError(
				flowId
					? `No last run found for flow: ${flowId}`
					: "No last run found in session or on disk",
			);
		}

		const secrets = snap.secretValues ?? [];

		if (args.nodeId) {
			const step = snap.steps.find((s) => s.nodeId === args.nodeId);
			const rawOut = snap.nodeOutputs?.[args.nodeId] ?? step?.output;
			const rawIn = step?.input;
			if (!step && rawOut === undefined) {
				return toolError(`Node not found in last run: ${args.nodeId}`);
			}
			return toolJson({
				flowId: snap.flowId,
				nodeId: args.nodeId,
				type: step?.type,
				error: step?.error ?? null,
				ok: snap.ok,
				runDir: snap.runDir,
				input: describeValueForAgent(rawIn, {
					includeValues,
					secretValues: secrets,
				}),
				output: describeValueForAgent(rawOut, {
					includeValues,
					secretValues: secrets,
				}),
				privacy: includeValues
					? "Values redacted (secrets + sensitive keys). Prefer shapes for prompts."
					: "Shapes/paths only — pass includeValues=true for redacted samples.",
			});
		}

		const nodeShapes: Record<string, unknown> = {};
		for (const [id, out] of Object.entries(snap.nodeOutputs ?? {})) {
			nodeShapes[id] = describeValueForAgent(out, {
				includeValues,
				secretValues: secrets,
			});
		}

		return toolJson({
			flowId: snap.flowId,
			ok: snap.ok,
			cancelled: snap.cancelled,
			error: snap.error,
			failedNodeId: snap.failedNodeId,
			failedNodeType: snap.failedNodeType,
			env: snap.env,
			runDir: snap.runDir,
			finishedAt: snap.finishedAt,
			steps: snap.steps.map((s) => ({
				nodeId: s.nodeId,
				type: s.type,
				error: s.error ?? null,
			})),
			output: describeValueForAgent(snap.output, {
				includeValues,
				secretValues: secrets,
			}),
			nodeOutputs: nodeShapes,
			privacy: includeValues
				? "Values redacted (secrets + sensitive keys)."
				: "Shapes/paths only — pass includeValues=true for redacted samples. Secrets are never returned.",
		});
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

/** RFC 7396 JSON Merge Patch */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
	if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
		return patch;
	}
	const base =
		target && typeof target === "object" && !Array.isArray(target)
			? { ...(target as Record<string, unknown>) }
			: {};
	const p = patch as Record<string, unknown>;
	for (const [key, value] of Object.entries(p)) {
		if (value === null) {
			delete base[key];
		} else if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			base[key] &&
			typeof base[key] === "object" &&
			!Array.isArray(base[key])
		) {
			base[key] = applyMergePatch(base[key], value);
		} else {
			base[key] = applyMergePatch(base[key], value);
		}
	}
	return base;
}

async function writeFlowFile(
	ctx: McpWorkspaceContext,
	flow: FlowV1,
): Promise<FlowV1> {
	assertSafeFlowId(flow.id);
	const ws = await loadWorkspace(ctx.workspaceRoot);
	const flowsDir = join(ctx.workspaceRoot, ws.manifest.flowsDir);
	if (!isPathInside(ctx.workspaceRoot, flowsDir)) {
		throw new Error("Invalid flows directory");
	}
	const filePath = join(flowsDir, `${flow.id}.flow.json`);
	if (!isPathInside(ctx.workspaceRoot, filePath)) {
		throw new Error("Flow path outside workspace");
	}
	await mkdir(flowsDir, { recursive: true });
	await writeFile(filePath, `${JSON.stringify(flow, null, 2)}\n`, "utf8");
	return flow;
}

export async function saveFlowTool(
	ctx: McpWorkspaceContext,
	args: { flow: unknown },
) {
	try {
		const validated = validateFlow(args.flow);
		if (!validated.success) {
			return toolJson({
				ok: false,
				error: validated.error,
				issues: validated.issues ?? [],
			});
		}
		const saved = await writeFlowFile(ctx, validated.data);
		return toolJson({ ok: true, flowId: saved.id, flow: saved });
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function patchFlowTool(
	ctx: McpWorkspaceContext,
	args: { flowId: string; patch: unknown },
) {
	try {
		assertSafeFlowId(args.flowId);
		if (!isSafeWorkspaceFileId(args.flowId)) {
			return toolError(`Invalid flow id: ${args.flowId}`);
		}
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const existing = ws.flows[args.flowId];
		if (!existing) return toolError(`Flow not found: ${args.flowId}`);
		const merged = applyMergePatch(existing, args.patch);
		const validated = validateFlow(merged);
		if (!validated.success) {
			return toolJson({
				ok: false,
				error: validated.error,
				issues: validated.issues ?? [],
			});
		}
		if (validated.data.id !== args.flowId) {
			return toolError(
				`patch must not change flow id (expected ${args.flowId}, got ${validated.data.id})`,
			);
		}
		const saved = await writeFlowFile(ctx, validated.data);
		return toolJson({ ok: true, flowId: saved.id, flow: saved });
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

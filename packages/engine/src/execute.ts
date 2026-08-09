import {
	AssertNodeError,
	CookieJar,
	HttpNodeError,
	getNodePlugin,
} from "@quester-studio/nodes";
import type { FlowV1, HttpSettingsV1 } from "@quester-studio/schema";
import { isCookieJarEnabled } from "@quester-studio/schema";
import "@quester-studio/nodes";
import { EngineEventEmitter } from "./events.js";
import { isNodeReady, selectNextEdges, topologicalSort } from "./graph.js";
import { type RunFileLogger, resolveTemplateDeep } from "./run-log.js";
import { resolveTemplate } from "./variables.js";

export type ExecuteFlowOptions = {
	input?: unknown;
	env?: Record<string, unknown>;
	secrets?: Record<string, unknown>;
	vars?: Record<string, unknown>;
	fetch?: typeof fetch;
	events?: EngineEventEmitter;
	/** When aborted, execution stops between nodes and in-flight HTTP requests. */
	signal?: AbortSignal;
	/** Resolved HTTP defaults (workspace→flow already merged by caller). */
	httpDefaults?: HttpSettingsV1;
	/** Optional shared jar; created automatically when cookie jar is enabled. */
	cookieJar?: CookieJar;
	/** Run another workspace flow by id (recursive; depth/cycle guarded by caller). */
	executeSubflow?: (flowId: string, input: unknown) => Promise<unknown>;
	/** When set, write incremental per-step JSON under this logger's runDir. */
	runLogger?: RunFileLogger;
};

export type NodeStepResult = {
	nodeId: string;
	type: string;
	input: unknown;
	processedInput?: unknown;
	output: unknown;
	error?: string;
};

export type ExecuteFlowResult = {
	output: unknown;
	nodeOutputs: Record<string, unknown>;
	nodeInputs: Record<string, unknown>;
	steps: NodeStepResult[];
	vars: Record<string, unknown>;
	/** Absolute path to on-disk run folder when file logging was enabled. */
	runDir?: string;
};

export class FlowExecutionError extends Error {
	readonly partial: ExecuteFlowResult;
	readonly failedNodeId: string;
	readonly failedNodeType: string;

	constructor(
		message: string,
		options: {
			partial: ExecuteFlowResult;
			failedNodeId: string;
			failedNodeType: string;
			cause?: unknown;
		},
	) {
		super(message);
		this.name = "FlowExecutionError";
		this.partial = options.partial;
		this.failedNodeId = options.failedNodeId;
		this.failedNodeType = options.failedNodeType;
	}
}

export class FlowCancelledError extends Error {
	readonly partial: ExecuteFlowResult;

	constructor(message: string, options: { partial: ExecuteFlowResult }) {
		super(message);
		this.name = "FlowCancelledError";
		this.partial = options.partial;
	}
}

function mergeFetchSignal(
	baseFetch: typeof fetch,
	signal?: AbortSignal,
): typeof fetch {
	if (!signal) return baseFetch;
	return ((input: RequestInfo | URL, init?: RequestInit) => {
		const mergedSignal = init?.signal
			? AbortSignal.any([signal, init.signal])
			: signal;
		return baseFetch(input, { ...init, signal: mergedSignal });
	}) as typeof fetch;
}

function buildPartialResult(
	flow: FlowV1,
	nodeOutputs: Record<string, unknown>,
	nodeInputs: Record<string, unknown>,
	steps: NodeStepResult[],
	vars: Record<string, unknown>,
	lastOutput: unknown,
	runDir?: string,
): ExecuteFlowResult {
	const outputNode = flow.nodes.find((n) => n.type === "output");
	const output = outputNode ? nodeOutputs[outputNode.id] : lastOutput;
	return { output, nodeOutputs, nodeInputs, steps, vars, runDir };
}

function throwIfAborted(
	signal: AbortSignal | undefined,
	partial: ExecuteFlowResult,
): void {
	if (signal?.aborted) {
		throw new FlowCancelledError("Flow run cancelled", { partial });
	}
}

export async function executeFlow(
	flow: FlowV1,
	options: ExecuteFlowOptions = {},
): Promise<ExecuteFlowResult> {
	const events = options.events ?? new EngineEventEmitter();
	const fetchFn = mergeFetchSignal(options.fetch ?? fetch, options.signal);
	const flowInput = options.input ?? {};
	let vars = { ...(options.vars ?? {}) };
	const nodeOutputs: Record<string, unknown> = {};
	const nodeInputs: Record<string, unknown> = {};
	const steps: NodeStepResult[] = [];
	const order = topologicalSort(flow);
	const executed = new Set<string>();
	const branchTaken = new Map<string, string | undefined>();
	const pending = new Set<string>();
	const startNodes = order.filter((n) => n.type === "start");
	const queue: string[] = startNodes.map((n) => n.id);
	if (queue.length === 0 && order[0]) queue.push(order[0].id);

	const cookieJar =
		options.cookieJar ??
		(isCookieJarEnabled(options.httpDefaults) ? new CookieJar() : undefined);

	const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
	let lastOutput: unknown = {};
	const runLogger = options.runLogger;
	const runDir = runLogger?.runDir;

	const enqueueReady = () => {
		for (const target of [...pending]) {
			if (executed.has(target) || queue.includes(target)) {
				pending.delete(target);
				continue;
			}
			if (isNodeReady(flow, target, executed, branchTaken)) {
				queue.push(target);
				pending.delete(target);
			}
		}
	};

	const partial = () =>
		buildPartialResult(
			flow,
			nodeOutputs,
			nodeInputs,
			steps,
			vars,
			lastOutput,
			runDir,
		);

	while (queue.length > 0) {
		throwIfAborted(options.signal, partial());

		const nodeId = queue.shift();
		if (!nodeId || executed.has(nodeId)) continue;
		if (!isNodeReady(flow, nodeId, executed, branchTaken)) {
			pending.add(nodeId);
			continue;
		}
		const node = nodeById.get(nodeId);
		if (!node) continue;

		throwIfAborted(options.signal, partial());

		const plugin = getNodePlugin(node.type);
		if (!plugin) {
			throw new Error(`No plugin registered for node type: ${node.type}`);
		}

		const incoming = flow.edges.filter((e) => e.target === nodeId);
		let input: unknown = lastOutput;
		if (incoming.length > 0) {
			const completedPreds = steps
				.map((s) => s.nodeId)
				.filter((id) => incoming.some((e) => e.source === id));
			const src = completedPreds.at(-1) ?? incoming[0]?.source;
			if (src && nodeOutputs[src] !== undefined) input = nodeOutputs[src];
		}
		if (node.type === "input") input = flowInput;

		const resolverCtx = {
			env: options.env ?? {},
			secrets: options.secrets ?? {},
			input: flowInput,
			vars,
			nodeOutputs,
		};
		const resolveTpl = (t: string) => resolveTemplate(t, resolverCtx);

		nodeInputs[node.id] = input;
		events.emit("node:before", {
			nodeId: node.id,
			type: node.type,
			input,
		});
		try {
			const result = await plugin.execute({
				node,
				input,
				flowInput,
				vars,
				nodeOutputs,
				resolveTemplate: resolveTpl,
				fetch: fetchFn,
				httpDefaults: options.httpDefaults,
				cookieJar,
				signal: options.signal,
				executeSubflow: options.executeSubflow,
			});
			if (result.vars) vars = { ...vars, ...result.vars };
			nodeOutputs[node.id] = result.output;
			lastOutput = result.output;
			executed.add(node.id);
			const processedInput =
				result.processedInput ??
				resolveTemplateDeep(node.data ?? {}, resolveTpl);
			const step: NodeStepResult = {
				nodeId: node.id,
				type: node.type,
				input,
				processedInput,
				output: result.output,
			};
			steps.push(step);
			if (runLogger) {
				await runLogger.writeStep({
					nodeId: step.nodeId,
					type: step.type,
					input: step.input,
					processedInput: step.processedInput,
					output: step.output,
					error: null,
				});
			}
			events.emit("node:after", {
				nodeId: node.id,
				type: node.type,
				input,
				processedInput,
				output: result.output,
			});

			branchTaken.set(node.id, result.branch);
			for (const edge of selectNextEdges(flow, node, result.branch)) {
				if (!executed.has(edge.target)) pending.add(edge.target);
			}
			enqueueReady();
		} catch (error) {
			if (options.signal?.aborted) {
				if (runLogger) {
					await runLogger.finish({ status: "cancelled" });
				}
				throw new FlowCancelledError("Flow run cancelled", {
					partial: partial(),
				});
			}
			const message = error instanceof Error ? error.message : String(error);
			const processedInput =
				error instanceof HttpNodeError
					? error.request
					: resolveTemplateDeep(node.data ?? {}, resolveTpl);
			events.emit("node:error", {
				nodeId: node.id,
				type: node.type,
				input,
				processedInput,
				error,
			});
			const partialOutput =
				error instanceof HttpNodeError
					? { request: error.request }
					: error instanceof AssertNodeError
						? error.output
						: undefined;
			const step: NodeStepResult = {
				nodeId: node.id,
				type: node.type,
				input,
				processedInput,
				output: partialOutput,
				error: message,
			};
			steps.push(step);
			if (runLogger) {
				await runLogger.writeStep({
					nodeId: step.nodeId,
					type: step.type,
					input: step.input,
					processedInput: step.processedInput,
					output: step.output,
					error: message,
				});
				await runLogger.finish({
					status: "failed",
					failedNodeId: node.id,
					error: message,
				});
			}
			throw new FlowExecutionError(message, {
				partial: {
					output: undefined,
					nodeOutputs,
					nodeInputs,
					steps,
					vars,
					runDir,
				},
				failedNodeId: node.id,
				failedNodeType: node.type,
				cause: error,
			});
		}
	}

	const outputNode = flow.nodes.find((n) => n.type === "output");
	const output = outputNode ? nodeOutputs[outputNode.id] : lastOutput;
	if (runLogger) {
		await runLogger.finish({ status: "success" });
	}
	events.emit("flow:complete", { output });
	return { output, nodeOutputs, nodeInputs, steps, vars, runDir };
}

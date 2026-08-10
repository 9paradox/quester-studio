import {
	AssertNodeError,
	CookieJar,
	HttpNodeError,
	getNodePlugin,
	mapWithConcurrency,
	resolveForeachItems,
} from "@quester-studio/nodes";
import {
	type FlowNodeV1,
	type FlowV1,
	type FormV1,
	type HttpSettingsV1,
	foreachNodeDataSchema,
	isCookieJarEnabled,
	tryNodeDataSchema,
} from "@quester-studio/schema";
import "@quester-studio/nodes";
import { EngineEventEmitter } from "./events.js";
import { buildBodyFlow, frameEntryTargets, frameExitSources } from "./frame.js";
import {
	isFrameContainer,
	isNodeReady,
	selectNextEdges,
	topologicalSort,
} from "./graph.js";
import { type RunFileLogger, resolveTemplateDeep } from "./run-log.js";
import {
	type ResolverContext,
	resolveTemplate,
	resolveTemplateValue,
} from "./variables.js";

export type AwaitFormFn = NonNullable<
	import("@quester-studio/nodes").NodeExecutionContext["awaitForm"]
>;

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
	/**
	 * Pre-supplied form submissions keyed by form **node id** (CLI / automation).
	 * Used when `awaitForm` is not provided.
	 */
	formInputs?: Record<string, unknown>;
	/** Desktop / custom host: pause until the user submits the form. */
	awaitForm?: AwaitFormFn;
	/** Load a workspace form by id (required for form nodes). */
	getForm?: (formId: string) => Promise<FormV1>;
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

/** Wire input for the next node; `join` gets a collect-map of predecessor outputs. */
function resolveExecuteInput(options: {
	nodeType: string;
	fallback: unknown;
	incomingSources: readonly string[];
	completedPreds: readonly string[];
	nodeOutputs: Record<string, unknown>;
}): unknown {
	const { nodeType, fallback, incomingSources, completedPreds, nodeOutputs } =
		options;
	if (incomingSources.length === 0) return fallback;
	if (nodeType === "join") {
		const map: Record<string, unknown> = {};
		for (const id of incomingSources) {
			if (nodeOutputs[id] !== undefined) map[id] = nodeOutputs[id];
		}
		return map;
	}
	const src = completedPreds.at(-1) ?? incomingSources[0];
	if (src && nodeOutputs[src] !== undefined) return nodeOutputs[src];
	return fallback;
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
	const outputNode = flow.nodes.find((n) => n.type === "output" && !n.parentId);
	const output = outputNode ? nodeOutputs[outputNode.id] : lastOutput;
	return { output, nodeOutputs, nodeInputs, steps, vars, runDir };
}

async function abortIfRequested(
	signal: AbortSignal | undefined,
	runLogger: RunFileLogger | undefined,
	partial: () => ExecuteFlowResult,
): Promise<void> {
	if (!signal?.aborted) return;
	if (runLogger) {
		await runLogger.finish({ status: "cancelled" });
	}
	throw new FlowCancelledError("Flow run cancelled", { partial: partial() });
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException("Flow run cancelled", "AbortError");
	}
}

type Runtime = {
	flow: FlowV1;
	options: ExecuteFlowOptions;
	events: EngineEventEmitter;
	fetchFn: typeof fetch;
	flowInput: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	nodeInputs: Record<string, unknown>;
	steps: NodeStepResult[];
	cookieJar: CookieJar | undefined;
	runLogger: RunFileLogger | undefined;
	runDir: string | undefined;
	nodeById: Map<string, FlowNodeV1>;
	lastOutput: unknown;
	loop?: Record<string, unknown>;
	/** Prefix for step nodeIds in nested/foreach iterations. */
	stepPrefix: string;
	/** When true, node errors do not finish the run log (caught by try frame). */
	suppressFailFinish: boolean;
};

function makeResolveTpl(rt: Runtime): (t: string) => string {
	const ctx: ResolverContext = {
		env: rt.options.env ?? {},
		secrets: rt.options.secrets ?? {},
		input: rt.flowInput,
		vars: rt.vars,
		nodeOutputs: rt.nodeOutputs,
		loop: rt.loop,
	};
	return (t: string) => resolveTemplate(t, ctx);
}

function makeResolveValue(rt: Runtime): (t: string) => unknown {
	const ctx: ResolverContext = {
		env: rt.options.env ?? {},
		secrets: rt.options.secrets ?? {},
		input: rt.flowInput,
		vars: rt.vars,
		nodeOutputs: rt.nodeOutputs,
		loop: rt.loop,
	};
	return (t: string) => resolveTemplateValue(t, ctx);
}

function defaultAwaitForm(
	formInputs: Record<string, unknown> | undefined,
	signal: AbortSignal | undefined,
): AwaitFormFn {
	return async (req) => {
		if (signal?.aborted) {
			throw new DOMException("Flow run cancelled", "AbortError");
		}
		if (!formInputs || !Object.hasOwn(formInputs, req.nodeId)) {
			throw new Error(
				`Form "${req.formId}" at node "${req.nodeId}" requires --forms / formInputs["${req.nodeId}"]`,
			);
		}
		return formInputs[req.nodeId];
	};
}

function stepId(rt: Runtime, nodeId: string): string {
	return rt.stepPrefix ? `${rt.stepPrefix}${nodeId}` : nodeId;
}

async function runBodyOnce(
	rt: Runtime,
	container: FlowNodeV1,
	containerInput: unknown,
): Promise<unknown> {
	const bodyFlow = buildBodyFlow(rt.flow, container.id);
	const entryTargets = frameEntryTargets(rt.flow, container, rt.nodeById);
	const exitSources = frameExitSources(rt.flow, container, rt.nodeById);
	if (entryTargets.length === 0) {
		throw new Error(`Frame "${container.id}" has no entry edges`);
	}

	const executed = new Set<string>();
	const branchTaken = new Map<string, string | undefined>();
	const pending = new Set<string>();
	const queue = [...entryTargets];
	let bodyLastOutput: unknown = containerInput;
	let exitOutput: unknown = containerInput;
	let sawExit = false;

	const enqueueReady = () => {
		for (const target of [...pending]) {
			if (executed.has(target) || queue.includes(target)) {
				pending.delete(target);
				continue;
			}
			if (isNodeReady(bodyFlow, target, executed, branchTaken)) {
				queue.push(target);
				pending.delete(target);
			}
		}
	};

	while (queue.length > 0) {
		await abortIfRequested(rt.options.signal, rt.runLogger, () =>
			buildPartialResult(
				rt.flow,
				rt.nodeOutputs,
				rt.nodeInputs,
				rt.steps,
				rt.vars,
				rt.lastOutput,
				rt.runDir,
			),
		);

		const nodeId = queue.shift();
		if (!nodeId || executed.has(nodeId)) continue;
		if (
			!entryTargets.includes(nodeId) &&
			!isNodeReady(bodyFlow, nodeId, executed, branchTaken)
		) {
			pending.add(nodeId);
			continue;
		}
		const node = rt.nodeById.get(nodeId);
		if (!node) continue;

		let input: unknown = bodyLastOutput;
		if (entryTargets.includes(nodeId)) {
			input = containerInput;
		} else {
			const incoming = bodyFlow.edges.filter((e) => e.target === nodeId);
			if (incoming.length > 0) {
				const incomingSources = incoming.map((e) => e.source);
				const completedPreds = incomingSources.filter((id) => executed.has(id));
				input = resolveExecuteInput({
					nodeType: node.type,
					fallback: bodyLastOutput,
					incomingSources,
					completedPreds,
					nodeOutputs: rt.nodeOutputs,
				});
			}
		}

		const { output, branch } = await executeOneNode(rt, node, input);
		bodyLastOutput = output;
		executed.add(node.id);
		branchTaken.set(node.id, branch);

		if (exitSources.has(node.id)) {
			exitOutput = output;
			sawExit = true;
		}

		for (const edge of selectNextEdges(bodyFlow, node, branch)) {
			if (!executed.has(edge.target)) pending.add(edge.target);
		}
		enqueueReady();
	}

	if (!sawExit) {
		throw new Error(
			`Frame "${container.id}" finished without reaching an exit edge`,
		);
	}
	return exitOutput;
}

async function executeContainer(
	rt: Runtime,
	container: FlowNodeV1,
	containerInput: unknown,
): Promise<{ output: unknown; branch?: string }> {
	if (container.type === "try") {
		tryNodeDataSchema.parse(container.data);
		const prevSuppress = rt.suppressFailFinish;
		rt.suppressFailFinish = true;
		try {
			const output = await runBodyOnce(rt, container, containerInput);
			return { output, branch: "success" };
		} catch (error) {
			if (
				error instanceof FlowCancelledError ||
				(error instanceof DOMException && error.name === "AbortError") ||
				rt.options.signal?.aborted
			) {
				throw error;
			}
			const message = error instanceof Error ? error.message : String(error);
			return {
				output: {
					failed: true,
					error: message,
					input: containerInput,
				},
				branch: "failed",
			};
		} finally {
			rt.suppressFailFinish = prevSuppress;
		}
	}

	if (container.type === "foreach") {
		const data = foreachNodeDataSchema.parse(container.data);
		const resolveTpl = makeResolveTpl(rt);
		const rawItems = resolveForeachItems(
			data.items,
			containerInput,
			resolveTpl,
		);
		const capped = rawItems.slice(0, data.maxItems);
		const itemVar = data.itemVar ?? "item";
		const concurrency = data.concurrency ?? 1;

		const runItem = async (item: unknown, index: number): Promise<unknown> => {
			throwIfAborted(rt.options.signal);
			const itemRt: Runtime = {
				...rt,
				loop: { [itemVar]: item, item, index },
				stepPrefix: `${rt.stepPrefix}${container.id}[${index}]/`,
				// Isolate per-iteration node outputs for body nodes; keep outer outputs
				nodeOutputs: { ...rt.nodeOutputs },
			};
			return runBodyOnce(itemRt, container, containerInput);
		};

		const results =
			concurrency <= 1
				? await (async () => {
						const out: unknown[] = [];
						for (let i = 0; i < capped.length; i += 1) {
							out.push(await runItem(capped[i], i));
						}
						return out;
					})()
				: await mapWithConcurrency(
						capped,
						concurrency,
						runItem,
						rt.options.signal,
					);

		// Merge vars from last sequential path; parallel already mutated shared rt.vars
		return {
			output: {
				results,
				count: results.length,
				truncated: rawItems.length > data.maxItems,
			},
			branch: "complete",
		};
	}

	throw new Error(`Unknown frame container type: ${container.type}`);
}

async function executeOneNode(
	rt: Runtime,
	node: FlowNodeV1,
	input: unknown,
): Promise<{ output: unknown; branch?: string }> {
	await abortIfRequested(rt.options.signal, rt.runLogger, () =>
		buildPartialResult(
			rt.flow,
			rt.nodeOutputs,
			rt.nodeInputs,
			rt.steps,
			rt.vars,
			rt.lastOutput,
			rt.runDir,
		),
	);

	const resolveTpl = makeResolveTpl(rt);
	rt.nodeInputs[node.id] = input;
	rt.events.emit("node:before", {
		nodeId: node.id,
		type: node.type,
		input,
	});

	try {
		let output: unknown;
		let branch: string | undefined;
		let processedInput: unknown;

		if (isFrameContainer(node)) {
			const result = await executeContainer(rt, node, input);
			output = result.output;
			branch = result.branch;
			processedInput = resolveTemplateDeep(node.data ?? {}, resolveTpl);
		} else {
			const plugin = getNodePlugin(node.type);
			if (!plugin) {
				throw new Error(`No plugin registered for node type: ${node.type}`);
			}
			const resolveValue = makeResolveValue(rt);
			const awaitForm =
				rt.options.awaitForm ??
				defaultAwaitForm(rt.options.formInputs, rt.options.signal);
			const result = await plugin.execute({
				node,
				input,
				flowInput: rt.flowInput,
				vars: rt.vars,
				nodeOutputs: rt.nodeOutputs,
				resolveTemplate: resolveTpl,
				resolveValue,
				fetch: rt.fetchFn,
				httpDefaults: rt.options.httpDefaults,
				cookieJar: rt.cookieJar,
				signal: rt.options.signal,
				executeSubflow: rt.options.executeSubflow,
				getForm: rt.options.getForm,
				awaitForm: async (req) => {
					rt.events.emit("form:await", {
						nodeId: req.nodeId,
						formId: req.formId,
						form: req.form,
						resolved: req.resolved,
					});
					return awaitForm(req);
				},
			});
			if (result.vars) rt.vars = { ...rt.vars, ...result.vars };
			output = result.output;
			branch = result.branch;
			processedInput =
				result.processedInput ??
				resolveTemplateDeep(node.data ?? {}, resolveTpl);
		}

		rt.nodeOutputs[node.id] = output;
		rt.lastOutput = output;
		const step: NodeStepResult = {
			nodeId: stepId(rt, node.id),
			type: node.type,
			input,
			processedInput,
			output,
		};
		rt.steps.push(step);
		if (rt.runLogger) {
			await rt.runLogger.writeStep({
				nodeId: step.nodeId,
				type: step.type,
				input: step.input,
				processedInput: step.processedInput,
				output: step.output,
				error: null,
			});
		}
		rt.events.emit("node:after", {
			nodeId: node.id,
			type: node.type,
			input,
			processedInput,
			output,
		});
		return { output, branch };
	} catch (error) {
		if (
			error instanceof FlowCancelledError ||
			(error instanceof DOMException && error.name === "AbortError") ||
			rt.options.signal?.aborted
		) {
			if (
				rt.options.signal?.aborted &&
				!(error instanceof FlowCancelledError)
			) {
				if (rt.runLogger) {
					await rt.runLogger.finish({ status: "cancelled" });
				}
				throw new FlowCancelledError("Flow run cancelled", {
					partial: buildPartialResult(
						rt.flow,
						rt.nodeOutputs,
						rt.nodeInputs,
						rt.steps,
						rt.vars,
						rt.lastOutput,
						rt.runDir,
					),
				});
			}
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		const processedInput =
			error instanceof HttpNodeError
				? error.request
				: resolveTemplateDeep(node.data ?? {}, resolveTpl);
		rt.events.emit("node:error", {
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
			nodeId: stepId(rt, node.id),
			type: node.type,
			input,
			processedInput,
			output: partialOutput,
			error: message,
		};
		rt.steps.push(step);
		if (rt.runLogger) {
			await rt.runLogger.writeStep({
				nodeId: step.nodeId,
				type: step.type,
				input: step.input,
				processedInput: step.processedInput,
				output: step.output,
				error: message,
			});
			if (!rt.suppressFailFinish) {
				await rt.runLogger.finish({
					status: "failed",
					failedNodeId: node.id,
					error: message,
				});
			}
		}
		throw new FlowExecutionError(message, {
			partial: {
				output: undefined,
				nodeOutputs: rt.nodeOutputs,
				nodeInputs: rt.nodeInputs,
				steps: rt.steps,
				vars: rt.vars,
				runDir: rt.runDir,
			},
			failedNodeId: node.id,
			failedNodeType: node.type,
			cause: error,
		});
	}
}

export async function executeFlow(
	flow: FlowV1,
	options: ExecuteFlowOptions = {},
): Promise<ExecuteFlowResult> {
	const events = options.events ?? new EngineEventEmitter();
	const fetchFn = mergeFetchSignal(options.fetch ?? fetch, options.signal);
	const flowInput = options.input ?? {};
	const cookieJar =
		options.cookieJar ??
		(isCookieJarEnabled(options.httpDefaults) ? new CookieJar() : undefined);

	const rt: Runtime = {
		flow,
		options,
		events,
		fetchFn,
		flowInput,
		vars: { ...(options.vars ?? {}) },
		nodeOutputs: {},
		nodeInputs: {},
		steps: [],
		cookieJar,
		runLogger: options.runLogger,
		runDir: options.runLogger?.runDir,
		nodeById: new Map(flow.nodes.map((n) => [n.id, n])),
		lastOutput: {},
		stepPrefix: "",
		suppressFailFinish: false,
	};

	const order = topologicalSort(flow);
	const executed = new Set<string>();
	const branchTaken = new Map<string, string | undefined>();
	const pending = new Set<string>();
	const startNodes = order.filter((n) => n.type === "start" && !n.parentId);
	const queue: string[] = startNodes.map((n) => n.id);
	if (queue.length === 0) {
		const firstRoot = order.find((n) => !n.parentId);
		if (firstRoot) queue.push(firstRoot.id);
	}

	const enqueueReady = () => {
		for (const target of [...pending]) {
			if (executed.has(target) || queue.includes(target)) {
				pending.delete(target);
				continue;
			}
			const targetNode = rt.nodeById.get(target);
			if (targetNode?.parentId) {
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
			rt.nodeOutputs,
			rt.nodeInputs,
			rt.steps,
			rt.vars,
			rt.lastOutput,
			rt.runDir,
		);

	while (queue.length > 0) {
		await abortIfRequested(options.signal, rt.runLogger, partial);

		const nodeId = queue.shift();
		if (!nodeId || executed.has(nodeId)) continue;
		const node = rt.nodeById.get(nodeId);
		if (!node || node.parentId) continue;
		if (!isNodeReady(flow, nodeId, executed, branchTaken)) {
			pending.add(nodeId);
			continue;
		}

		const incoming = flow.edges.filter((e) => {
			if (e.target !== nodeId) return false;
			const source = rt.nodeById.get(e.source);
			if (source?.parentId === nodeId) return false;
			return true;
		});
		let input: unknown = rt.lastOutput;
		if (incoming.length > 0) {
			const incomingSources = incoming.map((e) => e.source);
			const completedPreds = rt.steps
				.map((s) => s.nodeId)
				.filter((id) => incomingSources.includes(id));
			input = resolveExecuteInput({
				nodeType: node.type,
				fallback: rt.lastOutput,
				incomingSources,
				completedPreds,
				nodeOutputs: rt.nodeOutputs,
			});
		}
		if (node.type === "input") input = flowInput;

		const { output, branch } = await executeOneNode(rt, node, input);
		executed.add(node.id);
		branchTaken.set(node.id, branch);
		void output;

		for (const edge of selectNextEdges(flow, node, branch)) {
			const target = rt.nodeById.get(edge.target);
			if (target?.parentId) continue;
			if (!executed.has(edge.target)) pending.add(edge.target);
		}
		enqueueReady();
	}

	const outputNode = flow.nodes.find((n) => n.type === "output" && !n.parentId);
	const output = outputNode ? rt.nodeOutputs[outputNode.id] : rt.lastOutput;
	if (rt.runLogger) {
		await rt.runLogger.finish({ status: "success" });
	}
	events.emit("flow:complete", { output });
	return {
		output,
		nodeOutputs: rt.nodeOutputs,
		nodeInputs: rt.nodeInputs,
		steps: rt.steps,
		vars: rt.vars,
		runDir: rt.runDir,
	};
}

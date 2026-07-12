import { HttpNodeError, getNodePlugin } from "@quester/nodes";
import type { FlowV1 } from "@quester/schema";
import "@quester/nodes";
import { EngineEventEmitter } from "./events.js";
import { selectNextEdges, topologicalSort } from "./graph.js";
import { resolveTemplate } from "./variables.js";

export type ExecuteFlowOptions = {
	input?: unknown;
	env?: Record<string, unknown>;
	secrets?: Record<string, unknown>;
	vars?: Record<string, unknown>;
	fetch?: typeof fetch;
	events?: EngineEventEmitter;
};

export type NodeStepResult = {
	nodeId: string;
	type: string;
	input: unknown;
	output: unknown;
	error?: string;
};

export type ExecuteFlowResult = {
	output: unknown;
	nodeOutputs: Record<string, unknown>;
	nodeInputs: Record<string, unknown>;
	steps: NodeStepResult[];
	vars: Record<string, unknown>;
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

export async function executeFlow(
	flow: FlowV1,
	options: ExecuteFlowOptions = {},
): Promise<ExecuteFlowResult> {
	const events = options.events ?? new EngineEventEmitter();
	const fetchFn = options.fetch ?? fetch;
	const flowInput = options.input ?? {};
	let vars = { ...(options.vars ?? {}) };
	const nodeOutputs: Record<string, unknown> = {};
	const nodeInputs: Record<string, unknown> = {};
	const steps: NodeStepResult[] = [];
	const order = topologicalSort(flow);
	const executed = new Set<string>();
	const queue: string[] = order
		.filter((n) => n.type === "input")
		.map((n) => n.id);
	if (queue.length === 0 && order[0]) queue.push(order[0].id);

	const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
	let lastOutput: unknown = flowInput;

	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (!nodeId || executed.has(nodeId)) continue;
		const node = nodeById.get(nodeId);
		if (!node) continue;

		const plugin = getNodePlugin(node.type);
		if (!plugin) {
			throw new Error(`No plugin registered for node type: ${node.type}`);
		}

		const incoming = flow.edges.filter((e) => e.target === nodeId);
		let input: unknown = lastOutput;
		if (incoming.length > 0) {
			const src = incoming[0]?.source;
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
				resolveTemplate: (t) => resolveTemplate(t, resolverCtx),
				fetch: fetchFn,
			});
			if (result.vars) vars = { ...vars, ...result.vars };
			nodeOutputs[node.id] = result.output;
			lastOutput = result.output;
			executed.add(node.id);
			steps.push({
				nodeId: node.id,
				type: node.type,
				input,
				output: result.output,
			});
			events.emit("node:after", {
				nodeId: node.id,
				type: node.type,
				input,
				output: result.output,
			});

			for (const edge of selectNextEdges(flow, node, result.branch)) {
				if (!executed.has(edge.target) && !queue.includes(edge.target)) {
					queue.push(edge.target);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			events.emit("node:error", {
				nodeId: node.id,
				type: node.type,
				input,
				error,
			});
			const partialOutput =
				error instanceof HttpNodeError ? { request: error.request } : undefined;
			steps.push({
				nodeId: node.id,
				type: node.type,
				input,
				output: partialOutput,
				error: message,
			});
			throw new FlowExecutionError(message, {
				partial: {
					output: undefined,
					nodeOutputs,
					nodeInputs,
					steps,
					vars,
				},
				failedNodeId: node.id,
				failedNodeType: node.type,
				cause: error,
			});
		}
	}

	const outputNode = flow.nodes.find((n) => n.type === "output");
	const output = outputNode ? nodeOutputs[outputNode.id] : lastOutput;
	events.emit("flow:complete", { output });
	return { output, nodeOutputs, nodeInputs, steps, vars };
}

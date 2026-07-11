import type { FlowV1 } from "@quester/schema";
import { getNodePlugin } from "@quester/nodes";
import "@quester/nodes";
import { resolveTemplate } from "./variables.js";
import { topologicalSort, selectNextEdges } from "./graph.js";
import { EngineEventEmitter } from "./events.js";

export type ExecuteFlowOptions = {
  input?: unknown;
  env?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  vars?: Record<string, unknown>;
  fetch?: typeof fetch;
  events?: EngineEventEmitter;
};

export type ExecuteFlowResult = {
  output: unknown;
  nodeOutputs: Record<string, unknown>;
  vars: Record<string, unknown>;
};

export async function executeFlow(
  flow: FlowV1,
  options: ExecuteFlowOptions = {},
): Promise<ExecuteFlowResult> {
  const events = options.events ?? new EngineEventEmitter();
  const fetchFn = options.fetch ?? fetch;
  const flowInput = options.input ?? {};
  let vars = { ...(options.vars ?? {}) };
  const nodeOutputs: Record<string, unknown> = {};
  const order = topologicalSort(flow);
  const executed = new Set<string>();
  const queue: string[] = order.filter((n) => n.type === "input").map((n) => n.id);
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

    events.emit("node:before", { nodeId: node.id, type: node.type });
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
      events.emit("node:after", { nodeId: node.id, type: node.type, output: result.output });

      for (const edge of selectNextEdges(flow, node, result.branch)) {
        if (!executed.has(edge.target) && !queue.includes(edge.target)) {
          queue.push(edge.target);
        }
      }
    } catch (error) {
      events.emit("node:error", { nodeId: node.id, type: node.type, error });
      throw error;
    }
  }

  const outputNode = flow.nodes.find((n) => n.type === "output");
  const output = outputNode ? nodeOutputs[outputNode.id] : lastOutput;
  events.emit("flow:complete", { output });
  return { output, nodeOutputs, vars };
}

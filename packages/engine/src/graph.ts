import type { FlowEdgeV1, FlowNodeV1, FlowV1 } from "@quester/schema";

export function topologicalSort(flow: FlowV1): FlowNodeV1[] {
  const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
  const indegree = new Map<string, number>();
  for (const node of flow.nodes) indegree.set(node.id, 0);
  for (const edge of flow.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const queue = flow.nodes
    .filter((n) => (indegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const order: FlowNodeV1[] = [];
  const adj = new Map<string, string[]>();
  for (const edge of flow.edges) {
    const list = adj.get(edge.source) ?? [];
    list.push(edge.target);
    adj.set(edge.source, list);
  }
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    const node = nodeById.get(id);
    if (node) order.push(node);
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order.length === flow.nodes.length ? order : flow.nodes;
}

export function outgoingEdges(flow: FlowV1, nodeId: string): FlowEdgeV1[] {
  return flow.edges.filter((e) => e.source === nodeId);
}

export function selectNextEdges(
  flow: FlowV1,
  node: FlowNodeV1,
  branch?: "true" | "false",
): FlowEdgeV1[] {
  const edges = outgoingEdges(flow, node.id);
  if (node.type !== "if") return edges;
  const handle = branch ?? "false";
  const filtered = edges.filter((e) => (e.sourceHandle ?? "true") === handle);
  return filtered.length > 0 ? filtered : edges.filter((e) => !e.sourceHandle);
}

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadWorkspace } from "@quester-studio/engine";
import {
	type BuiltinNodeType,
	builtinNodeTypes,
	nodeDataSchemaForType,
	validateFlow,
	validateNodeData,
} from "@quester-studio/schema";
import { zodToJsonSchema } from "zod-to-json-schema";
import { applyMergePatch } from "./handlers.js";
import type { McpWorkspaceContext } from "./handlers.js";
import { describeValueForAgent } from "./json-shape.js";
import { assertSafeFlowId, isPathInside } from "./path-safety.js";

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

const NODE_HELP: Partial<
	Record<BuiltinNodeType, { summary: string; jmespathTip?: string }>
> = {
	extract: {
		summary: "JMESPath over wire (previous node output).",
		jmespathTip:
			"Root is the previous node's output. HTTP nodes often use body.id, body.items[*].name, status.",
	},
	assert: {
		summary: "Fail the run when path checks fail.",
		jmespathTip: "checks[].path is JMESPath on the wire.",
	},
	transform: {
		summary: "Map fields with JMESPath expressions.",
	},
	json: {
		summary: "Subset / pick JSON from the wire.",
	},
	inspect: {
		summary: "Preview JSON (optional JMESPath) on canvas after a run.",
	},
	http: {
		summary: "HTTP request; output { status, body, headers, … }.",
	},
	if: {
		summary: "Branch on condition / checks.",
	},
	foreach: {
		summary: "Iterate items with a framed body.",
	},
	mcp: {
		summary: "Call an external MCP tool by workspace server id.",
	},
};

export async function listNodeTypesTool() {
	return toolJson({
		types: builtinNodeTypes.map((type) => ({
			type,
			summary: NODE_HELP[type]?.summary ?? `${type} node`,
		})),
		privacy: "No workspace secrets or run values included.",
	});
}

export async function describeNodeTypeTool(args: { type: string }) {
	const type = args.type;
	const schema = nodeDataSchemaForType(type);
	if (!schema) {
		return toolError(`Unknown node type: ${type}`);
	}
	const jsonSchema = zodToJsonSchema(schema, {
		name: `${type}NodeData`,
		$refStrategy: "none",
	});
	return toolJson({
		type,
		summary: NODE_HELP[type as BuiltinNodeType]?.summary ?? null,
		jmespathTip: NODE_HELP[type as BuiltinNodeType]?.jmespathTip ?? null,
		dataJsonSchema: jsonSchema,
		privacy: "Schema only — no secrets.",
	});
}

export async function getNodeTool(
	ctx: McpWorkspaceContext,
	args: { flowId: string; nodeId: string },
) {
	try {
		assertSafeFlowId(args.flowId);
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flow = ws.flows[args.flowId];
		if (!flow) return toolError(`Flow not found: ${args.flowId}`);
		const node = flow.nodes.find((n) => n.id === args.nodeId);
		if (!node) return toolError(`Node not found: ${args.nodeId}`);
		return toolJson({
			flowId: args.flowId,
			node: {
				id: node.id,
				type: node.type,
				data: node.data,
				position: node.position,
				parentId: node.parentId,
			},
			incoming: flow.edges
				.filter((e) => e.target === node.id)
				.map((e) => ({
					id: e.id,
					source: e.source,
					sourceHandle: e.sourceHandle,
				})),
			outgoing: flow.edges
				.filter((e) => e.source === node.id)
				.map((e) => ({
					id: e.id,
					target: e.target,
					sourceHandle: e.sourceHandle,
				})),
			privacy:
				"Node config only. Does not include run bodies or secrets values.",
		});
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function patchNodeTool(
	ctx: McpWorkspaceContext,
	args: { flowId: string; nodeId: string; dataPatch: unknown },
) {
	try {
		assertSafeFlowId(args.flowId);
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flow = ws.flows[args.flowId];
		if (!flow) return toolError(`Flow not found: ${args.flowId}`);
		const idx = flow.nodes.findIndex((n) => n.id === args.nodeId);
		if (idx < 0) return toolError(`Node not found: ${args.nodeId}`);
		const node = flow.nodes[idx];
		if (!node) return toolError(`Node not found: ${args.nodeId}`);
		const nextData = applyMergePatch(node.data ?? {}, args.dataPatch);
		const dataOk = validateNodeData(node.type, nextData);
		if (!dataOk.success) {
			return toolJson({
				ok: false,
				error: dataOk.error.message,
				issues: dataOk.error.issues.map((i) => ({
					path: i.path.join("."),
					message: i.message,
				})),
			});
		}
		const nextFlow = {
			...flow,
			nodes: flow.nodes.map((n, i) =>
				i === idx ? { ...n, data: dataOk.data as Record<string, unknown> } : n,
			),
		};
		const validated = validateFlow(nextFlow);
		if (!validated.success) {
			return toolJson({
				ok: false,
				error: validated.error,
				issues: validated.issues ?? [],
			});
		}
		const flowsDir = join(ctx.workspaceRoot, ws.manifest.flowsDir);
		const filePath = join(flowsDir, `${validated.data.id}.flow.json`);
		if (!isPathInside(ctx.workspaceRoot, filePath)) {
			return toolError("Flow path outside workspace");
		}
		await writeFile(
			filePath,
			`${JSON.stringify(validated.data, null, 2)}\n`,
			"utf8",
		);
		return toolJson({
			ok: true,
			flowId: validated.data.id,
			nodeId: args.nodeId,
			data: validated.data.nodes.find((n) => n.id === args.nodeId)?.data,
		});
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

/**
 * Help author JMESPath for a target node using the upstream wire shape (not values).
 */
export async function suggestJmespathTool(
	ctx: McpWorkspaceContext,
	args: {
		flowId: string;
		nodeId: string;
		goal?: string;
		includeValues?: boolean;
	},
) {
	try {
		assertSafeFlowId(args.flowId);
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const flow = ws.flows[args.flowId];
		if (!flow) return toolError(`Flow not found: ${args.flowId}`);
		const node = flow.nodes.find((n) => n.id === args.nodeId);
		if (!node) return toolError(`Node not found: ${args.nodeId}`);

		const inbound = flow.edges.filter((e) => e.target === args.nodeId);
		const sourceIds = inbound.map((e) => e.source);
		const snap = ctx.lastRuns.get(args.flowId);
		const wireSources: Record<string, unknown> = {};
		for (const sourceId of sourceIds) {
			const out = snap?.nodeOutputs?.[sourceId];
			if (out !== undefined) {
				wireSources[sourceId] = describeValueForAgent(out, {
					includeValues: args.includeValues === true,
					secretValues: snap?.secretValues,
				});
			} else {
				wireSources[sourceId] = {
					note: "No last-run output for this upstream node — run the flow first, or invent paths from HTTP docs.",
				};
			}
		}

		const goal = (args.goal ?? "").toLowerCase();
		const hints: string[] = [];
		if (goal.includes("status")) hints.push("status");
		if (goal.includes("id")) hints.push("body.id", "body.user.id", "id");
		if (
			goal.includes("list") ||
			goal.includes("array") ||
			goal.includes("each")
		) {
			hints.push("body.items[*]", "body.products[*].title", "body[*].id");
		}
		if (goal.includes("token") || goal.includes("auth")) {
			hints.push(
				"(avoid extracting secrets into logs — prefer {{secrets.*}} templates)",
			);
		}
		if (hints.length === 0) {
			hints.push("body", "body.id", "status", "body.items[0]");
		}

		return toolJson({
			flowId: args.flowId,
			nodeId: args.nodeId,
			nodeType: node.type,
			goal: args.goal ?? null,
			tip:
				NODE_HELP[node.type as BuiltinNodeType]?.jmespathTip ??
				"JMESPath roots at the previous node's output (the wire), not {{input.*}}.",
			currentData: node.data,
			upstreamWireShapes: wireSources,
			exampleExpressions: hints,
			howToApply:
				node.type === "extract" ||
				node.type === "assert" ||
				node.type === "inspect" ||
				node.type === "json"
					? `Use patch_node with dataPatch setting expression / checks, e.g. { "expression": "body.id" }`
					: "Patch this node's data fields that accept JMESPath (see describe_node_type).",
			privacy:
				"Upstream payloads are TypeScript/JSON Schema shapes by default; secrets never included.",
		});
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

export async function listEnvKeysTool(ctx: McpWorkspaceContext) {
	try {
		const ws = await loadWorkspace(ctx.workspaceRoot);
		const envs = Object.values(ws.environments).map((env) => ({
			name: env.name,
			variableKeys: Object.keys(env.variables ?? {}),
		}));
		return toolJson({
			environments: envs,
			privacy:
				"Keys only — env values and secrets are never returned to the agent.",
			templates: {
				env: "{{env.KEY}}",
				secrets: "{{secrets.KEY}} (values never exposed via MCP)",
				nodes: "{{nodes.nodeId.path}}",
				input: "{{input.path}}",
				vars: "{{vars.key}}",
			},
		});
	} catch (e) {
		return toolError(e instanceof Error ? e.message : String(e));
	}
}

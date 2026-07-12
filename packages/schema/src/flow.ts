import { z } from "zod";
import { FLOW_VERSION } from "./common.js";
import { assertNodeDataSchema } from "./nodes/assert.js";
import { extractNodeDataSchema } from "./nodes/extract.js";
import { httpNodeDataSchema } from "./nodes/http.js";
import { ifNodeDataSchema } from "./nodes/if.js";
import { inputNodeDataSchema } from "./nodes/input.js";
import { jsonNodeDataSchema } from "./nodes/json.js";
import { mergeNodeDataSchema } from "./nodes/merge.js";
import { outputNodeDataSchema } from "./nodes/output.js";
import { setNodeDataSchema } from "./nodes/set.js";
import { startNodeDataSchema } from "./nodes/start.js";
import { templateNodeDataSchema } from "./nodes/template.js";
import { transformNodeDataSchema } from "./nodes/transform.js";

export const builtinNodeTypes = [
	"start",
	"input",
	"http",
	"extract",
	"template",
	"set",
	"if",
	"output",
	"assert",
	"transform",
	"merge",
	"json",
] as const;

export type BuiltinNodeType = (typeof builtinNodeTypes)[number];

const nodeDataByType: Record<BuiltinNodeType, z.ZodTypeAny> = {
	start: startNodeDataSchema,
	input: inputNodeDataSchema,
	http: httpNodeDataSchema,
	extract: extractNodeDataSchema,
	template: templateNodeDataSchema,
	set: setNodeDataSchema,
	if: ifNodeDataSchema,
	output: outputNodeDataSchema,
	assert: assertNodeDataSchema,
	transform: transformNodeDataSchema,
	merge: mergeNodeDataSchema,
	json: jsonNodeDataSchema,
};

export function nodeDataSchemaForType(type: string): z.ZodTypeAny | undefined {
	if ((builtinNodeTypes as readonly string[]).includes(type)) {
		return nodeDataByType[type as BuiltinNodeType];
	}
	return undefined;
}

export const flowNodeSchemaV1 = z.object({
	id: z.string().min(1),
	type: z.string().min(1),
	data: z.record(z.unknown()).default({}),
	position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const flowEdgeSchemaV1 = z.object({
	id: z.string().min(1),
	source: z.string().min(1),
	target: z.string().min(1),
	sourceHandle: z.string().nullable().optional(),
});

export const flowSchemaV1 = z.object({
	id: z.string().min(1),
	version: z.literal(FLOW_VERSION),
	name: z.string().optional(),
	description: z.string().optional(),
	nodes: z.array(flowNodeSchemaV1).min(1),
	edges: z.array(flowEdgeSchemaV1).default([]),
});

export type FlowNodeV1 = z.infer<typeof flowNodeSchemaV1>;
export type FlowEdgeV1 = z.infer<typeof flowEdgeSchemaV1>;
export type FlowV1 = z.infer<typeof flowSchemaV1>;

export function validateNodeData(
	type: string,
	data: unknown,
): z.SafeParseReturnType<unknown, unknown> {
	const schema = nodeDataSchemaForType(type);
	if (!schema) {
		return { success: true, data };
	}
	return schema.safeParse(data);
}

export { FLOW_VERSION };

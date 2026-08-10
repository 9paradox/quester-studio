import { z } from "zod";
import { FLOW_VERSION, workspaceFileIdSchema } from "./common.js";
import { assertNodeDataSchema } from "./nodes/assert.js";
import { delayNodeDataSchema } from "./nodes/delay.js";
import { extractNodeDataSchema } from "./nodes/extract.js";
import { foreachNodeDataSchema } from "./nodes/foreach.js";
import { httpNodeDataSchema } from "./nodes/http.js";
import { ifNodeDataSchema } from "./nodes/if.js";
import { inputNodeDataSchema } from "./nodes/input.js";
import { inspectNodeDataSchema } from "./nodes/inspect.js";
import { joinNodeDataSchema } from "./nodes/join.js";
import { jsonNodeDataSchema } from "./nodes/json.js";
import { logNodeDataSchema } from "./nodes/log.js";
import { mcpNodeDataSchema } from "./nodes/mcp.js";
import { mergeNodeDataSchema } from "./nodes/merge.js";
import { noteNodeDataSchema } from "./nodes/note.js";
import { outputNodeDataSchema } from "./nodes/output.js";
import { setNodeDataSchema } from "./nodes/set.js";
import { startNodeDataSchema } from "./nodes/start.js";
import { subflowNodeDataSchema } from "./nodes/subflow.js";
import { switchNodeDataSchema } from "./nodes/switch.js";
import { templateNodeDataSchema } from "./nodes/template.js";
import { transformNodeDataSchema } from "./nodes/transform.js";
import { tryNodeDataSchema } from "./nodes/try.js";
import { settingsSchemaV1 } from "./settings.js";

export const builtinNodeTypes = [
	"start",
	"input",
	"http",
	"extract",
	"template",
	"set",
	"if",
	"switch",
	"delay",
	"foreach",
	"try",
	"subflow",
	"output",
	"assert",
	"transform",
	"merge",
	"join",
	"json",
	"note",
	"log",
	"inspect",
	"mcp",
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
	switch: switchNodeDataSchema,
	delay: delayNodeDataSchema,
	foreach: foreachNodeDataSchema,
	try: tryNodeDataSchema,
	subflow: subflowNodeDataSchema,
	output: outputNodeDataSchema,
	assert: assertNodeDataSchema,
	transform: transformNodeDataSchema,
	merge: mergeNodeDataSchema,
	join: joinNodeDataSchema,
	json: jsonNodeDataSchema,
	note: noteNodeDataSchema,
	log: logNodeDataSchema,
	inspect: inspectNodeDataSchema,
	mcp: mcpNodeDataSchema,
};

export function nodeDataSchemaForType(type: string): z.ZodTypeAny | undefined {
	if (type === "wait") return delayNodeDataSchema;
	if (type === "preview") return inspectNodeDataSchema;
	if ((builtinNodeTypes as readonly string[]).includes(type)) {
		return nodeDataByType[type as BuiltinNodeType];
	}
	return undefined;
}

export const FRAME_CONTAINER_TYPES = ["try", "foreach"] as const;

export function isFrameContainerType(type: string): boolean {
	return (FRAME_CONTAINER_TYPES as readonly string[]).includes(type);
}

export const flowNodeSchemaV1 = z.object({
	id: z.string().min(1),
	type: z.string().min(1),
	data: z.record(z.unknown()).default({}),
	position: z.object({ x: z.number(), y: z.number() }).optional(),
	/** Canvas layout size (UI only; optional for resizable nodes like `json`). */
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	/** Parent frame id when this node is a framed `try` / `foreach` body child. */
	parentId: z.string().min(1).optional(),
	/** React Flow extent — children use `"parent"`. */
	extent: z.literal("parent").optional(),
});

export const flowEdgeSchemaV1 = z.object({
	id: z.string().min(1),
	source: z.string().min(1),
	target: z.string().min(1),
	sourceHandle: z.string().nullable().optional(),
	targetHandle: z.string().nullable().optional(),
});

export const flowSchemaV1 = z.object({
	id: workspaceFileIdSchema,
	version: z.literal(FLOW_VERSION),
	name: z.string().optional(),
	description: z.string().optional(),
	settings: settingsSchemaV1.optional(),
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

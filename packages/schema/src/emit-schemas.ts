import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { environmentSchemaV1 } from "./environment.js";
import { flowSchemaV1 } from "./flow.js";
import { formDefinitionSchemaV1 } from "./form.js";
import {
	assertNodeDataSchema,
	delayNodeDataSchema,
	extractNodeDataSchema,
	foreachNodeDataSchema,
	formNodeDataSchema,
	httpNodeDataSchema,
	ifNodeDataSchema,
	inputNodeDataSchema,
	inspectNodeDataSchema,
	joinNodeDataSchema,
	jsonNodeDataSchema,
	logNodeDataSchema,
	mergeNodeDataSchema,
	noteNodeDataSchema,
	outputNodeDataSchema,
	setNodeDataSchema,
	startNodeDataSchema,
	subflowNodeDataSchema,
	switchNodeDataSchema,
	templateNodeDataSchema,
	transformNodeDataSchema,
	tryNodeDataSchema,
} from "./nodes/index.js";
import { requestSchemaV1 } from "./request.js";
import { secretsSchemaV1 } from "./secrets.js";
import { suiteSchemaV1 } from "./suite.js";
import { workspaceSchemaV1 } from "./workspace.js";

const root = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
	"schemas",
);
await mkdir(root, { recursive: true });

const specs: [string, unknown][] = [
	["quester/workspace/v1.schema.json", workspaceSchemaV1],
	["quester/environment/v1.schema.json", environmentSchemaV1],
	["quester/secrets/v1.schema.json", secretsSchemaV1],
	["quester/flow/v1.schema.json", flowSchemaV1],
	["quester/request/v1.schema.json", requestSchemaV1],
	["quester/suite/v1.schema.json", suiteSchemaV1],
	["quester/form/v1.schema.json", formDefinitionSchemaV1],
	["quester/nodes/start.schema.json", startNodeDataSchema],
	["quester/nodes/input.schema.json", inputNodeDataSchema],
	["quester/nodes/form.schema.json", formNodeDataSchema],
	["quester/nodes/http.schema.json", httpNodeDataSchema],
	["quester/nodes/extract.schema.json", extractNodeDataSchema],
	["quester/nodes/template.schema.json", templateNodeDataSchema],
	["quester/nodes/set.schema.json", setNodeDataSchema],
	["quester/nodes/if.schema.json", ifNodeDataSchema],
	["quester/nodes/switch.schema.json", switchNodeDataSchema],
	["quester/nodes/delay.schema.json", delayNodeDataSchema],
	["quester/nodes/foreach.schema.json", foreachNodeDataSchema],
	["quester/nodes/try.schema.json", tryNodeDataSchema],
	["quester/nodes/subflow.schema.json", subflowNodeDataSchema],
	["quester/nodes/output.schema.json", outputNodeDataSchema],
	["quester/nodes/assert.schema.json", assertNodeDataSchema],
	["quester/nodes/transform.schema.json", transformNodeDataSchema],
	["quester/nodes/merge.schema.json", mergeNodeDataSchema],
	["quester/nodes/join.schema.json", joinNodeDataSchema],
	["quester/nodes/json.schema.json", jsonNodeDataSchema],
	["quester/nodes/note.schema.json", noteNodeDataSchema],
	["quester/nodes/log.schema.json", logNodeDataSchema],
	["quester/nodes/inspect.schema.json", inspectNodeDataSchema],
];

for (const [rel, schema] of specs) {
	const outPath = join(root, rel);
	await mkdir(dirname(outPath), { recursive: true });
	const json = zodToJsonSchema(schema as never, { $refStrategy: "none" });
	await writeFile(outPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
	console.log(`Wrote ${rel}`);
}

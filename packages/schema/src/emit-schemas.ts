import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { environmentSchemaV1 } from "./environment.js";
import { flowSchemaV1 } from "./flow.js";
import {
	extractNodeDataSchema,
	httpNodeDataSchema,
	ifNodeDataSchema,
	inputNodeDataSchema,
	outputNodeDataSchema,
	setNodeDataSchema,
	templateNodeDataSchema,
} from "./nodes/index.js";
import { secretsSchemaV1 } from "./secrets.js";
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
	["quester/nodes/input.schema.json", inputNodeDataSchema],
	["quester/nodes/http.schema.json", httpNodeDataSchema],
	["quester/nodes/extract.schema.json", extractNodeDataSchema],
	["quester/nodes/template.schema.json", templateNodeDataSchema],
	["quester/nodes/set.schema.json", setNodeDataSchema],
	["quester/nodes/if.schema.json", ifNodeDataSchema],
	["quester/nodes/output.schema.json", outputNodeDataSchema],
];

for (const [rel, schema] of specs) {
	const outPath = join(root, rel);
	await mkdir(dirname(outPath), { recursive: true });
	const json = zodToJsonSchema(schema as never, { $refStrategy: "none" });
	await writeFile(outPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
	console.log(`Wrote ${rel}`);
}

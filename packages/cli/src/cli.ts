#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";
import {
	createExecuteSubflow,
	createHttpFetch,
	executeFlow,
	importPostmanCollectionFile,
	loadSecrets,
	loadWorkspace,
} from "@quester-studio/engine";
import {
	mergeHttpSettings,
	validateEnvironment,
	validateFlow,
	validateWorkspace,
} from "@quester-studio/schema";
import { Command } from "commander";
import { initWorkspace } from "./init.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program.name("quester").description("Quester Studio CLI").version(version);

program
	.command("init")
	.argument("[dir]", "directory to scaffold (created if missing)", ".")
	.option("--name <name>", "workspace name (default: directory basename)")
	.description("Scaffold a new Quester workspace")
	.action(async (dir: string, opts: { name?: string }) => {
		const result = await initWorkspace(dir, { name: opts.name });
		console.log(`Initialized workspace: ${result.name}`);
		console.log(`  path: ${result.root}`);
		console.log(`  flow: ${result.flowId}`);
		console.log(`Next: quester validate ${dir === "." ? "." : dir}`);
	});

program
	.command("validate")
	.argument("[path]", "workspace or flow path", ".")
	.description("Validate workspace manifest, environments, and flows")
	.action(async (path: string) => {
		const abs = resolve(path);
		let failed = false;
		try {
			const ws = await loadWorkspace(abs);
			console.log(`Workspace OK: ${ws.manifest.name}`);
			for (const [name] of Object.entries(ws.environments)) {
				console.log(`  environment: ${name}`);
			}
			for (const [id] of Object.entries(ws.flows)) {
				console.log(`  flow: ${id}`);
			}
		} catch {
			if (abs.endsWith(".flow.json")) {
				const raw = JSON.parse(await readFile(abs, "utf8"));
				const result = validateFlow(raw);
				if (!result.success) {
					failed = true;
					console.error(result.error);
					if (result.issues)
						for (const i of result.issues) {
							console.error(`  ${i.path}: ${i.message}`);
							if (i.suggestion) console.error(`    hint: ${i.suggestion}`);
						}
				} else {
					console.log(`Flow OK: ${result.data.id}`);
				}
			} else {
				const manifestPath = join(abs, "quester.json");
				const raw = JSON.parse(await readFile(manifestPath, "utf8"));
				const result = validateWorkspace(raw);
				if (!result.success) {
					failed = true;
					console.error(result.error);
				} else {
					console.log(`Workspace OK: ${result.data.name}`);
				}
			}
		}
		process.exit(failed ? 1 : 0);
	});

program
	.command("run")
	.argument("<flow>", "flow file path or flow id in workspace")
	.option("--env <name>", "environment name", "local")
	.option("--input <json>", "flow input JSON", "{}")
	.option("--workspace <path>", "workspace root", ".")
	.description("Execute a flow")
	.action(
		async (
			flowArg: string,
			opts: { env: string; input: string; workspace: string },
		) => {
			const wsPath = resolve(opts.workspace);
			let flowData: unknown;
			const flowPath = resolve(flowArg);
			if (flowArg.endsWith(".json")) {
				flowData = JSON.parse(await readFile(flowPath, "utf8"));
			} else {
				const ws = await loadWorkspace(wsPath);
				flowData = ws.flows[flowArg];
				if (!flowData) throw new Error(`Flow not found: ${flowArg}`);
			}
			const validated = validateFlow(flowData);
			if (!validated.success) throw new Error(validated.error);

			const ws = await loadWorkspace(wsPath).catch(() => null);
			const envVars = ws?.environments[opts.env]?.variables ?? {};
			const secrets = await loadSecrets(wsPath, opts.env);
			const input = JSON.parse(opts.input) as unknown;
			const httpDefaults = mergeHttpSettings(
				ws?.manifest.settings?.http,
				validated.data.settings?.http,
			);
			const fetchImpl = createHttpFetch({
				httpDefaults,
				workspaceRoot: wsPath,
			});
			const executeSubflow =
				ws === null
					? undefined
					: createExecuteSubflow(
							{ getFlow: (id) => ws.flows[id] },
							{
								env: envVars,
								secrets,
								httpDefaults,
								fetch: fetchImpl,
							},
							validated.data.id,
						);

			const result = await executeFlow(validated.data, {
				input,
				env: envVars,
				secrets,
				httpDefaults,
				fetch: fetchImpl,
				executeSubflow,
			});
			console.log(JSON.stringify(result.output, null, 2));
		},
	);

program
	.command("list-flows")
	.argument("[workspace]", "workspace path", ".")
	.action(async (workspace: string) => {
		const ws = await loadWorkspace(resolve(workspace));
		for (const flow of Object.values(ws.flows)) {
			console.log(`${flow.id}\t${flow.name ?? basename(flow.id)}`);
		}
	});

program
	.command("list-envs")
	.argument("[workspace]", "workspace path", ".")
	.action(async (workspace: string) => {
		const ws = await loadWorkspace(resolve(workspace));
		for (const env of Object.values(ws.environments)) {
			console.log(env.name);
		}
	});

program
	.command("import-collection")
	.argument("<file>", "Postman Collection v2.1 JSON file")
	.option("--workspace <path>", "workspace root", ".")
	.description("Import Postman Collection v2.1 into workspace collections/")
	.action(async (file: string, opts: { workspace: string }) => {
		const result = await importPostmanCollectionFile(
			resolve(opts.workspace),
			resolve(file),
		);
		for (const path of result.imported) {
			console.log(`  imported: ${path}`);
		}
		for (const path of result.skipped) {
			console.warn(`  skipped (duplicate): ${path}`);
		}
		console.log(
			`Imported ${result.imported.length} request(s) into ${resolve(opts.workspace)}`,
		);
	});

program.parseAsync(process.argv).catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});

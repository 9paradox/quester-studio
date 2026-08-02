#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";
import {
	createExecuteSubflow,
	createHttpFetch,
	importPostmanCollectionFile,
	loadSecrets,
	loadWorkspace,
} from "@quester-studio/engine";
import {
	mergeHttpSettings,
	validateFlow,
	validateSuite,
	validateWorkspace,
} from "@quester-studio/schema";
import { Command } from "commander";
import { initWorkspace } from "./init.js";
import {
	type RunReport,
	executeFlowWithLogging,
	formatHumanFailure,
	resolveRunLogger,
} from "./run-helpers.js";

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
			} else if (abs.endsWith(".suite.json")) {
				const raw = JSON.parse(await readFile(abs, "utf8"));
				const result = validateSuite(raw);
				if (!result.success) {
					failed = true;
					console.error(result.error);
					if (result.issues)
						for (const i of result.issues) {
							console.error(`  ${i.path}: ${i.message}`);
						}
				} else {
					console.log(`Suite OK: ${result.data.id}`);
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

async function loadSuite(workspaceRoot: string, suiteArg: string) {
	const asPath = resolve(suiteArg);
	try {
		const raw = JSON.parse(await readFile(asPath, "utf8"));
		const validated = validateSuite(raw);
		if (!validated.success) throw new Error(validated.error);
		return validated.data;
	} catch {
		// try suites/<id>.suite.json
	}
	const suitesDir = join(workspaceRoot, "suites");
	const candidate = join(suitesDir, `${suiteArg}.suite.json`);
	const raw = JSON.parse(await readFile(candidate, "utf8"));
	const validated = validateSuite(raw);
	if (!validated.success) throw new Error(validated.error);
	return validated.data;
}

program
	.command("run")
	.argument("<flow>", "flow file path or flow id in workspace")
	.option("--env <name>", "environment name", "local")
	.option("--input <json>", "flow input JSON", "{}")
	.option("--workspace <path>", "workspace root", ".")
	.option(
		"--runs-dir <path>",
		"write per-step run logs under this directory (relative to workspace)",
	)
	.option(
		"--report <path>",
		'write machine-readable report JSON ("-" = stdout)',
	)
	.description("Execute a flow")
	.action(
		async (
			flowArg: string,
			opts: {
				env: string;
				input: string;
				workspace: string;
				runsDir?: string;
				report?: string;
			},
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

			const runLogger = await resolveRunLogger({
				workspaceRoot: wsPath,
				manifest: ws?.manifest,
				flow: validated.data,
				env: opts.env,
				secrets,
				runsDirFlag: opts.runsDir,
			});

			const { result, report } = await executeFlowWithLogging(
				validated.data,
				{
					input,
					env: envVars,
					secrets,
					httpDefaults,
					fetch: fetchImpl,
					executeSubflow,
				},
				runLogger,
			);
			report.env = opts.env;

			if (opts.report) {
				await writeReport(opts.report, report);
			}

			if (!report.ok) {
				console.error(formatHumanFailure(report));
				process.exit(1);
			}
			if (report.runDir) {
				console.error(`runDir: ${report.runDir}`);
			}
			console.log(JSON.stringify(result?.output, null, 2));
		},
	);

program
	.command("suite")
	.argument("<suite>", "suite id or path to *.suite.json")
	.option("--workspace <path>", "workspace root", ".")
	.option(
		"--runs-dir <path>",
		"write per-step run logs under this directory (relative to workspace)",
	)
	.option(
		"--report <path>",
		'write machine-readable suite report JSON ("-" = stdout)',
	)
	.description("Run a suite of flows (continue on error)")
	.action(
		async (
			suiteArg: string,
			opts: { workspace: string; runsDir?: string; report?: string },
		) => {
			const wsPath = resolve(opts.workspace);
			const ws = await loadWorkspace(wsPath);
			const suite = await loadSuite(wsPath, suiteArg);
			const envName = suite.env;
			const envVars = ws.environments[envName]?.variables ?? {};
			const secrets = await loadSecrets(wsPath, envName);

			const flowReports: RunReport[] = [];
			let failed = 0;

			for (const entry of suite.flows) {
				const flowData = ws.flows[entry.id];
				if (!flowData) {
					const missing: RunReport = {
						ok: false,
						flowId: entry.id,
						env: envName,
						error: `Flow not found: ${entry.id}`,
						steps: [],
					};
					flowReports.push(missing);
					failed += 1;
					console.error(formatHumanFailure(missing));
					continue;
				}
				const validated = validateFlow(flowData);
				if (!validated.success) {
					const bad: RunReport = {
						ok: false,
						flowId: entry.id,
						env: envName,
						error: validated.error,
						steps: [],
					};
					flowReports.push(bad);
					failed += 1;
					console.error(formatHumanFailure(bad));
					continue;
				}

				const httpDefaults = mergeHttpSettings(
					ws.manifest.settings?.http,
					validated.data.settings?.http,
				);
				const fetchImpl = createHttpFetch({
					httpDefaults,
					workspaceRoot: wsPath,
				});
				const executeSubflow = createExecuteSubflow(
					{ getFlow: (id) => ws.flows[id] },
					{
						env: envVars,
						secrets,
						httpDefaults,
						fetch: fetchImpl,
					},
					validated.data.id,
				);
				const runLogger = await resolveRunLogger({
					workspaceRoot: wsPath,
					manifest: ws.manifest,
					flow: validated.data,
					env: envName,
					secrets,
					runsDirFlag: opts.runsDir,
				});
				const { report } = await executeFlowWithLogging(
					validated.data,
					{
						input: entry.input ?? {},
						env: envVars,
						secrets,
						httpDefaults,
						fetch: fetchImpl,
						executeSubflow,
					},
					runLogger,
				);
				report.env = envName;
				flowReports.push(report);
				if (report.ok) {
					console.log(`PASS ${report.flowId}`);
					if (report.runDir) console.log(`  runDir: ${report.runDir}`);
				} else {
					failed += 1;
					console.error(formatHumanFailure(report));
				}
			}

			const summary = {
				ok: failed === 0,
				suiteId: suite.id,
				suiteName: suite.name,
				env: envName,
				passed: flowReports.length - failed,
				failed,
				flows: flowReports,
			};
			console.log(
				`Suite ${suite.id}: ${summary.passed} passed, ${summary.failed} failed`,
			);
			if (opts.report) {
				await writeReport(opts.report, summary);
			}
			process.exit(failed === 0 ? 0 : 1);
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

async function writeReport(path: string, report: unknown): Promise<void> {
	const text = `${JSON.stringify(report, null, 2)}\n`;
	if (path === "-") {
		console.log(text);
		return;
	}
	const abs = resolve(path);
	await mkdir(join(abs, ".."), { recursive: true });
	await writeFile(abs, text, "utf8");
}

program.parseAsync(process.argv).catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});

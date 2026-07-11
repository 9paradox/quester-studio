#!/usr/bin/env node
import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import {
  validateWorkspace,
  validateFlow,
  validateEnvironment,
} from "@quester/schema";
import {
  executeFlow,
  loadWorkspace,
  loadSecrets,
} from "@quester/engine";

const program = new Command();

program.name("quester").description("Quester Studio CLI").version("0.1.0");

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
          if (result.issues) for (const i of result.issues) console.error(`  ${i.path}: ${i.message}`);
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
  .action(async (flowArg: string, opts: { env: string; input: string; workspace: string }) => {
    const wsPath = resolve(opts.workspace);
    let flowData;
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

    const result = await executeFlow(validated.data, {
      input,
      env: envVars,
      secrets,
    });
    console.log(JSON.stringify(result.output, null, 2));
  });

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

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

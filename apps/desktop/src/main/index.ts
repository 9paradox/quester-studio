import { loadWorkspace, executeFlow } from "@quester/engine";
import { validateFlow } from "@quester/schema";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dir, "../../../examples/sample-workspace");

export async function openWorkspace(path?: string) {
  const root = path ?? workspaceRoot;
  return loadWorkspace(root);
}

export async function listFlows(path?: string) {
  const ws = await openWorkspace(path);
  return Object.values(ws.flows).map((f) => ({ id: f.id, name: f.name ?? f.id }));
}

export async function executeFlowRpc(flowId: string, options?: { env?: string; input?: unknown }) {
  const ws = await openWorkspace();
  const flow = ws.flows[flowId];
  if (!flow) throw new Error(`Flow not found: ${flowId}`);
  const validated = validateFlow(flow);
  if (!validated.success) throw new Error(validated.error);
  const envName = options?.env ?? "local";
  const envVars = ws.environments[envName]?.variables ?? {};
  return executeFlow(validated.data, { input: options?.input ?? {}, env: envVars });
}

export async function loadSampleFlowJson() {
  const path = resolve(workspaceRoot, "flows/login-and-profile.flow.json");
  return JSON.parse(await readFile(path, "utf8"));
}

console.log("Quester desktop main process (stub)");

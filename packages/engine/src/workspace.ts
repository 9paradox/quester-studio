import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  validateWorkspace,
  validateFlow,
  validateEnvironment,
  secretsSchemaV1,
  type FlowV1,
  type WorkspaceV1,
  type EnvironmentV1,
} from "@quester/schema";

export type LoadedWorkspace = {
  root: string;
  manifest: WorkspaceV1;
  environments: Record<string, EnvironmentV1>;
  flows: Record<string, FlowV1>;
};

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function loadWorkspace(root: string): Promise<LoadedWorkspace> {
  const manifestPath = join(root, "quester.json");
  const manifestRaw = await readJson(manifestPath);
  const manifestResult = validateWorkspace(manifestRaw);
  if (!manifestResult.success) {
    throw new Error(`Invalid workspace: ${manifestResult.error}`);
  }
  const manifest = manifestResult.data;
  const envDir = join(root, manifest.environmentsDir);
  const flowsDir = join(root, manifest.flowsDir);

  const environments: Record<string, EnvironmentV1> = {};
  try {
    const envFiles = await readdir(envDir);
    for (const file of envFiles) {
      if (!file.endsWith(".json") || file.includes(".secrets.")) continue;
      const data = await readJson(join(envDir, file));
      const parsed = validateEnvironment(data);
      if (parsed.success) {
        environments[parsed.data.name] = parsed.data;
      }
    }
  } catch {
    // optional dir
  }

  const flows: Record<string, FlowV1> = {};
  try {
    const flowFiles = await readdir(flowsDir);
    for (const file of flowFiles) {
      if (!file.endsWith(".flow.json")) continue;
      const data = await readJson(join(flowsDir, file));
      const parsed = validateFlow(data);
      if (parsed.success) {
        flows[parsed.data.id] = parsed.data;
      }
    }
  } catch {
    // optional dir
  }

  return { root, manifest, environments, flows };
}

export async function loadSecrets(
  root: string,
  envName: string,
  environmentsDir = "environments",
): Promise<Record<string, string>> {
  const path = join(root, environmentsDir, `${envName}.secrets.json`);
  try {
    const raw = await readJson(path);
    const parsed = secretsSchemaV1.safeParse(raw);
    return parsed.success ? parsed.data.secrets : {};
  } catch {
    return {};
  }
}

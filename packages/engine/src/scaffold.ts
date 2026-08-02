import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
	ENVIRONMENT_VERSION,
	FLOW_VERSION,
	SECRETS_VERSION,
	WORKSPACE_VERSION,
} from "@quester-studio/schema";

export type ScaffoldWorkspaceOptions = {
	/** Workspace display/manifest name. Defaults from directory basename. */
	name?: string;
};

export type ScaffoldWorkspaceResult = {
	root: string;
	name: string;
	flowId: string;
};

function slugifyName(raw: string): string {
	const slug = raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "workspace";
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function json(value: unknown): string {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

/**
 * Scaffold a new Quester workspace under `dir` (created if missing).
 * Fails if `quester.json` already exists.
 */
export async function scaffoldWorkspace(
	dir: string,
	opts: ScaffoldWorkspaceOptions = {},
): Promise<ScaffoldWorkspaceResult> {
	const root = resolve(dir);
	const name = slugifyName(opts.name ?? basename(root));
	const manifestPath = join(root, "quester.json");

	if (await exists(manifestPath)) {
		throw new Error(
			`Workspace already exists: ${manifestPath}\nRefuse to overwrite. Choose an empty directory.`,
		);
	}

	await mkdir(root, { recursive: true });
	const flowsDir = join(root, "flows");
	const environmentsDir = join(root, "environments");
	const collectionsDir = join(root, "collections");
	await mkdir(flowsDir, { recursive: true });
	await mkdir(environmentsDir, { recursive: true });
	await mkdir(collectionsDir, { recursive: true });

	const flowId = "hello";
	const manifest = {
		name,
		version: WORKSPACE_VERSION,
		description: "Scaffolded with quester init.",
		flowsDir: "flows",
		environmentsDir: "environments",
		collectionsDir: "collections",
	};

	const flow = {
		id: flowId,
		version: FLOW_VERSION,
		name: "Hello",
		nodes: [
			{
				id: "start",
				type: "start",
				data: { label: "Start" },
				position: { x: -40, y: 120 },
			},
			{
				id: "input",
				type: "input",
				data: { label: "Input" },
				position: { x: 180, y: 120 },
			},
		],
		edges: [
			{
				id: "e-start-input",
				source: "start",
				target: "input",
				sourceHandle: null,
			},
		],
	};

	const environment = {
		name: "local",
		version: ENVIRONMENT_VERSION,
		variables: {
			API_BASE: "https://httpbin.org",
		},
	};

	const secretsExample = {
		version: SECRETS_VERSION,
		secrets: {
			API_TOKEN: "replace-me",
		},
	};

	await writeFile(manifestPath, json(manifest), "utf8");
	await writeFile(join(flowsDir, `${flowId}.flow.json`), json(flow), "utf8");
	await writeFile(
		join(environmentsDir, "local.json"),
		json(environment),
		"utf8",
	);
	await writeFile(
		join(environmentsDir, "local.secrets.json.example"),
		json(secretsExample),
		"utf8",
	);
	await writeFile(join(root, ".gitignore"), "*.secrets.json\nruns/\n", "utf8");
	await writeFile(join(collectionsDir, ".gitkeep"), "", "utf8");

	return { root, name, flowId };
}

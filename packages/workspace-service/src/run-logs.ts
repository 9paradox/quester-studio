import { existsSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	RunFileEntry,
	RunFlowEntry,
	RunMetaSummary,
} from "@quester-studio/api-contract";
import { loadWorkspace } from "@quester-studio/engine";

function isPathInside(root: string, candidate: string): boolean {
	const resolvedRoot = resolve(root);
	const resolvedCandidate = resolve(candidate);
	if (resolvedCandidate === resolvedRoot) return true;
	const rel = relative(resolvedRoot, resolvedCandidate);
	return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Resolve workspace runs directory; must stay inside the workspace root. */
export function resolveRunsRoot(workspace: string, runsDir = "runs"): string {
	const root = resolve(workspace);
	const resolved = resolve(root, runsDir);
	if (!isPathInside(root, resolved)) {
		throw new Error("Invalid runs directory");
	}
	return resolved;
}

/**
 * Resolve a posix-style path under the runs root (e.g. `flowId/ts/meta.json`).
 * Rejects `..`, absolute paths, and escape outside `runsRoot`.
 */
export function resolveRunRelativePath(
	runsRoot: string,
	relativePath: string,
): string {
	const normalized = relativePath.replace(/\\/g, "/").trim();
	if (
		!normalized ||
		normalized.startsWith("/") ||
		/^[a-zA-Z]:/.test(normalized)
	) {
		throw new Error("Invalid run path");
	}
	const segments = normalized.split("/").filter((s) => s.length > 0);
	if (
		segments.length === 0 ||
		segments.some((s) => s === "." || s === ".." || s.includes("\0"))
	) {
		throw new Error("Invalid run path");
	}
	const resolved = resolve(runsRoot, ...segments);
	if (!isPathInside(runsRoot, resolved)) {
		throw new Error("Run path outside runs directory");
	}
	return resolved;
}

function toPosixRelative(runsRoot: string, absolutePath: string): string {
	return relative(runsRoot, absolutePath).split(sep).join("/");
}

async function readMetaSummary(
	metaPath: string,
): Promise<RunMetaSummary | null> {
	try {
		const raw = JSON.parse(await readFile(metaPath, "utf8")) as Record<
			string,
			unknown
		>;
		const status = raw.status;
		const statusOk =
			status === "running" ||
			status === "success" ||
			status === "failed" ||
			status === "cancelled";
		return {
			status: statusOk ? status : undefined,
			startedAt: typeof raw.startedAt === "string" ? raw.startedAt : undefined,
			finishedAt:
				typeof raw.finishedAt === "string" ? raw.finishedAt : undefined,
			flowName: typeof raw.flowName === "string" ? raw.flowName : undefined,
			env: typeof raw.env === "string" ? raw.env : undefined,
			error: typeof raw.error === "string" ? raw.error : undefined,
		};
	} catch {
		return null;
	}
}

/** List flow → run → file tree under the workspace runs dir. Missing dir → []. */
export async function listRunTree(workspace: string): Promise<RunFlowEntry[]> {
	const ws = await loadWorkspace(workspace);
	const runsRoot = resolveRunsRoot(workspace, ws.manifest.runs?.dir ?? "runs");
	if (!existsSync(runsRoot)) {
		return [];
	}

	const flowEntries = await readdir(runsRoot, { withFileTypes: true });
	const flows: RunFlowEntry[] = [];

	for (const flowDir of flowEntries) {
		if (!flowDir.isDirectory()) continue;
		if (flowDir.name === "." || flowDir.name === "..") continue;
		const flowPath = join(runsRoot, flowDir.name);
		if (!isPathInside(runsRoot, flowPath)) continue;

		const runDirs = await readdir(flowPath, { withFileTypes: true });
		const runs: RunFlowEntry["runs"] = [];

		for (const runDir of runDirs) {
			if (!runDir.isDirectory()) continue;
			if (runDir.name === "." || runDir.name === "..") continue;
			const runPath = join(flowPath, runDir.name);
			if (!isPathInside(runsRoot, runPath)) continue;

			const fileNames = await readdir(runPath);
			const jsonFiles = fileNames
				.filter((name) => name.endsWith(".json"))
				.sort((a, b) => a.localeCompare(b));

			const files: RunFileEntry[] = [];
			for (const name of jsonFiles) {
				const abs = join(runPath, name);
				if (!isPathInside(runsRoot, abs)) continue;
				files.push({
					name,
					relativePath: toPosixRelative(runsRoot, abs),
				});
			}

			const metaFile = files.find((f) => f.name === "meta.json");
			const meta = metaFile
				? await readMetaSummary(
						resolveRunRelativePath(runsRoot, metaFile.relativePath),
					)
				: null;

			runs.push({
				name: runDir.name,
				relativePath: toPosixRelative(runsRoot, runPath),
				meta,
				files,
			});
		}

		runs.sort((a, b) => b.name.localeCompare(a.name));
		flows.push({ flowId: flowDir.name, runs });
	}

	flows.sort((a, b) => a.flowId.localeCompare(b.flowId));
	return flows;
}

/** Read and parse a JSON file under the workspace runs directory. */
export async function readRunJson(
	workspace: string,
	relativePath: string,
): Promise<unknown> {
	const ws = await loadWorkspace(workspace);
	const runsRoot = resolveRunsRoot(workspace, ws.manifest.runs?.dir ?? "runs");
	const filePath = resolveRunRelativePath(runsRoot, relativePath);
	const text = await readFile(filePath, "utf8");
	return JSON.parse(text) as unknown;
}

/**
 * Delete a file or directory under the workspace runs root.
 * Directories are removed recursively. Rejects the runs root itself.
 */
export async function deleteRunPath(
	workspace: string,
	relativePath: string,
): Promise<{ ok: true }> {
	const ws = await loadWorkspace(workspace);
	const runsRoot = resolveRunsRoot(workspace, ws.manifest.runs?.dir ?? "runs");
	const target = resolveRunRelativePath(runsRoot, relativePath);
	if (resolve(target) === resolve(runsRoot)) {
		throw new Error("Cannot delete the runs root");
	}
	await rm(target, { recursive: true, force: true });
	return { ok: true };
}

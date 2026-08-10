import { isAbsolute, relative, resolve, sep } from "node:path";
import { isSafeWorkspaceFileId } from "@quester-studio/schema";

export function isPathInside(root: string, candidate: string): boolean {
	const resolvedRoot = resolve(root);
	const resolvedCandidate = resolve(candidate);
	if (resolvedCandidate === resolvedRoot) return true;
	const rel = relative(resolvedRoot, resolvedCandidate);
	return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function assertSafeFlowId(id: string): void {
	if (!isSafeWorkspaceFileId(id)) {
		throw new Error(`Invalid flow id: ${id}`);
	}
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

import { z } from "zod";

export const WORKSPACE_VERSION = "v1" as const;
export const ENVIRONMENT_VERSION = "v1" as const;
export const SECRETS_VERSION = "v1" as const;
/** Frozen for the v1.0 product line — only additive optional fields; no breaking changes. */
export const FLOW_VERSION = "v1" as const;
export const REQUEST_VERSION = "v1" as const;

/**
 * Single-segment file id for flows / env / secrets filenames.
 * Rejects path separators, `..`, and drive-letter absolutes.
 */
export function isSafeWorkspaceFileId(id: string): boolean {
	if (!id) return false;
	if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
	if (/^[a-zA-Z]:/.test(id)) return false;
	return true;
}

export const workspaceFileIdSchema = z
	.string()
	.min(1)
	.refine(isSafeWorkspaceFileId, {
		message: "must not contain path separators or ..",
	});

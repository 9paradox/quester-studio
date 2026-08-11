import { formatTemplateNodePath } from "@/lib/pathShapes.js";
import type { TemplateCompletionContext } from "@/lib/templates.js";

/** Cap picker lists so dialogs stay usable with large path indexes. */
export const PATH_PICKER_MAX = 400;

/**
 * Template tokens (`{{…}}`) for the Pick path dialog — roots from env /
 * secrets / input / vars / nodes / foreach loop keys.
 */
export function buildTemplatePickerPaths(
	ctx: TemplateCompletionContext,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	const push = (token: string) => {
		if (!token || seen.has(token) || out.length >= PATH_PICKER_MAX) return;
		seen.add(token);
		out.push(token);
	};

	for (const key of ctx.loopKeys) {
		push(`{{${key}}}`);
	}
	for (const key of ctx.envKeys) {
		push(`{{env.${key}}}`);
	}
	for (const key of ctx.secretKeys) {
		push(`{{secrets.${key}}}`);
	}
	const inputPaths = ctx.inputPaths.length > 0 ? ctx.inputPaths : ctx.inputKeys;
	for (const path of inputPaths) {
		push(path ? `{{input.${path}}}` : "{{input}}");
	}
	for (const key of ctx.varKeys) {
		push(`{{vars.${key}}}`);
	}
	for (const key of ctx.formKeys) {
		push(`{{form.${key}}}`);
	}
	for (const nodeId of ctx.nodeIds) {
		push(formatTemplateNodePath(nodeId, ""));
		const paths = ctx.nodePaths[nodeId] ?? [];
		for (const path of paths) {
			push(formatTemplateNodePath(nodeId, path));
		}
	}

	return out;
}

export function buildJmesPathPickerPaths(
	previousPaths: readonly string[],
	jmesPaths: readonly string[],
): string[] {
	const source = previousPaths.length > 0 ? previousPaths : jmesPaths;
	const seen = new Set<string>();
	const out: string[] = [];
	for (const path of source) {
		if (!path || seen.has(path)) continue;
		seen.add(path);
		out.push(path);
		if (out.length >= PATH_PICKER_MAX) break;
	}
	return out;
}

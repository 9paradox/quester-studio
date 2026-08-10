import { type FSWatcher, watch } from "node:fs";
import { basename, join, resolve } from "node:path";
import { loadWorkspace } from "@quester-studio/engine";
import { resolveMonorepoCliJs } from "./mcp-process.js";

export type FlowFileChangedEvent = {
	workspace: string;
	flowId: string;
	filename: string;
	kind: "change" | "rename";
};

type WatchEntry = {
	watcher: FSWatcher;
	workspace: string;
};

const watches = new Map<string, WatchEntry>();

function flowIdFromFilename(name: string): string | null {
	if (!name.endsWith(".flow.json")) return null;
	return name.slice(0, -".flow.json".length);
}

export async function watchFlows(
	workspace: string,
	onChange: (event: FlowFileChangedEvent) => void,
): Promise<{ ok: true }> {
	const root = resolve(workspace);
	await stopWatchFlows(root);
	const ws = await loadWorkspace(root);
	const flowsDir = join(root, ws.manifest.flowsDir);
	const watcher = watch(
		flowsDir,
		{ persistent: false },
		(eventType, filename) => {
			if (!filename) return;
			const name = basename(filename.toString());
			const flowId = flowIdFromFilename(name);
			if (!flowId) return;
			onChange({
				workspace: root,
				flowId,
				filename: name,
				kind: eventType === "rename" ? "rename" : "change",
			});
		},
	);
	watches.set(root, { watcher, workspace: root });
	return { ok: true };
}

export async function stopWatchFlows(
	workspace?: string,
): Promise<{ ok: true }> {
	if (workspace) {
		const root = resolve(workspace);
		const entry = watches.get(root);
		if (entry) {
			entry.watcher.close();
			watches.delete(root);
		}
		return { ok: true };
	}
	for (const [key, entry] of watches) {
		entry.watcher.close();
		watches.delete(key);
	}
	return { ok: true };
}

/**
 * Prefer `bun` + absolute CLI entry so agents work without a global `quester` on PATH.
 * Falls back to `quester` when the monorepo CLI dist is not present (published install).
 */
export function buildMcpConfigSnippet(workspace: string): {
	cursor: string;
	vscode: string;
	claudeDesktop: string;
} {
	const abs = resolve(workspace).replace(/\\/g, "/");
	const cliJs = resolveMonorepoCliJs(abs);
	const command = cliJs ? "bun" : "quester";
	const args = cliJs
		? [cliJs.replace(/\\/g, "/"), "mcp", "serve", "--workspace", abs]
		: ["mcp", "serve", "--workspace", abs];
	const cursor = {
		mcpServers: {
			quester: {
				command,
				args,
			},
		},
	};
	const vscode = {
		servers: {
			quester: {
				command,
				args,
			},
		},
	};
	return {
		cursor: `${JSON.stringify(cursor, null, 2)}\n`,
		vscode: `${JSON.stringify(vscode, null, 2)}\n`,
		claudeDesktop: `${JSON.stringify(cursor, null, 2)}\n`,
	};
}

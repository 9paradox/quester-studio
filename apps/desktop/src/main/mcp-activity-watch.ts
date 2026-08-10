import { type FSWatcher, existsSync, watch } from "node:fs";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export type McpActivityEvent = {
	ts: string;
	tool: string;
	ok: boolean;
	summary: string;
	flowId?: string;
	nodeId?: string;
	durationMs?: number;
	error?: string;
};

type WatchEntry = {
	fileWatcher: FSWatcher | null;
	dirWatcher: FSWatcher | null;
	workspace: string;
	/** Byte offset of next unread byte (always on a line boundary). */
	offset: number;
	pollTimer: ReturnType<typeof setInterval> | null;
	draining: boolean;
	pendingDrain: boolean;
};

const watches = new Map<string, WatchEntry>();
const SEED_TAIL = 50;
const POLL_MS = 250;

export function mcpActivityLogPath(workspace: string): string {
	return join(resolve(workspace), ".quester", "mcp-activity.jsonl");
}

function parseLines(chunk: string): McpActivityEvent[] {
	const out: McpActivityEvent[] = [];
	for (const line of chunk.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const row = JSON.parse(trimmed) as Partial<McpActivityEvent>;
			if (typeof row.tool !== "string" || typeof row.summary !== "string") {
				continue;
			}
			out.push({
				ts: typeof row.ts === "string" ? row.ts : new Date().toISOString(),
				tool: row.tool,
				ok: row.ok !== false,
				summary: row.summary,
				...(typeof row.flowId === "string" ? { flowId: row.flowId } : {}),
				...(typeof row.nodeId === "string" ? { nodeId: row.nodeId } : {}),
				...(typeof row.durationMs === "number"
					? { durationMs: row.durationMs }
					: {}),
				...(typeof row.error === "string" ? { error: row.error } : {}),
			});
		} catch {
			/* skip bad lines */
		}
	}
	return out;
}

/**
 * Read new bytes from offset. Only advance past complete lines so a mid-write
 * append cannot drop the final incomplete record.
 */
async function drain(
	entry: WatchEntry,
	onEvent: (event: McpActivityEvent) => void,
): Promise<void> {
	if (entry.draining) {
		entry.pendingDrain = true;
		return;
	}
	entry.draining = true;
	try {
		do {
			entry.pendingDrain = false;
			const path = mcpActivityLogPath(entry.workspace);
			if (!existsSync(path)) continue;
			const size = (await stat(path)).size;
			if (size < entry.offset) {
				entry.offset = 0;
			}
			if (size === entry.offset) continue;

			const fh = await open(path, "r");
			try {
				const length = size - entry.offset;
				const buf = Buffer.alloc(length);
				await fh.read(buf, 0, length, entry.offset);
				const chunk = buf.toString("utf8");
				const lastNl = chunk.lastIndexOf("\n");
				if (lastNl < 0) {
					// Incomplete line — wait for more bytes.
					continue;
				}
				const complete = chunk.slice(0, lastNl + 1);
				entry.offset += Buffer.byteLength(complete, "utf8");
				for (const event of parseLines(complete)) {
					onEvent(event);
				}
			} finally {
				await fh.close();
			}
		} while (entry.pendingDrain);
	} finally {
		entry.draining = false;
	}
}

function ensureFileWatcher(
	entry: WatchEntry,
	onEvent: (event: McpActivityEvent) => void,
): void {
	const path = mcpActivityLogPath(entry.workspace);
	if (entry.fileWatcher || !existsSync(path)) return;
	try {
		entry.fileWatcher = watch(path, { persistent: true }, () => {
			void drain(entry, onEvent).catch((err) => {
				console.error("[mcp-activity] drain failed", err);
			});
		});
	} catch (err) {
		console.error("[mcp-activity] file watch failed", err);
	}
}

async function seedTail(
	path: string,
	max: number,
): Promise<{ events: McpActivityEvent[]; size: number }> {
	if (!existsSync(path)) return { events: [], size: 0 };
	const size = (await stat(path)).size;
	const text = await readFile(path, "utf8");
	const events = parseLines(text).slice(-max);
	return { events, size };
}

export async function watchMcpActivity(
	workspace: string,
	onEvent: (event: McpActivityEvent) => void,
): Promise<{ ok: true; seeded: number }> {
	const root = resolve(workspace);
	await stopWatchMcpActivity(root);
	const questerDir = join(root, ".quester");
	await mkdir(questerDir, { recursive: true });

	const path = mcpActivityLogPath(root);
	const { events: seed, size } = await seedTail(path, SEED_TAIL);

	const entry: WatchEntry = {
		fileWatcher: null,
		dirWatcher: null,
		workspace: root,
		offset: size,
		pollTimer: null,
		draining: false,
		pendingDrain: false,
	};

	try {
		entry.dirWatcher = watch(
			questerDir,
			{ persistent: true },
			(_t, filename) => {
				const name = filename?.toString() ?? "";
				if (name && name !== "mcp-activity.jsonl") return;
				ensureFileWatcher(entry, onEvent);
				void drain(entry, onEvent).catch((err) => {
					console.error("[mcp-activity] drain failed", err);
				});
			},
		);
	} catch (err) {
		console.error("[mcp-activity] dir watch failed", err);
	}

	ensureFileWatcher(entry, onEvent);

	entry.pollTimer = setInterval(() => {
		ensureFileWatcher(entry, onEvent);
		void drain(entry, onEvent).catch((err) => {
			console.error("[mcp-activity] drain failed", err);
		});
	}, POLL_MS);

	watches.set(root, entry);

	// Seed after watchers are armed so live events don't race before UI is ready.
	for (const event of seed) {
		onEvent(event);
	}

	return { ok: true, seeded: seed.length };
}

export async function stopWatchMcpActivity(
	workspace?: string,
): Promise<{ ok: true }> {
	const close = (entry: WatchEntry) => {
		entry.fileWatcher?.close();
		entry.dirWatcher?.close();
		if (entry.pollTimer) clearInterval(entry.pollTimer);
	};
	if (workspace) {
		const root = resolve(workspace);
		const entry = watches.get(root);
		if (entry) {
			close(entry);
			watches.delete(root);
		}
		return { ok: true };
	}
	for (const [key, entry] of watches) {
		close(entry);
		watches.delete(key);
	}
	return { ok: true };
}

/** Test helper: read full activity file. */
export async function readMcpActivityFile(
	workspace: string,
): Promise<McpActivityEvent[]> {
	const path = mcpActivityLogPath(workspace);
	if (!existsSync(path)) return [];
	const text = await readFile(path, "utf8");
	return parseLines(text);
}

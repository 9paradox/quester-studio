import { afterEach, describe, expect, test } from "bun:test";
import { appendFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	mcpActivityLogPath,
	stopWatchMcpActivity,
	watchMcpActivity,
} from "./mcp-activity-watch.js";

afterEach(async () => {
	await stopWatchMcpActivity();
});

describe("mcp-activity-watch", () => {
	test("seeds existing history then emits new jsonl lines", async () => {
		const root = await mkdtemp(join(tmpdir(), "qs-mcp-watch-"));
		await mkdir(join(root, ".quester"), { recursive: true });
		await writeFile(
			mcpActivityLogPath(root),
			`${JSON.stringify({
				ts: new Date().toISOString(),
				tool: "list_flows",
				ok: true,
				summary: "Listed flows",
			})}\n`,
			"utf8",
		);

		const events: Array<{ tool: string }> = [];
		await watchMcpActivity(root, (e) => {
			events.push(e);
		});
		expect(events.some((e) => e.tool === "list_flows")).toBe(true);

		await appendFile(
			mcpActivityLogPath(root),
			`${JSON.stringify({
				ts: new Date().toISOString(),
				tool: "read_flow",
				ok: true,
				summary: "Read flow demo",
				flowId: "demo",
			})}\n`,
			"utf8",
		);
		for (
			let i = 0;
			i < 30 && !events.some((e) => e.tool === "read_flow");
			i++
		) {
			await Bun.sleep(50);
		}
		expect(events.some((e) => e.tool === "read_flow")).toBe(true);
	});

	test("does not drop incomplete trailing line", async () => {
		const root = await mkdtemp(join(tmpdir(), "qs-mcp-watch-partial-"));
		await mkdir(join(root, ".quester"), { recursive: true });
		const events: Array<{ tool: string }> = [];
		await watchMcpActivity(root, (e) => {
			events.push(e);
		});

		const path = mcpActivityLogPath(root);
		// Partial write (no newline yet)
		await appendFile(
			path,
			'{"ts":"2026-01-01T00:00:00.000Z","tool":"run_flow"',
			"utf8",
		);
		await Bun.sleep(300);
		expect(events.some((e) => e.tool === "run_flow")).toBe(false);

		// Complete the line
		await appendFile(path, ',"ok":true,"summary":"Ran demo"}\n', "utf8");
		for (let i = 0; i < 30 && !events.some((e) => e.tool === "run_flow"); i++) {
			await Bun.sleep(50);
		}
		expect(events.some((e) => e.tool === "run_flow")).toBe(true);
	});
});

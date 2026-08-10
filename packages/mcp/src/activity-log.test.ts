import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	MCP_MUTATING_TOOLS,
	appendMcpActivity,
	mcpActivityLogPath,
	summarizeToolArgs,
} from "./activity-log.js";

describe("activity-log", () => {
	test("summarizeToolArgs never embeds patch bodies", () => {
		const s = summarizeToolArgs("patch_flow", {
			flowId: "login",
			patch: { nodes: [{ data: { Authorization: "secret" } }] },
		});
		expect(s.summary).toBe("Patched flow login");
		expect(s.flowId).toBe("login");
		expect(JSON.stringify(s)).not.toContain("secret");
	});

	test("appendMcpActivity writes jsonl under .quester", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-mcp-act-"));
		await appendMcpActivity(root, {
			tool: "list_flows",
			ok: true,
			summary: "Listed flows",
			durationMs: 3,
		});
		const text = await readFile(mcpActivityLogPath(root), "utf8");
		const row = JSON.parse(text.trim()) as { tool: string; ok: boolean };
		expect(row.tool).toBe("list_flows");
		expect(row.ok).toBe(true);
	});

	test("mutating tools set includes patch/save", () => {
		expect(MCP_MUTATING_TOOLS.has("patch_node")).toBe(true);
		expect(MCP_MUTATING_TOOLS.has("list_flows")).toBe(false);
	});
});

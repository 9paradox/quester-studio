import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffoldWorkspace } from "./scaffold.js";
import { loadWorkspace } from "./workspace.js";

describe("scaffoldWorkspace", () => {
	test("creates a loadable workspace with start → input", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-scaffold-"));
		try {
			const result = await scaffoldWorkspace(dir, { name: "demo" });
			expect(result.name).toBe("demo");
			expect(result.flowId).toBe("hello");
			const ws = await loadWorkspace(result.root);
			expect(ws.manifest.name).toBe("demo");
			expect(ws.flows.hello?.nodes.map((n) => n.type)).toEqual([
				"start",
				"input",
			]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("refuses existing quester.json", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-scaffold-"));
		try {
			await scaffoldWorkspace(dir);
			await expect(scaffoldWorkspace(dir)).rejects.toThrow(/already exists/);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});

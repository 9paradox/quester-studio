import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	deleteRunPath,
	listRunTree,
	readRunJson,
	resolveRunRelativePath,
	resolveRunsRoot,
} from "./run-logs.js";

async function makeWorkspace(): Promise<string> {
	const dir = join(
		tmpdir(),
		`quester-runs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	await mkdir(join(dir, "flows"), { recursive: true });
	await mkdir(join(dir, "environments"), { recursive: true });
	await writeFile(
		join(dir, "quester.json"),
		`${JSON.stringify(
			{
				version: "v1",
				name: "run-logs-test",
				flowsDir: "flows",
				environmentsDir: "environments",
				runs: { enabled: true, dir: "runs" },
			},
			null,
			2,
		)}\n`,
		"utf8",
	);
	await writeFile(
		join(dir, "environments", "local.json"),
		`${JSON.stringify({ version: "v1", name: "local", variables: {} }, null, 2)}\n`,
		"utf8",
	);
	return dir;
}

describe("run-logs path safety", () => {
	test("resolveRunsRoot stays inside workspace", () => {
		const root = resolveRunsRoot("/tmp/ws", "runs");
		expect(root.replaceAll("\\", "/")).toMatch(/\/runs$/);
	});

	test("resolveRunsRoot rejects escape via runs.dir", () => {
		expect(() => resolveRunsRoot("/tmp/ws", "../outside")).toThrow(
			/Invalid runs directory/,
		);
	});

	test("resolveRunRelativePath accepts nested posix paths", () => {
		const runsRoot = resolveRunsRoot("/tmp/ws", "runs");
		const resolved = resolveRunRelativePath(
			runsRoot,
			"login/2026-01-01T00-00-00Z/meta.json",
		);
		expect(resolved.replaceAll("\\", "/")).toContain(
			"login/2026-01-01T00-00-00Z/meta.json",
		);
	});

	test("resolveRunRelativePath rejects .. segments", () => {
		const runsRoot = resolveRunsRoot("/tmp/ws", "runs");
		expect(() =>
			resolveRunRelativePath(runsRoot, "../secrets/local.secrets.json"),
		).toThrow(/Invalid run path/);
		expect(() =>
			resolveRunRelativePath(runsRoot, "a/../../etc/passwd"),
		).toThrow(/Invalid run path/);
	});

	test("resolveRunRelativePath rejects absolute paths", () => {
		const runsRoot = resolveRunsRoot("/tmp/ws", "runs");
		expect(() => resolveRunRelativePath(runsRoot, "/etc/passwd")).toThrow(
			/Invalid run path/,
		);
		expect(() =>
			resolveRunRelativePath(runsRoot, "C:/Windows/system.ini"),
		).toThrow(/Invalid run path/);
	});
});

describe("listRunTree / readRunJson", () => {
	test("returns empty when runs dir missing", async () => {
		const ws = await makeWorkspace();
		try {
			expect(await listRunTree(ws)).toEqual([]);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	test("lists nested runs and reads step json", async () => {
		const ws = await makeWorkspace();
		const runDir = join(
			ws,
			"runs",
			"login-and-profile",
			"2026-04-01T12-00-00Z",
		);
		await mkdir(runDir, { recursive: true });
		await writeFile(
			join(runDir, "meta.json"),
			`${JSON.stringify({
				flowId: "login-and-profile",
				flowName: "Login",
				env: "local",
				startedAt: "2026-04-01T12:00:00Z",
				finishedAt: "2026-04-01T12:00:01Z",
				status: "success",
			})}\n`,
		);
		await writeFile(
			join(runDir, "001-login.json"),
			`${JSON.stringify({
				seq: 1,
				nodeId: "login",
				type: "http",
				input: { url: "https://example.com" },
				processedInput: { url: "https://example.com" },
				output: { status: 200, body: { token: "***" } },
			})}\n`,
		);

		try {
			const tree = await listRunTree(ws);
			expect(tree).toHaveLength(1);
			expect(tree[0]?.flowId).toBe("login-and-profile");
			expect(tree[0]?.runs).toHaveLength(1);
			expect(tree[0]?.runs[0]?.meta?.status).toBe("success");
			expect(tree[0]?.runs[0]?.files.map((f) => f.name)).toEqual([
				"001-login.json",
				"meta.json",
			]);

			const step = (await readRunJson(
				ws,
				"login-and-profile/2026-04-01T12-00-00Z/001-login.json",
			)) as { nodeId: string; output: { body: { token: string } } };
			expect(step.nodeId).toBe("login");
			expect(step.output.body.token).toBe("***");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	test("readRunJson rejects path escape", async () => {
		const ws = await makeWorkspace();
		await mkdir(join(ws, "runs", "a", "b"), { recursive: true });
		await writeFile(
			join(ws, "environments", "local.secrets.json"),
			`${JSON.stringify({ version: "v1", secrets: { TOKEN: "secret" } })}\n`,
		);
		try {
			await expect(
				readRunJson(ws, "../environments/local.secrets.json"),
			).rejects.toThrow(/Invalid run path/);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	test("deleteRunPath removes file and run folder; rejects escape", async () => {
		const ws = await makeWorkspace();
		const runDir = join(ws, "runs", "flow-a", "2026-01-01T00-00-00Z");
		await mkdir(runDir, { recursive: true });
		await writeFile(join(runDir, "meta.json"), "{}\n");
		await writeFile(join(runDir, "001-x.json"), "{}\n");
		try {
			await deleteRunPath(ws, "flow-a/2026-01-01T00-00-00Z/001-x.json");
			const afterFile = await listRunTree(ws);
			expect(afterFile[0]?.runs[0]?.files.map((f) => f.name)).toEqual([
				"meta.json",
			]);

			await deleteRunPath(ws, "flow-a/2026-01-01T00-00-00Z");
			expect(await listRunTree(ws)).toEqual([{ flowId: "flow-a", runs: [] }]);
			await deleteRunPath(ws, "flow-a");
			expect(await listRunTree(ws)).toEqual([]);

			await expect(
				deleteRunPath(ws, "../environments/local.json"),
			).rejects.toThrow(/Invalid run path/);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});
});

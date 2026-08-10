import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	applyMergePatch,
	createMcpWorkspaceContext,
	inspectLastRunTool,
	listFlowsTool,
	patchFlowTool,
	readFlowTool,
	runFlowTool,
	saveFlowTool,
	validateFlowTool,
} from "./handlers.js";
import { assertSafeFlowId, isPathInside } from "./path-safety.js";

const sampleRoot = resolve(
	import.meta.dir,
	"../../../examples/sample-workspace",
);

function parseToolJson(result: {
	content: Array<{ type: string; text?: string }>;
	isError?: boolean;
}) {
	expect(result.isError).toBeFalsy();
	const text = result.content[0]?.text;
	expect(typeof text).toBe("string");
	return JSON.parse(text as string) as unknown;
}

describe("path safety", () => {
	test("rejects unsafe flow ids", () => {
		expect(() => assertSafeFlowId("../etc")).toThrow();
		expect(() => assertSafeFlowId("a/b")).toThrow();
		expect(() => assertSafeFlowId("ok-flow")).not.toThrow();
	});

	test("isPathInside", () => {
		const root = resolve("/tmp/ws");
		expect(isPathInside(root, join(root, "flows", "a.flow.json"))).toBe(true);
		expect(isPathInside(root, resolve(root, "..", "other"))).toBe(false);
	});
});

describe("MCP handlers (sample workspace)", () => {
	test("list_flows returns sample flows", async () => {
		const ctx = createMcpWorkspaceContext(sampleRoot);
		const data = parseToolJson(await listFlowsTool(ctx)) as {
			flows: Array<{ id: string }>;
		};
		expect(data.flows.some((f) => f.id === "login-and-profile")).toBe(true);
	});

	test("read_flow and validate_flow", async () => {
		const ctx = createMcpWorkspaceContext(sampleRoot);
		const flow = parseToolJson(
			await readFlowTool(ctx, { flowId: "login-and-profile" }),
		) as { id: string };
		expect(flow.id).toBe("login-and-profile");

		const ok = parseToolJson(
			await validateFlowTool(ctx, { flowId: "login-and-profile" }),
		) as { ok: boolean };
		expect(ok.ok).toBe(true);

		const bad = await readFlowTool(ctx, { flowId: "../escape" });
		expect(bad.isError).toBe(true);
	});

	test("run_flow + inspect_last_run", async () => {
		const ctx = createMcpWorkspaceContext(sampleRoot);
		const run = parseToolJson(
			await runFlowTool(ctx, {
				flowId: "login-and-profile",
				env: "local",
				input: { username: "emilys", password: "emilyspass" },
			}),
		) as {
			ok: boolean;
			flowId: string;
			steps: unknown[];
			outputShape: { typescript: string; paths: string[] };
			output?: unknown;
		};
		expect(run.ok).toBe(true);
		expect(run.flowId).toBe("login-and-profile");
		expect(run.steps.length).toBeGreaterThan(0);
		expect(run.output).toBeUndefined();
		expect(run.outputShape.typescript).toContain("type Root");

		const inspect = parseToolJson(
			await inspectLastRunTool(ctx, { flowId: "login-and-profile" }),
		) as {
			ok: boolean;
			flowId: string;
			output: { typescript: string; values?: unknown };
		};
		expect(inspect.ok).toBe(true);
		expect(inspect.flowId).toBe("login-and-profile");
		expect(inspect.output.values).toBeUndefined();
	}, 60_000);
});

describe("save_flow / patch_flow", () => {
	test("round-trip write and merge patch in temp workspace", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-mcp-"));
		try {
			await mkdir(join(dir, "environments"), { recursive: true });
			await mkdir(join(dir, "flows"), { recursive: true });
			await writeFile(
				join(dir, "quester.json"),
				`${JSON.stringify(
					{
						name: "mcp-test",
						version: "v1",
						flowsDir: "flows",
						environmentsDir: "environments",
					},
					null,
					2,
				)}\n`,
			);
			await writeFile(
				join(dir, "environments", "local.json"),
				`${JSON.stringify({ name: "local", version: "v1", variables: {} }, null, 2)}\n`,
			);

			const flow = {
				id: "agent-flow",
				version: "v1",
				name: "Agent Flow",
				nodes: [
					{ id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
					{
						id: "out",
						type: "output",
						position: { x: 200, y: 0 },
						data: { label: "Out" },
					},
				],
				edges: [{ id: "e1", source: "start", target: "out" }],
			};

			const ctx = createMcpWorkspaceContext(dir);
			const saved = parseToolJson(await saveFlowTool(ctx, { flow })) as {
				ok: boolean;
				flowId: string;
			};
			expect(saved.ok).toBe(true);

			const patched = parseToolJson(
				await patchFlowTool(ctx, {
					flowId: "agent-flow",
					patch: { description: "patched by agent" },
				}),
			) as { ok: boolean; flow: { description?: string } };
			expect(patched.ok).toBe(true);
			expect(patched.flow.description).toBe("patched by agent");

			const disk = JSON.parse(
				await readFile(join(dir, "flows", "agent-flow.flow.json"), "utf8"),
			) as { description?: string };
			expect(disk.description).toBe("patched by agent");

			const escapeAttempt = await saveFlowTool(ctx, {
				flow: { ...flow, id: "../evil" },
			});
			const escapeText = escapeAttempt.content[0]?.text ?? "";
			expect(
				escapeAttempt.isError === true ||
					escapeText.includes("Invalid") ||
					escapeText.includes("must not") ||
					escapeText.includes('"ok": false'),
			).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("applyMergePatch", () => {
		expect(
			applyMergePatch({ a: 1, b: { c: 2 } }, { b: { c: null, d: 3 } }),
		).toEqual({
			a: 1,
			b: { d: 3 },
		});
	});
});

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLOW_VERSION } from "@quester-studio/schema";
import { EngineEventEmitter } from "./events.js";
import { executeFlow } from "./execute.js";
import {
	RunFileLogger,
	collectSecretValues,
	createRunDirName,
	redactForRunLog,
} from "./run-log.js";

describe("run file logging", () => {
	test("redactForRunLog masks secrets and Authorization", () => {
		const redacted = redactForRunLog(
			{
				Authorization: "Bearer secret-token",
				body: "token=secret-token",
				nested: { password: "secret-token" },
			},
			["secret-token"],
		) as Record<string, unknown>;
		expect(redacted.Authorization).toBe("***");
		expect(redacted.body).toBe("token=***");
		expect((redacted.nested as { password: string }).password).toBe("***");
	});

	test("redactForRunLog masks Cookie and Set-Cookie headers", () => {
		const redacted = redactForRunLog(
			{
				headers: {
					Cookie: "session=abc",
					"Set-Cookie": "session=abc; Path=/",
					"Content-Type": "application/json",
				},
			},
			[],
		) as { headers: Record<string, string> };
		expect(redacted.headers.Cookie).toBe("***");
		expect(redacted.headers["Set-Cookie"]).toBe("***");
		expect(redacted.headers["Content-Type"]).toBe("application/json");
	});

	test("collectSecretValues flattens string secrets", () => {
		expect(collectSecretValues({ a: "x", b: 1, c: true })).toEqual([
			"x",
			"1",
			"true",
		]);
	});

	test("executeFlow writes meta + step files with processedInput", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-runlog-"));
		const runDir = join(root, "hello", createRunDirName());
		await mkdir(runDir, { recursive: true });
		const logger = new RunFileLogger({
			runDir,
			secretValues: ["sekrit"],
			meta: {
				flowId: "hello",
				startedAt: new Date().toISOString(),
				status: "running",
			},
		});
		await logger.init();

		const flow = {
			id: "hello",
			version: FLOW_VERSION,
			name: "Hello",
			nodes: [
				{
					id: "start",
					type: "start",
					data: { label: "Start" },
					position: { x: 0, y: 0 },
				},
				{
					id: "input",
					type: "input",
					data: { label: "In", value: { username: "u" } },
					position: { x: 100, y: 0 },
				},
				{
					id: "setMsg",
					type: "set",
					data: {
						label: "Set",
						variables: { greeting: "hi {{secrets.token}}" },
					},
					position: { x: 200, y: 0 },
				},
				{
					id: "output",
					type: "output",
					data: { label: "Out" },
					position: { x: 300, y: 0 },
				},
			],
			edges: [
				{ id: "e0", source: "start", target: "input", sourceHandle: null },
				{ id: "e1", source: "input", target: "setMsg", sourceHandle: null },
				{ id: "e2", source: "setMsg", target: "output", sourceHandle: null },
			],
		};

		const result = await executeFlow(flow as never, {
			input: { username: "u" },
			secrets: { token: "sekrit" },
			runLogger: logger,
		});
		expect(result.runDir).toBe(runDir);
		expect(result.steps.length).toBeGreaterThanOrEqual(3);

		const files = (await readdir(runDir)).sort();
		expect(files).toContain("meta.json");
		expect(files.some((f) => f.startsWith("001-"))).toBe(true);

		const meta = JSON.parse(await readFile(join(runDir, "meta.json"), "utf8"));
		expect(meta.status).toBe("success");
		expect(meta.flowId).toBe("hello");

		const setStepName = files.find((f) => f.includes("setMsg"));
		expect(setStepName).toBeDefined();
		const setStep = JSON.parse(
			await readFile(join(runDir, setStepName as string), "utf8"),
		);
		expect(setStep.processedInput).toBeDefined();
		const dumped = JSON.stringify(setStep);
		expect(dumped).not.toContain("sekrit");
		expect(dumped).toContain("***");
	});

	test("cancel between nodes marks meta status cancelled", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-runlog-cancel-"));
		const runDir = join(root, "abort", createRunDirName());
		await mkdir(runDir, { recursive: true });
		const logger = new RunFileLogger({
			runDir,
			meta: {
				flowId: "abort",
				startedAt: new Date().toISOString(),
				status: "running",
			},
		});
		await logger.init();

		const flow = {
			id: "abort",
			version: FLOW_VERSION,
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "a",
					type: "set",
					data: { variables: { step: "a" } },
					position: { x: 100, y: 0 },
				},
				{
					id: "b",
					type: "set",
					data: { variables: { step: "b" } },
					position: { x: 200, y: 0 },
				},
				{ id: "out", type: "output", data: {}, position: { x: 300, y: 0 } },
			],
			edges: [
				{ id: "e0", source: "start", target: "a", sourceHandle: null },
				{ id: "e1", source: "a", target: "b", sourceHandle: null },
				{ id: "e2", source: "b", target: "out", sourceHandle: null },
			],
		};

		const controller = new AbortController();
		const events = new EngineEventEmitter();
		events.on("node:after", ({ nodeId }) => {
			if (nodeId === "a") controller.abort();
		});

		try {
			await executeFlow(flow as never, {
				events,
				signal: controller.signal,
				runLogger: logger,
			});
			expect.unreachable("should throw");
		} catch {
			// expected cancel
		}

		const meta = JSON.parse(await readFile(join(runDir, "meta.json"), "utf8"));
		expect(meta.status).toBe("cancelled");
		expect(meta.finishedAt).toBeDefined();
	});
});

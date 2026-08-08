import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	assertBindAllowed,
	assertWorkspaceAllowed,
	handleRequest,
	startServer,
} from "./index.js";

const sampleWorkspace = join(
	import.meta.dir,
	"../../../examples/sample-workspace",
);

describe("apps/api", () => {
	const server = startServer({ port: 0, hostname: "127.0.0.1" });
	const base = `http://127.0.0.1:${server.port}`;

	afterAll(() => {
		server.stop(true);
	});

	test("GET /health", async () => {
		const res = await fetch(`${base}/health`);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	test("list flows via HTTP", async () => {
		const res = await fetch(`${base}/v1/flows/list`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ workspace: sampleWorkspace }),
		});
		expect(res.status).toBe(200);
		const flows = (await res.json()) as Array<{ id: string }>;
		expect(flows.some((f) => f.id === "login-and-profile")).toBe(true);
	});

	test("handleRequest 404", async () => {
		const res = await handleRequest(
			new Request("http://localhost/nope", { method: "GET" }),
		);
		expect(res.status).toBe(404);
	});

	test("CORS allows localhost origins and does not reflect remote Origin", async () => {
		const local = await handleRequest(
			new Request("http://127.0.0.1/health", {
				headers: { origin: "http://localhost:5173" },
			}),
		);
		expect(local.headers.get("access-control-allow-origin")).toBe(
			"http://localhost:5173",
		);
		expect(local.headers.get("access-control-allow-credentials")).toBe("true");

		const remote = await handleRequest(
			new Request("http://127.0.0.1/health", {
				headers: { origin: "https://evil.example" },
			}),
		);
		expect(remote.headers.get("access-control-allow-origin")).toBe(
			"http://127.0.0.1",
		);
		expect(remote.headers.get("access-control-allow-credentials")).toBeNull();
	});

	test("assertBindAllowed refuses non-loopback without opt-in", () => {
		expect(() => assertBindAllowed("0.0.0.0", {} as NodeJS.ProcessEnv)).toThrow(
			/Refusing to bind/,
		);
		expect(() =>
			assertBindAllowed("0.0.0.0", {
				QUESTER_API_ALLOW_REMOTE: "1",
			} as NodeJS.ProcessEnv),
		).not.toThrow();
		expect(() =>
			assertBindAllowed("127.0.0.1", {} as NodeJS.ProcessEnv),
		).not.toThrow();
	});

	test("assertWorkspaceAllowed jails under QUESTER_WORKSPACE_ROOT", () => {
		const root = sampleWorkspace;
		expect(() =>
			assertWorkspaceAllowed(join(root, "flows"), {
				QUESTER_WORKSPACE_ROOT: root,
			} as NodeJS.ProcessEnv),
		).not.toThrow();
		expect(() =>
			assertWorkspaceAllowed(join(root, "..", "other"), {
				QUESTER_WORKSPACE_ROOT: root,
			} as NodeJS.ProcessEnv),
		).toThrow(/outside QUESTER_WORKSPACE_ROOT/);
	});

	test("POST rejects workspace outside QUESTER_WORKSPACE_ROOT", async () => {
		const prev = process.env.QUESTER_WORKSPACE_ROOT;
		process.env.QUESTER_WORKSPACE_ROOT = sampleWorkspace;
		try {
			const res = await fetch(`${base}/v1/flows/list`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					workspace: join(sampleWorkspace, "..", "escape-me"),
				}),
			});
			expect(res.status).toBe(400);
			const body = (await res.json()) as { error: string };
			expect(body.error).toMatch(/outside QUESTER_WORKSPACE_ROOT/);
		} finally {
			if (prev === undefined) process.env.QUESTER_WORKSPACE_ROOT = undefined;
			else process.env.QUESTER_WORKSPACE_ROOT = prev;
		}
	});
});

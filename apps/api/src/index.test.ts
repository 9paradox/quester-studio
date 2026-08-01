import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { handleRequest, startServer } from "./index.js";

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
});

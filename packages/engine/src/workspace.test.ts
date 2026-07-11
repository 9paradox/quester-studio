import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSecrets, loadWorkspace } from "./workspace.js";

const sampleWorkspace = join(
	import.meta.dir,
	"../../../examples/sample-workspace",
);

describe("loadWorkspace", () => {
	test("loads the sample workspace", async () => {
		const ws = await loadWorkspace(sampleWorkspace);
		expect(ws.manifest.name).toBe("sample-workspace");
		expect(ws.environments.local?.variables.API_BASE).toBe(
			"https://jsonplaceholder.typicode.com",
		);
		expect(ws.flows["login-and-profile"]).toBeDefined();
	});
});

describe("loadSecrets", () => {
	test("returns empty object when secrets file is missing", async () => {
		const secrets = await loadSecrets(sampleWorkspace, "local");
		expect(secrets).toEqual({});
	});

	test("returns empty object for invalid JSON", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-secrets-"));
		try {
			const envDir = join(dir, "environments");
			await mkdir(envDir, { recursive: true });
			await writeFile(join(envDir, "local.secrets.json"), "not-json", "utf8");
			const secrets = await loadSecrets(dir, "local");
			expect(secrets).toEqual({});
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("parses valid secrets file", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-secrets-"));
		try {
			const envDir = join(dir, "environments");
			await mkdir(envDir, { recursive: true });
			await writeFile(
				join(envDir, "local.secrets.json"),
				JSON.stringify({ version: "v1", secrets: { API_TOKEN: "test-token" } }),
				"utf8",
			);
			const secrets = await loadSecrets(dir, "local");
			expect(secrets).toEqual({ API_TOKEN: "test-token" });
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});

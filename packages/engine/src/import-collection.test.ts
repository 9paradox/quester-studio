import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRequest } from "@quester-studio/schema";
import { importPostmanCollectionFile } from "./import-collection.js";
import { scaffoldWorkspace } from "./scaffold.js";

const fixture = join(import.meta.dir, "fixtures/postman-mini.json");

describe("importPostmanCollectionFile", () => {
	const dirs: string[] = [];

	afterEach(async () => {
		await Promise.all(
			dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
		);
	});

	test("writes RequestV1 files under collectionsDir", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-import-"));
		dirs.push(dir);
		await scaffoldWorkspace(dir, { name: "import-test" });

		const result = await importPostmanCollectionFile(dir, fixture);
		expect(result.imported).toEqual([
			"demo-api/auth/login",
			"demo-api/get-user",
		]);
		expect(result.skipped).toEqual([]);

		const loginRaw = await readFile(
			join(dir, "collections/demo-api/auth/login.request.json"),
			"utf8",
		);
		const login = JSON.parse(loginRaw) as unknown;
		const parsed = validateRequest(login);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.method).toBe("POST");
		expect(parsed.data.url).toBe("https://api.example.com/auth/login");
		expect(parsed.data.headers["Content-Type"]).toBe("application/json");
		expect(parsed.data.headers["X-Debug"]).toBeUndefined();
		expect(parsed.data.body).toEqual({
			username: "demo",
			password: "secret",
		});

		const getUserRaw = await readFile(
			join(dir, "collections/demo-api/get-user.request.json"),
			"utf8",
		);
		const getUser = validateRequest(JSON.parse(getUserRaw));
		expect(getUser.success).toBe(true);
		if (!getUser.success) return;
		expect(getUser.data.method).toBe("GET");
		expect(getUser.data.url).toBe("https://api.example.com/users/1");
	});
});

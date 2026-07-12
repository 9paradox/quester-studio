import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	listRequests,
	loadRequest,
	requestPathFromFile,
	saveRequest,
} from "./collections.js";

const manifest = {
	name: "test",
	version: "v1" as const,
	flowsDir: "flows",
	environmentsDir: "environments",
	collectionsDir: "collections",
};

describe("collections", () => {
	test("requestPathFromFile strips extension", () => {
		expect(
			requestPathFromFile(
				join("/ws", "collections", "Auth", "login.request.json"),
				join("/ws", "collections"),
			),
		).toBe("Auth/login");
	});

	test("list and load requests from nested folders", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-col-"));
		try {
			const dir = join(root, "collections", "Auth");
			await mkdir(dir, { recursive: true });
			await writeFile(
				join(dir, "login.request.json"),
				JSON.stringify({
					version: "v1",
					id: "login",
					name: "Login",
					method: "POST",
					url: "https://dummyjson.com/auth/login",
					headers: {},
					body: { username: "emilys", password: "emilyspass" },
				}),
			);
			const list = await listRequests(root, manifest);
			expect(list).toHaveLength(1);
			expect(list[0]?.path).toBe("Auth/login");
			const req = await loadRequest(root, manifest, "Auth/login");
			expect(req.name).toBe("Login");
			expect(req.method).toBe("POST");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("saveRequest creates nested path", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-col-"));
		try {
			await saveRequest(root, manifest, "Users/profile", {
				version: "v1",
				id: "profile",
				name: "Get profile",
				method: "GET",
				url: "https://dummyjson.com/users/1",
				headers: {},
			});
			const req = await loadRequest(root, manifest, "Users/profile");
			expect(req.id).toBe("profile");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("listCollectionFolders includes empty folders", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-col-"));
		try {
			await mkdir(join(root, "collections", "Empty"), { recursive: true });
			const { listCollectionFolders } = await import("./collections.js");
			const folders = await listCollectionFolders(root, manifest);
			expect(folders).toContain("Empty");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

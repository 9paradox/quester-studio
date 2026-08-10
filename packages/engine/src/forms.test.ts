import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorkspaceV1 } from "@quester-studio/schema";
import { executeFlow } from "./execute.js";
import {
	createForm,
	deleteForm,
	listForms,
	loadForm,
	renameForm,
	saveForm,
} from "./forms.js";
import { resolveTemplateValue } from "./variables.js";
import "@quester-studio/nodes";

const manifest: WorkspaceV1 = {
	name: "test",
	version: "v1",
	flowsDir: "flows",
	environmentsDir: "environments",
	collectionsDir: "collections",
	formsDir: "forms",
};

describe("forms CRUD", () => {
	test("create list load rename delete", async () => {
		const root = await mkdtemp(join(tmpdir(), "quester-forms-"));
		try {
			await createForm(root, manifest, "search", "Search");
			expect(await listForms(root, manifest)).toEqual([
				{ id: "search", name: "Search" },
			]);
			const form = await loadForm(root, manifest, "search");
			form.fields = [{ id: "q", type: "string", required: true }];
			await saveForm(root, manifest, form);
			const renamed = await renameForm(
				root,
				manifest,
				"search",
				"find",
				"Find",
			);
			expect(renamed.id).toBe("find");
			expect(renamed.name).toBe("Find");
			await deleteForm(root, manifest, "find");
			expect(await listForms(root, manifest)).toEqual([]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("resolveTemplateValue", () => {
	test("returns raw arrays for single-token templates", () => {
		const ctx = {
			env: {},
			secrets: {},
			input: {},
			vars: {},
			nodeOutputs: {
				search: { body: { products: [{ id: 1 }] } },
			},
		};
		expect(resolveTemplateValue("{{nodes.search.body.products}}", ctx)).toEqual(
			[{ id: 1 }],
		);
	});
});

describe("executeFlow form await", () => {
	test("pauses twice via awaitForm", async () => {
		const calls: string[] = [];
		const forms: Record<string, import("@quester-studio/schema").FormV1> = {
			search: {
				version: "v1",
				id: "search",
				name: "Search",
				fields: [{ id: "q", type: "string", required: true }],
			},
			pick: {
				version: "v1",
				id: "pick",
				name: "Pick",
				fields: [
					{
						id: "productId",
						type: "select",
						required: true,
						options: [
							{ value: "a", label: "A" },
							{ value: "b", label: "B" },
						],
					},
				],
			},
		};

		const result = await executeFlow(
			{
				id: "multi-form",
				version: "v1",
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "searchForm", type: "form", data: { formId: "search" } },
					{ id: "pickForm", type: "form", data: { formId: "pick" } },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e1", source: "start", target: "searchForm" },
					{ id: "e2", source: "searchForm", target: "pickForm" },
					{ id: "e3", source: "pickForm", target: "out" },
				],
			},
			{
				getForm: async (id) => {
					const form = forms[id];
					if (!form) throw new Error(`missing form ${id}`);
					return form;
				},
				awaitForm: async (req) => {
					calls.push(req.nodeId);
					if (req.nodeId === "searchForm") return { q: "phone" };
					return { productId: "a" };
				},
			},
		);

		expect(calls).toEqual(["searchForm", "pickForm"]);
		expect(result.nodeOutputs.searchForm).toEqual({ q: "phone" });
		expect(result.nodeOutputs.pickForm).toEqual({ productId: "a" });
	});

	test("CLI formInputs map works without custom awaitForm", async () => {
		const forms: Record<string, import("@quester-studio/schema").FormV1> = {
			login: {
				version: "v1",
				id: "login",
				name: "Login",
				fields: [
					{ id: "username", type: "string", required: true },
					{ id: "password", type: "string", required: true },
				],
			},
		};
		const result = await executeFlow(
			{
				id: "cli-form",
				version: "v1",
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "loginForm", type: "form", data: { formId: "login" } },
				],
				edges: [{ id: "e1", source: "start", target: "loginForm" }],
			},
			{
				getForm: async (id) => {
					const form = forms[id];
					if (!form) throw new Error(`missing form ${id}`);
					return form;
				},
				formInputs: {
					loginForm: { username: "u", password: "p" },
				},
			},
		);
		expect(result.nodeOutputs.loginForm).toEqual({
			username: "u",
			password: "p",
		});
	});
});

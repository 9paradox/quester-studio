import { describe, expect, test } from "bun:test";
import type { FormV1 } from "@quester-studio/schema";
import {
	mergeFormSubmission,
	resolveFormFields,
	validateFormSubmission,
} from "./form-resolve.js";
import { formPlugin } from "./form.js";

const loginForm: FormV1 = {
	version: "v1",
	id: "login",
	name: "Login",
	fields: [
		{ id: "username", type: "string", required: true },
		{ id: "password", type: "string", required: true },
	],
};

describe("form-resolve", () => {
	test("resolves optionsFrom from node outputs", () => {
		const form: FormV1 = {
			version: "v1",
			id: "pick",
			name: "Pick",
			fields: [
				{
					id: "productId",
					type: "select",
					required: true,
					optionsFrom: {
						items: "{{nodes.search.body.products}}",
						value: "id",
						label: "title",
					},
				},
			],
		};
		const nodeOutputs = {
			search: {
				body: {
					products: [
						{ id: 1, title: "Phone" },
						{ id: 2, title: "Laptop" },
					],
				},
			},
		};
		const resolveValue = (t: string) => {
			if (t.includes("nodes.search.body.products")) {
				return nodeOutputs.search.body.products;
			}
			return undefined;
		};
		const resolved = resolveFormFields(form, undefined, resolveValue, (t) => t);
		expect(resolved.fields[0]?.options).toEqual([
			{ value: 1, label: "Phone" },
			{ value: 2, label: "Laptop" },
		]);
	});

	test("merges defaults with submission and keeps readonly", () => {
		const resolved = {
			fields: [
				{
					id: "title",
					type: "string" as const,
					required: false,
					readonly: true,
					value: "Widget",
				},
				{
					id: "quantity",
					type: "number" as const,
					required: true,
					readonly: false,
					value: 1,
				},
			],
		};
		const merged = mergeFormSubmission(resolved, {
			quantity: 3,
			title: "hack",
		});
		expect(merged).toEqual({ title: "Widget", quantity: 3 });
		validateFormSubmission(resolved, merged);
	});
});

describe("formPlugin", () => {
	test("awaits and returns submitted values", async () => {
		const result = await formPlugin.execute({
			node: {
				id: "loginForm",
				type: "form",
				data: { formId: "login" },
			},
			input: {},
			flowInput: {},
			vars: {},
			nodeOutputs: {},
			resolveTemplate: (t) => t,
			resolveValue: (t) => t,
			fetch,
			getForm: async () => loginForm,
			awaitForm: async () => ({ username: "alice", password: "secret" }),
		});
		expect(result.output).toEqual({ username: "alice", password: "secret" });
	});

	test("fails when formInputs missing via awaitForm error", async () => {
		await expect(
			formPlugin.execute({
				node: {
					id: "loginForm",
					type: "form",
					data: { formId: "login" },
				},
				input: {},
				flowInput: {},
				vars: {},
				nodeOutputs: {},
				resolveTemplate: (t) => t,
				fetch,
				getForm: async () => loginForm,
				awaitForm: async () => {
					throw new Error('requires formInputs["loginForm"]');
				},
			}),
		).rejects.toThrow("formInputs");
	});
});

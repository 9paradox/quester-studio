import { describe, expect, test } from "bun:test";
import { validateNodeData } from "./flow.js";
import { formDefinitionSchemaV1 } from "./form.js";
import { validateForm } from "./validate-form.js";

describe("formDefinitionSchemaV1", () => {
	test("accepts a search form", () => {
		const result = validateForm({
			version: "v1",
			id: "search-products",
			name: "Search products",
			fields: [
				{
					id: "q",
					type: "string",
					label: "Query",
					required: true,
				},
			],
		});
		expect(result.success).toBe(true);
	});

	test("accepts select with optionsFrom", () => {
		const result = validateForm({
			version: "v1",
			id: "pick-product",
			name: "Pick product",
			fields: [
				{
					id: "productId",
					type: "select",
					label: "Product",
					required: true,
					optionsFrom: {
						items: "{{nodes.search.body.products}}",
						value: "id",
						label: "title",
					},
				},
			],
		});
		expect(result.success).toBe(true);
	});

	test("accepts readonly detail fields", () => {
		const result = formDefinitionSchemaV1.safeParse({
			version: "v1",
			id: "product-detail",
			name: "Product detail",
			fields: [
				{
					id: "title",
					type: "string",
					readonly: true,
					default: "{{nodes.detail.body.title}}",
				},
				{ id: "quantity", type: "number", default: 1, required: true },
			],
		});
		expect(result.success).toBe(true);
	});

	test("rejects select without options", () => {
		const result = validateForm({
			version: "v1",
			id: "bad",
			name: "Bad",
			fields: [{ id: "x", type: "select" }],
		});
		expect(result.success).toBe(false);
	});

	test("rejects duplicate field ids", () => {
		const result = validateForm({
			version: "v1",
			id: "dup",
			name: "Dup",
			fields: [
				{ id: "a", type: "string" },
				{ id: "a", type: "number" },
			],
		});
		expect(result.success).toBe(false);
	});
});

describe("form node data", () => {
	test("requires formId", () => {
		expect(validateNodeData("form", {}).success).toBe(false);
		expect(
			validateNodeData("form", { formId: "search-products" }).success,
		).toBe(true);
	});
});

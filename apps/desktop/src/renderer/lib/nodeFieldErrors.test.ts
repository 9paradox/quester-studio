import { describe, expect, test } from "bun:test";
import {
	flowHasInvalidNodeData,
	getNodeFieldErrors,
} from "./nodeFieldErrors.js";

describe("nodeFieldErrors", () => {
	test("template empty string is Required on template field", () => {
		expect(getNodeFieldErrors("template", { template: "" })).toEqual({
			template: "Required",
		});
	});

	test("valid template has no errors", () => {
		expect(
			getNodeFieldErrors("template", { template: "{{input}}", mode: "eta" }),
		).toEqual({});
	});

	test("flowHasInvalidNodeData finds first bad node", () => {
		const result = flowHasInvalidNodeData({
			nodes: [
				{ id: "ok", type: "start", data: {} },
				{ id: "bad", type: "template", data: { template: "" } },
			],
		});
		expect(result).toEqual({ invalid: true, nodeId: "bad" });
	});
});

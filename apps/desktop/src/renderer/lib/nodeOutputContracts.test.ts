import { describe, expect, test } from "bun:test";
import {
	NODE_OUTPUT_CONTRACTS,
	contractPathsForType,
	mergeContractAndLearned,
} from "./nodeOutputContracts.js";

describe("nodeOutputContracts", () => {
	test("http includes timing.durationMs", () => {
		expect(NODE_OUTPUT_CONTRACTS.http).toContain("timing.durationMs");
		expect(contractPathsForType("http")).toContain("status");
	});

	test("unknown type returns empty", () => {
		expect(contractPathsForType("custom")).toEqual([]);
	});

	test("merge prefers contracts then learned", () => {
		expect(
			mergeContractAndLearned(["status", "body"], ["body", "body.id"]),
		).toEqual(["status", "body", "body.id"]);
	});
});

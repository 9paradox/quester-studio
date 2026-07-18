import { describe, expect, test } from "bun:test";
import {
	createJsonDraft,
	jsonDraftDidCommit,
	updateJsonDraft,
} from "./jsonDraft.js";

describe("jsonDraft", () => {
	test("keeps intermediate invalid text without changing committed", () => {
		const initial = createJsonDraft([{ path: "ok" }]);
		const next = updateJsonDraft(initial, "[{");
		expect(next.text).toBe("[{");
		expect(next.error).not.toBeNull();
		expect(next.committed).toEqual([{ path: "ok" }]);
		expect(jsonDraftDidCommit(initial, next)).toBe(false);
	});

	test("commits valid JSON including falsy equals values", () => {
		for (const value of [null, false, 0, "", [], {}] as unknown[]) {
			const initial = createJsonDraft({ sentinel: true });
			const text = JSON.stringify(value);
			const next = updateJsonDraft(initial, text);
			expect(next.error).toBeNull();
			expect(next.committed).toEqual(value);
			expect(jsonDraftDidCommit(initial, next)).toBe(true);
		}
	});

	test("does not report commit when committed value is unchanged", () => {
		const initial = createJsonDraft(200);
		const next = updateJsonDraft(initial, "200");
		expect(next.error).toBeNull();
		expect(jsonDraftDidCommit(initial, next)).toBe(false);
	});
});

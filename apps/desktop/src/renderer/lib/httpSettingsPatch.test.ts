import { describe, expect, test } from "bun:test";
import { applyHttpSettingsPatch } from "./httpSettingsPatch.js";

describe("applyHttpSettingsPatch", () => {
	test("sets timeoutMs and can clear it to inherit", () => {
		const withTimeout = applyHttpSettingsPatch(
			{ defaultHeaders: {} },
			{ timeoutMs: 1 },
		);
		expect(withTimeout.timeoutMs).toBe(1);

		const cleared = applyHttpSettingsPatch(withTimeout, { timeoutMs: null });
		expect(cleared.timeoutMs).toBeUndefined();
		expect(cleared.defaultHeaders).toEqual({});
	});
});

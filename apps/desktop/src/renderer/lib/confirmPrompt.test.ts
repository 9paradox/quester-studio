import { beforeEach, describe, expect, test } from "bun:test";
import {
	getConfirmPromptRequest,
	promptConfirm,
	resolveConfirmPrompt,
	subscribeConfirmPrompt,
} from "./confirmPrompt.js";

beforeEach(() => {
	resolveConfirmPrompt(false);
});

test("promptConfirm opens a request and resolves true", async () => {
	const pending = promptConfirm({
		title: "Delete flow?",
		description: "This cannot be undone.",
		destructive: true,
		confirmLabel: "Delete",
	});
	expect(getConfirmPromptRequest()?.title).toBe("Delete flow?");
	resolveConfirmPrompt(true);
	await expect(pending).resolves.toBe(true);
	expect(getConfirmPromptRequest()).toBeNull();
});

test("promptConfirm resolves false on cancel", async () => {
	const pending = promptConfirm({ title: "Close tab?" });
	resolveConfirmPrompt(false);
	await expect(pending).resolves.toBe(false);
});

test("a newer prompt cancels the previous one", async () => {
	const first = promptConfirm({ title: "First" });
	const second = promptConfirm({ title: "Second" });
	expect(getConfirmPromptRequest()?.title).toBe("Second");
	resolveConfirmPrompt(true);
	await expect(first).resolves.toBe(false);
	await expect(second).resolves.toBe(true);
});

describe("subscribeConfirmPrompt", () => {
	test("notifies on open and close", () => {
		let n = 0;
		const unsub = subscribeConfirmPrompt(() => {
			n += 1;
		});
		void promptConfirm({ title: "Hi" });
		expect(n).toBeGreaterThan(0);
		const afterOpen = n;
		resolveConfirmPrompt(false);
		expect(n).toBeGreaterThan(afterOpen);
		unsub();
	});
});

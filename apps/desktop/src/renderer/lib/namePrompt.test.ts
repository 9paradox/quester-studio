import { afterEach, expect, test } from "bun:test";
import {
	getNamePromptRequest,
	promptName,
	resolveNamePrompt,
	subscribeNamePrompt,
} from "./namePrompt.js";

afterEach(() => {
	resolveNamePrompt(null);
});

test("promptName opens a request and resolves trimmed value", async () => {
	const pending = promptName({ title: "Rename flow", defaultValue: "A" });
	expect(getNamePromptRequest()?.title).toBe("Rename flow");
	resolveNamePrompt("  New name  ");
	await expect(pending).resolves.toBe("New name");
	expect(getNamePromptRequest()).toBeNull();
});

test("promptName resolves null on cancel and empty", async () => {
	const cancelled = promptName({ title: "New flow" });
	resolveNamePrompt(null);
	await expect(cancelled).resolves.toBeNull();

	const empty = promptName({ title: "New flow" });
	resolveNamePrompt("   ");
	await expect(empty).resolves.toBeNull();
});

test("a newer prompt cancels the previous one", async () => {
	const first = promptName({ title: "First" });
	const second = promptName({ title: "Second" });
	await expect(first).resolves.toBeNull();
	expect(getNamePromptRequest()?.title).toBe("Second");
	resolveNamePrompt("ok");
	await expect(second).resolves.toBe("ok");
});

test("subscribeNamePrompt notifies on open and close", () => {
	let ticks = 0;
	const unsub = subscribeNamePrompt(() => {
		ticks += 1;
	});
	void promptName({ title: "Watch" });
	resolveNamePrompt(null);
	unsub();
	expect(ticks).toBe(2);
});

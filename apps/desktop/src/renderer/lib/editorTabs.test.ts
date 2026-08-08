import { describe, expect, test } from "bun:test";
import {
	createResponseViewerTab,
	editorTabIcon,
	editorTabLabel,
	responseTabId,
} from "./editorTabs.js";

describe("response viewer tabs", () => {
	test("createResponseViewerTab freezes snapshot and labels", () => {
		const snapshot = {
			source: "collection" as const,
			title: "Login response",
			subtitle: "auth/login.request.json",
			error: null,
			output: { status: 200, body: { ok: true } },
		};
		const tab = createResponseViewerTab(snapshot, "collection:login", 42);
		expect(tab.kind).toBe("response");
		expect(tab.dirty).toBe(false);
		expect(tab.id).toBe(responseTabId("collection:login", 42));
		expect(tab.snapshot).toEqual(snapshot);
		expect(editorTabLabel(tab)).toBe("Login response");
		expect(editorTabIcon(tab)).toBe("response");
	});
});

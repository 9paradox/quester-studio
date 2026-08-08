import { describe, expect, test } from "bun:test";
import { isTypingFocus } from "./typingFocus.js";

describe("isTypingFocus", () => {
	test("null is not typing", () => {
		expect(isTypingFocus(null)).toBe(false);
	});

	test("input and textarea count", () => {
		const input = document.createElement("input");
		const textarea = document.createElement("textarea");
		expect(isTypingFocus(input)).toBe(true);
		expect(isTypingFocus(textarea)).toBe(true);
	});

	test("text node inside CodeMirror content counts", () => {
		const root = document.createElement("div");
		root.className = "cm-editor";
		const content = document.createElement("div");
		content.className = "cm-content";
		content.setAttribute("contenteditable", "true");
		const text = document.createTextNode("ab");
		content.appendChild(text);
		root.appendChild(content);
		document.body.appendChild(root);
		try {
			expect(isTypingFocus(text)).toBe(true);
			expect(isTypingFocus(content)).toBe(true);
		} finally {
			root.remove();
		}
	});

	test("plain div does not count", () => {
		const div = document.createElement("div");
		expect(isTypingFocus(div)).toBe(false);
	});
});

import { expect, test } from "bun:test";
import { canvasPaneInteraction } from "./canvasPointer.js";

test("select tool marquees with left drag and pans with middle mouse", () => {
	expect(canvasPaneInteraction("select", false)).toEqual({
		panOnDrag: [1],
		selectionOnDrag: true,
	});
});

test("hand tool pans with left or middle mouse", () => {
	expect(canvasPaneInteraction("hand", false)).toEqual({
		panOnDrag: [0, 1],
		selectionOnDrag: false,
	});
});

test("holding space temporarily matches hand tool", () => {
	expect(canvasPaneInteraction("select", true)).toEqual({
		panOnDrag: [0, 1],
		selectionOnDrag: false,
	});
});

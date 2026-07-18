import { afterEach, describe, expect, test } from "bun:test";
import {
	clampCanvasZoom,
	normalizeWorkspacePath,
	readCanvasViewport,
	viewportStorageKey,
	writeCanvasViewport,
} from "./canvasViewport.js";

const memory = new Map<string, string>();

const localStorageMock = {
	getItem(key: string) {
		return memory.has(key) ? (memory.get(key) ?? null) : null;
	},
	setItem(key: string, value: string) {
		memory.set(key, value);
	},
	removeItem(key: string) {
		memory.delete(key);
	},
	clear() {
		memory.clear();
	},
};

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	configurable: true,
});

afterEach(() => {
	memory.clear();
});

describe("canvasViewport", () => {
	test("round-trips viewport per workspace and flow", () => {
		writeCanvasViewport("/ws/a", "flow-1", { x: 10, y: 20, zoom: 1.5 });
		writeCanvasViewport("/ws/b", "flow-1", { x: 1, y: 2, zoom: 0.5 });
		writeCanvasViewport("/ws/a", "flow-2", { x: 3, y: 4, zoom: 2 });

		expect(readCanvasViewport("/ws/a", "flow-1")).toEqual({
			x: 10,
			y: 20,
			zoom: 1.5,
		});
		expect(readCanvasViewport("/ws/b", "flow-1")).toEqual({
			x: 1,
			y: 2,
			zoom: 0.5,
		});
		expect(readCanvasViewport("/ws/a", "flow-2")).toEqual({
			x: 3,
			y: 4,
			zoom: 2,
		});
	});

	test("normalizes workspace path separators for the storage key", () => {
		expect(viewportStorageKey("H:\\Projects\\ws", "f")).toBe(
			viewportStorageKey("h:/Projects/ws", "f"),
		);
		expect(normalizeWorkspacePath("C:\\A\\B\\")).toBe("c:/a/b");
	});

	test("rejects malformed or non-finite stored values", () => {
		localStorage.setItem(
			viewportStorageKey("/ws", "flow"),
			JSON.stringify({ x: 1, y: 2, zoom: Number.NaN }),
		);
		expect(readCanvasViewport("/ws", "flow")).toBeNull();

		localStorage.setItem(viewportStorageKey("/ws", "flow"), "{not-json");
		expect(readCanvasViewport("/ws", "flow")).toBeNull();
	});

	test("clamps zoom to canvas bounds", () => {
		expect(clampCanvasZoom(0.01)).toBe(0.25);
		expect(clampCanvasZoom(9)).toBe(2);
		expect(clampCanvasZoom(Number.NaN)).toBe(1);
		writeCanvasViewport("/ws", "flow", { x: 0, y: 0, zoom: 8 });
		expect(readCanvasViewport("/ws", "flow")?.zoom).toBe(2);
	});
});

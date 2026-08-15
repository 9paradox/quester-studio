import { afterEach, expect, test } from "bun:test";
import { callQuesterZoom } from "./canvasZoom.js";

afterEach(() => {
	(window as unknown as { __questerZoom?: unknown }).__questerZoom = undefined;
});

test("callQuesterZoom returns 1 when the canvas bridge is missing", async () => {
	expect(await callQuesterZoom("in")).toBe(1);
});

test("callQuesterZoom waits for animated in/out/fit then reads get()", async () => {
	let zoom = 1;
	(
		window as unknown as {
			__questerZoom: {
				in: () => Promise<void>;
				out: () => Promise<void>;
				fit: () => Promise<void>;
				get: () => number;
			};
		}
	).__questerZoom = {
		in: async () => {
			await Promise.resolve();
			zoom = 1.2;
		},
		out: async () => {
			await Promise.resolve();
			zoom = 0.8;
		},
		fit: async () => {
			await Promise.resolve();
			zoom = 0.5;
		},
		get: () => zoom,
	};

	expect(await callQuesterZoom("in")).toBe(1.2);
	expect(await callQuesterZoom("out")).toBe(0.8);
	expect(await callQuesterZoom("fit")).toBe(0.5);
});

import { afterEach, describe, expect, test } from "bun:test";
import type { FlowNodeV1 } from "@quester-studio/schema";
import { cleanup, render, screen } from "@testing-library/react";
import { NodeInspector } from "./NodeInspector.js";

const httpNode: FlowNodeV1 = {
	id: "http-1",
	type: "http",
	position: { x: 0, y: 0 },
	data: {
		method: "GET",
		url: "https://example.com",
	},
};

describe("NodeInspector labelling", () => {
	afterEach(() => {
		cleanup();
	});

	test("http node exposes named Method and URL controls", () => {
		render(<NodeInspector node={httpNode} onUpdate={() => undefined} />);

		expect(screen.getByLabelText("Method")).toBeInTheDocument();
		expect(screen.getByLabelText("URL")).toBeInTheDocument();
	});
});

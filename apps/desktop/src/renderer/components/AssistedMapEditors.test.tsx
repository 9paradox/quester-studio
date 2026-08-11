import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { JmesPathMapEditor } from "./JmesPathMapEditor.js";
import { TemplateMapEditor } from "./TemplateMapEditor.js";

describe("TemplateMapEditor", () => {
	afterEach(() => {
		cleanup();
	});

	test("renders keys and Pick path on value fields", () => {
		render(
			<TemplateMapEditor
				value={{ userId: "{{input.id}}" }}
				onChange={() => undefined}
			/>,
		);
		expect(screen.getByDisplayValue("userId")).toBeInTheDocument();
		expect(document.querySelector(".cm-content")?.textContent).toContain(
			"{{input.id}}",
		);
		expect(
			screen.getAllByRole("button", { name: /pick path/i }).length,
		).toBeGreaterThan(0);
	});
});

describe("JmesPathMapEditor", () => {
	afterEach(() => {
		cleanup();
	});

	test("renders JMESPath values with Pick path", () => {
		render(
			<JmesPathMapEditor
				value={{ id: "body.id" }}
				onChange={() => undefined}
			/>,
		);
		expect(screen.getByDisplayValue("id")).toBeInTheDocument();
		expect(
			screen.getByText("body.id", { selector: ".cm-line" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /pick path/i }),
		).toBeInTheDocument();
	});
});

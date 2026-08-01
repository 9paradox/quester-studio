import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { JmesPathField } from "./JmesPathField.js";

describe("JmesPathField", () => {
	afterEach(() => {
		cleanup();
	});

	test("renders without maximum update depth (zustand selector)", () => {
		// Would throw React #185 if selectTemplateContext is used without equality.
		render(
			<JmesPathField value="body.id" onChange={() => undefined} showHelp />,
		);
		expect(
			screen.getByRole("button", { name: /pick path/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText("body.id", { selector: ".cm-line" }),
		).toBeInTheDocument();
	});
});

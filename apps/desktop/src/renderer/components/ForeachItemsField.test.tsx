import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import {
	ForeachItemsField,
	isForeachTemplateItems,
} from "./ForeachItemsField.js";
import { TemplateField } from "./TemplateField.js";

describe("isForeachTemplateItems", () => {
	test("detects template mode from {{", () => {
		expect(isForeachTemplateItems("body.users")).toBe(false);
		expect(isForeachTemplateItems("{{input.ids}}")).toBe(true);
		expect(isForeachTemplateItems('["{{env.X}}"]')).toBe(true);
	});
});

describe("TemplateField Pick path", () => {
	afterEach(() => {
		cleanup();
	});

	test("shows Pick path for template mode", () => {
		render(<TemplateField value="{{env.X}}" onChange={() => undefined} />);
		expect(
			screen.getByRole("button", { name: /pick path/i }),
		).toBeInTheDocument();
	});

	test("hides Pick path when showPickPath is false", () => {
		render(
			<TemplateField
				value="body.id"
				onChange={() => undefined}
				completionMode="jmespath"
				showPickPath={false}
			/>,
		);
		expect(screen.queryByRole("button", { name: /pick path/i })).toBeNull();
	});
});

describe("ForeachItemsField", () => {
	afterEach(() => {
		cleanup();
	});

	test("renders Pick path without maximum update depth", () => {
		render(<ForeachItemsField value="items" onChange={() => undefined} />);
		expect(
			screen.getByRole("button", { name: /pick path/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText("items", { selector: ".cm-line" }),
		).toBeInTheDocument();
	});
});

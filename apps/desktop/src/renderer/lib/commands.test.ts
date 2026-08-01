import { expect, test } from "bun:test";
import { type AppCommand, filterCommands } from "./commands.js";

const sampleCommands: AppCommand[] = [
	{
		id: "save",
		label: "Save",
		keywords: ["write"],
		run: () => {},
	},
	{
		id: "run",
		label: "Run Flow",
		keywords: ["execute", "start"],
		run: () => {},
	},
	{
		id: "sidebar",
		label: "Toggle Sidebar",
		keywords: ["primary", "explorer"],
		run: () => {},
	},
];

test("filterCommands returns all commands for empty query", () => {
	expect(filterCommands(sampleCommands, "")).toEqual(sampleCommands);
});

test("filterCommands matches label substring", () => {
	expect(filterCommands(sampleCommands, "save").map((c) => c.id)).toEqual([
		"save",
	]);
});

test("filterCommands matches keywords", () => {
	expect(filterCommands(sampleCommands, "execute").map((c) => c.id)).toEqual([
		"run",
	]);
});

test("filterCommands supports fuzzy subsequence matching", () => {
	expect(filterCommands(sampleCommands, "tsb").map((c) => c.id)).toEqual([
		"sidebar",
	]);
});

test("filterCommands sorts stronger matches first", () => {
	const results = filterCommands(sampleCommands, "run");
	expect(results[0]?.id).toBe("run");
});

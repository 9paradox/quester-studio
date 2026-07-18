import { describe, expect, test } from "bun:test";
import {
	applyNodeStatusEvent,
	initNodeStatuses,
	reconcileNodeStatuses,
} from "./nodeRunStatus.js";

describe("nodeRunStatus helpers", () => {
	test("initNodeStatuses marks every node idle", () => {
		expect(initNodeStatuses(["a", "b"])).toEqual({ a: "idle", b: "idle" });
	});

	test("applyNodeStatusEvent updates one node", () => {
		const current = initNodeStatuses(["a", "b"]);
		expect(
			applyNodeStatusEvent(current, { nodeId: "a", status: "running" }),
		).toEqual({ a: "running", b: "idle" });
	});

	test("reconcileNodeStatuses marks successes, errors, and skips", () => {
		const current = {
			start: "success" as const,
			in: "success" as const,
			http: "error" as const,
			branchYes: "idle" as const,
			branchNo: "running" as const,
			out: "idle" as const,
		};
		const next = reconcileNodeStatuses(
			["start", "in", "http", "branchYes", "branchNo", "out"],
			[
				{ nodeId: "start" },
				{ nodeId: "in" },
				{ nodeId: "http", error: "boom" },
			],
			current,
		);
		expect(next).toEqual({
			start: "success",
			in: "success",
			http: "error",
			branchYes: "skipped",
			branchNo: "skipped",
			out: "skipped",
		});
	});

	test("reconcileNodeStatuses falls back from steps when live map empty", () => {
		const next = reconcileNodeStatuses(
			["a", "b", "c"],
			[{ nodeId: "a" }, { nodeId: "b" }],
		);
		expect(next).toEqual({
			a: "success",
			b: "success",
			c: "skipped",
		});
	});
});

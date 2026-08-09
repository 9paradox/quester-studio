import { describe, expect, test } from "bun:test";
import {
	applyNodeStatusEvent,
	applyNodeTimingEvent,
	initNodeStatuses,
	nodeTimingDurationMs,
	reconcileNodeStatuses,
	totalRunDurationMs,
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

	test("applyNodeStatusEvent is a no-op when status unchanged", () => {
		const statuses = { a: "running" as const };
		expect(
			applyNodeStatusEvent(statuses, { nodeId: "a", status: "running" }),
		).toBe(statuses);
	});

	test("applyNodeTimingEvent records start and end", () => {
		let timings = applyNodeTimingEvent(
			{},
			{ nodeId: "a", status: "running", ts: 1000 },
		);
		expect(timings).toEqual({ a: { startedAt: 1000 } });
		timings = applyNodeTimingEvent(timings, {
			nodeId: "a",
			status: "success",
			ts: 1120,
		});
		expect(timings).toEqual({ a: { startedAt: 1000, endedAt: 1120 } });
		expect(nodeTimingDurationMs(timings.a)).toBe(120);
	});

	test("applyNodeTimingEvent ends without prior start uses event ts", () => {
		const timings = applyNodeTimingEvent(
			{},
			{ nodeId: "a", status: "error", ts: 50 },
		);
		expect(timings).toEqual({ a: { startedAt: 50, endedAt: 50 } });
		expect(nodeTimingDurationMs(timings.a)).toBe(0);
	});

	test("totalRunDurationMs spans first start to last end", () => {
		expect(
			totalRunDurationMs({
				a: { startedAt: 100, endedAt: 150 },
				b: { startedAt: 140, endedAt: 200 },
			}),
		).toBe(100);
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

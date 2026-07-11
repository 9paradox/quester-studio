import { describe, expect, test } from "bun:test";
import {
	type KeyValueRow,
	recordToRows,
	rowsToEnvVariables,
	rowsToStringRecord,
} from "./KeyValueEditor.js";

describe("recordToRows / rowsTo* round-trip", () => {
	test("recordToRows always yields at least one row", () => {
		const rows = recordToRows({});
		expect(rows).toHaveLength(1);
		expect(rows[0]?.key).toBe("");
		expect(rows[0]?.value).toBe("");
	});

	test("rowsToEnvVariables drops empty keys but keeps typed values", () => {
		const rows: KeyValueRow[] = [
			{ id: "1", key: "API_BASE", value: "http://localhost" },
			{ id: "2", key: "", value: "orphan" },
			{ id: "3", key: "COUNT", value: "42" },
			{ id: "4", key: "FLAG", value: "true" },
		];
		expect(rowsToEnvVariables(rows)).toEqual({
			API_BASE: "http://localhost",
			COUNT: 42,
			FLAG: true,
		});
	});

	test("rowsToStringRecord preserves secret strings", () => {
		const rows: KeyValueRow[] = [
			{ id: "1", key: "TOKEN", value: "secret" },
			{ id: "2", key: "  ", value: "ignored" },
		];
		expect(rowsToStringRecord(rows)).toEqual({ TOKEN: "secret" });
	});

	test("empty draft rows survive as row list even when record is empty", () => {
		const draft: KeyValueRow[] = [
			{ id: "a", key: "FOO", value: "1" },
			{ id: "b", key: "", value: "" },
		];
		const record = rowsToEnvVariables(draft);
		expect(record).toEqual({ FOO: 1 });
		// Editing source of truth must keep draft rows (not rebuild from record).
		expect(draft).toHaveLength(2);
		expect(draft[1]?.id).toBe("b");
	});
});

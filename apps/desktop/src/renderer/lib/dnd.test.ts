import { describe, expect, test } from "bun:test";
import {
	QUESTER_CODE_MIME,
	QUESTER_FLOW_MIME,
	QUESTER_FORM_MIME,
	QUESTER_NODE_MIME,
	QUESTER_REQUEST_MIME,
	readCodeDragData,
	readFlowDragData,
	readFormDragData,
	readNodeDragData,
	readRequestDragData,
	setFlowDragData,
	setFormDragData,
	setNodeDragData,
	setRequestDragData,
} from "./dnd.js";

function mockDataTransfer(initial: Record<string, string> = {}) {
	const data = { ...initial };
	return {
		effectAllowed: "none" as string,
		setData(type: string, value: string) {
			data[type] = value;
		},
		getData(type: string) {
			return data[type] ?? "";
		},
	};
}

describe("dnd mime helpers", () => {
	test("node round-trip", () => {
		const dt = mockDataTransfer();
		setNodeDragData(dt as DataTransfer, "http");
		expect(dt.getData(QUESTER_NODE_MIME)).toBe("http");
		expect(readNodeDragData(dt as DataTransfer)).toBe("http");
	});

	test("request round-trip", () => {
		const dt = mockDataTransfer();
		setRequestDragData(dt as DataTransfer, "col/get.json");
		expect(dt.getData(QUESTER_REQUEST_MIME)).toBe("col/get.json");
		expect(readRequestDragData(dt as DataTransfer)).toBe("col/get.json");
	});

	test("flow round-trip", () => {
		const dt = mockDataTransfer();
		setFlowDragData(dt as DataTransfer, "echo-subflow");
		expect(dt.getData(QUESTER_FLOW_MIME)).toBe("echo-subflow");
		expect(readFlowDragData(dt as DataTransfer)).toBe("echo-subflow");
		expect(dt.getData("text/plain")).toBe("flow:echo-subflow");
	});

	test("form round-trip", () => {
		const dt = mockDataTransfer();
		setFormDragData(dt as DataTransfer, {
			formId: "contact",
			name: "Contact",
		});
		expect(dt.getData(QUESTER_FORM_MIME)).toBe("contact");
		expect(readFormDragData(dt as DataTransfer)).toBe("contact");
		expect(dt.getData("text/plain")).toBe("form:contact");
	});

	test("form and code stubs read plain and custom mime", () => {
		expect(
			readFormDragData(
				mockDataTransfer({
					[QUESTER_FORM_MIME]: "contact",
				}) as DataTransfer,
			),
		).toBe("contact");
		expect(
			readFormDragData(
				mockDataTransfer({ "text/plain": "form:contact" }) as DataTransfer,
			),
		).toBe("contact");
		expect(
			readCodeDragData(
				mockDataTransfer({
					[QUESTER_CODE_MIME]: "snippet",
				}) as DataTransfer,
			),
		).toBe("snippet");
		expect(
			readCodeDragData(
				mockDataTransfer({ "text/plain": "code:snippet" }) as DataTransfer,
			),
		).toBe("snippet");
	});
});

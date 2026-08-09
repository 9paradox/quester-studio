import type { BuiltinNodeType } from "@quester-studio/schema";

/**
 * Canvas drop UX:
 * - Nodes catalog → insert that node type
 * - Collection request → insert HTTP node from request
 * - Flow (click opens tab; drag) → insert `subflow` pointing at that flow
 * - Form / code MIME stubs → toast until plans 12/13
 */
export const QUESTER_NODE_MIME = "application/quester-node";
export const QUESTER_REQUEST_MIME = "application/quester-request";
export const QUESTER_FLOW_MIME = "application/quester-flow";
export const QUESTER_FORM_MIME = "application/quester-form";
export const QUESTER_CODE_MIME = "application/quester-code";

export function setNodeDragData(
	dataTransfer: DataTransfer,
	type: BuiltinNodeType,
): void {
	dataTransfer.setData(QUESTER_NODE_MIME, type);
	dataTransfer.setData("text/plain", `node:${type}`);
	dataTransfer.effectAllowed = "copy";
}

export function readNodeDragData(
	dataTransfer: DataTransfer,
): BuiltinNodeType | null {
	const custom = dataTransfer.getData(QUESTER_NODE_MIME);
	if (custom) return custom as BuiltinNodeType;
	const plain = dataTransfer.getData("text/plain");
	if (plain.startsWith("node:")) {
		return plain.slice("node:".length) as BuiltinNodeType;
	}
	return null;
}

export function setRequestDragData(
	dataTransfer: DataTransfer,
	requestPath: string,
): void {
	dataTransfer.setData(QUESTER_REQUEST_MIME, requestPath);
	dataTransfer.setData("text/plain", `request:${requestPath}`);
	dataTransfer.effectAllowed = "copy";
}

export function readRequestDragData(dataTransfer: DataTransfer): string | null {
	const custom = dataTransfer.getData(QUESTER_REQUEST_MIME);
	if (custom) return custom;
	const plain = dataTransfer.getData("text/plain");
	if (plain.startsWith("request:")) {
		return plain.slice("request:".length);
	}
	return null;
}

export function setFlowDragData(
	dataTransfer: DataTransfer,
	flowId: string,
): void {
	dataTransfer.setData(QUESTER_FLOW_MIME, flowId);
	dataTransfer.setData("text/plain", `flow:${flowId}`);
	dataTransfer.effectAllowed = "copy";
}

export function readFlowDragData(dataTransfer: DataTransfer): string | null {
	const custom = dataTransfer.getData(QUESTER_FLOW_MIME);
	if (custom) return custom;
	const plain = dataTransfer.getData("text/plain");
	if (plain.startsWith("flow:")) {
		return plain.slice("flow:".length);
	}
	return null;
}

export function readFormDragData(dataTransfer: DataTransfer): string | null {
	const custom = dataTransfer.getData(QUESTER_FORM_MIME);
	if (custom) return custom;
	const plain = dataTransfer.getData("text/plain");
	if (plain.startsWith("form:")) {
		return plain.slice("form:".length);
	}
	return null;
}

export function readCodeDragData(dataTransfer: DataTransfer): string | null {
	const custom = dataTransfer.getData(QUESTER_CODE_MIME);
	if (custom) return custom;
	const plain = dataTransfer.getData("text/plain");
	if (plain.startsWith("code:")) {
		return plain.slice("code:".length);
	}
	return null;
}

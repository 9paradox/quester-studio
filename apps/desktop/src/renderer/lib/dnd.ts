import type { BuiltinNodeType } from "@quester/schema";

export const QUESTER_NODE_MIME = "application/quester-node";
export const QUESTER_REQUEST_MIME = "application/quester-request";

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

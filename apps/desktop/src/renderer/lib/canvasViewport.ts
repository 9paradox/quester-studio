import type { Viewport } from "reactflow";

export type CanvasViewport = Pick<Viewport, "x" | "y" | "zoom">;

const STORAGE_PREFIX = "quester.canvasViewport.v1:";
export const CANVAS_MIN_ZOOM = 0.25;
export const CANVAS_MAX_ZOOM = 2;

export function viewportStorageKey(
	workspacePath: string,
	flowId: string,
): string {
	return `${STORAGE_PREFIX}${normalizeWorkspacePath(workspacePath)}:${flowId}`;
}

export function normalizeWorkspacePath(workspacePath: string): string {
	return workspacePath.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function clampCanvasZoom(zoom: number): number {
	if (!Number.isFinite(zoom) || zoom <= 0) return 1;
	return Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom));
}

export function isValidCanvasViewport(value: unknown): value is CanvasViewport {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.x === "number" &&
		Number.isFinite(v.x) &&
		typeof v.y === "number" &&
		Number.isFinite(v.y) &&
		typeof v.zoom === "number" &&
		Number.isFinite(v.zoom) &&
		v.zoom > 0
	);
}

export function normalizeCanvasViewport(
	viewport: CanvasViewport,
): CanvasViewport {
	return {
		x: viewport.x,
		y: viewport.y,
		zoom: clampCanvasZoom(viewport.zoom),
	};
}

export function readCanvasViewport(
	workspacePath: string,
	flowId: string,
): CanvasViewport | null {
	if (!workspacePath || !flowId) return null;
	try {
		const raw = localStorage.getItem(viewportStorageKey(workspacePath, flowId));
		if (raw == null) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!isValidCanvasViewport(parsed)) return null;
		return normalizeCanvasViewport(parsed);
	} catch {
		return null;
	}
}

export function writeCanvasViewport(
	workspacePath: string,
	flowId: string,
	viewport: CanvasViewport,
): void {
	if (!workspacePath || !flowId) return;
	try {
		localStorage.setItem(
			viewportStorageKey(workspacePath, flowId),
			JSON.stringify(normalizeCanvasViewport(viewport)),
		);
	} catch {
		/* ignore quota / private mode */
	}
}

export type CanvasPointerTool = "select" | "hand";

/** Left = 0, middle = 1. Right (2) stays free for the canvas context menu. */
const LEFT_AND_MIDDLE = [0, 1] as const;
const MIDDLE_ONLY = [1] as const;

export function canvasPaneInteraction(
	tool: CanvasPointerTool,
	spacePan: boolean,
): {
	panOnDrag: number[];
	selectionOnDrag: boolean;
} {
	const panWithLeft = tool === "hand" || spacePan;
	return {
		panOnDrag: panWithLeft ? [...LEFT_AND_MIDDLE] : [...MIDDLE_ONLY],
		selectionOnDrag: !panWithLeft,
	};
}

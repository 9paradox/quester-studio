import { cn } from "@/lib/utils.js";
import { IconGripVertical } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";

type ResizeGutterProps = {
	orientation: "horizontal" | "vertical";
	onResize: (delta: number) => void;
	className?: string;
};

export function ResizeGutter({
	orientation,
	onResize,
	className,
}: ResizeGutterProps) {
	const dragging = useRef(false);
	const startPos = useRef(0);
	const [active, setActive] = useState(false);

	const onPointerMove = useCallback(
		(e: PointerEvent) => {
			if (!dragging.current) return;
			const delta =
				orientation === "vertical"
					? e.clientX - startPos.current
					: startPos.current - e.clientY;
			startPos.current = orientation === "vertical" ? e.clientX : e.clientY;
			onResize(delta);
		},
		[orientation, onResize],
	);

	const onPointerUp = useCallback(() => {
		dragging.current = false;
		setActive(false);
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
	}, [onPointerMove]);

	const onPointerDown = (e: React.PointerEvent) => {
		e.preventDefault();
		dragging.current = true;
		setActive(true);
		startPos.current = orientation === "vertical" ? e.clientX : e.clientY;
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	const isVertical = orientation === "vertical";

	return (
		<div
			className={cn(
				"group relative shrink-0",
				isVertical ? "w-2" : "h-2 w-full",
				className,
			)}
		>
			<button
				type="button"
				tabIndex={0}
				aria-label="Resize panel"
				onPointerDown={onPointerDown}
				className={cn(
					"absolute touch-none transition-colors",
					isVertical
						? "inset-y-0 -left-1 -right-1 cursor-col-resize"
						: "inset-x-0 -top-1 -bottom-1 cursor-row-resize",
					active ? "bg-primary/20" : "bg-transparent hover:bg-primary/10",
				)}
			/>
			<div
				className={cn(
					"pointer-events-none absolute flex items-center justify-center",
					isVertical
						? "inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border group-hover:bg-primary/40"
						: "inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border group-hover:bg-primary/40",
					active && "bg-primary/50",
				)}
			/>
			{isVertical ? (
				<IconGripVertical className="pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50 group-hover:text-muted-foreground" />
			) : null}
		</div>
	);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export { clamp };

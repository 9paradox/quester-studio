/** Brief window after applying an agent/disk flow where canvas→store emits are ignored. */
let suppressCanvasEmitUntil = 0;

export function markExternalFlowApply(ms = 450): void {
	suppressCanvasEmitUntil = Math.max(suppressCanvasEmitUntil, Date.now() + ms);
}

export function shouldSuppressCanvasEmit(): boolean {
	return Date.now() < suppressCanvasEmitUntil;
}

/** Test helper — end the suppress window immediately. */
export function clearExternalFlowApplyGuard(): void {
	suppressCanvasEmitUntil = 0;
}

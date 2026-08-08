/** True when keyboard focus is in a text field / editor (do not treat as canvas shortcuts). */
export function isTypingFocus(target: EventTarget | null): boolean {
	const el = resolveElement(target);
	if (!el) return false;
	const tag = el.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (el instanceof HTMLElement && el.isContentEditable) return true;
	if (el.closest("input, textarea, select, [contenteditable='true']")) {
		return true;
	}
	// CodeMirror 6 root / content; React Flow `.nokey` opt-out
	if (el.closest(".cm-editor, .cm-content, .nokey")) return true;
	return false;
}

function resolveElement(target: EventTarget | null): Element | null {
	if (!target || typeof Element === "undefined") return null;
	if (target instanceof Element) return target;
	// Key events may target a Text node inside contenteditable / CodeMirror
	if (
		typeof Node !== "undefined" &&
		target instanceof Node &&
		target.nodeType === Node.TEXT_NODE
	) {
		return target.parentElement;
	}
	return null;
}

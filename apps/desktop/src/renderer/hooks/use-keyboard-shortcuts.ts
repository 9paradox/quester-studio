import { useQuesterStore } from "@/stores/quester-store.js";
import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (target.isContentEditable) return true;
	return Boolean(target.closest("[contenteditable='true']"));
}

/** Ctrl/Cmd+S saves the active editor tab. */
export function useKeyboardShortcuts() {
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const mod = event.metaKey || event.ctrlKey;
			if (!mod || event.altKey) return;

			if (event.key.toLowerCase() === "s") {
				event.preventDefault();
				void saveActiveTab();
				return;
			}

			// Reserved for future shortcuts; editable targets stay native otherwise.
			if (isEditableTarget(event.target)) return;
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [saveActiveTab]);
}

import {
	findCommandForKeyboardEvent,
	isCommandPaletteOpen,
	runCommand,
} from "@/lib/commands.js";
import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (target.isContentEditable) return true;
	return Boolean(target.closest("[contenteditable='true']"));
}

/** App-wide keyboard shortcuts (documented in Preferences → Shortcuts). */
export function useKeyboardShortcuts() {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isCommandPaletteOpen()) return;

			const command = findCommandForKeyboardEvent(event);
			if (!command) return;

			if (command.id === "tab.close" && isEditableTarget(event.target)) {
				return;
			}

			event.preventDefault();
			runCommand(command.id);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}

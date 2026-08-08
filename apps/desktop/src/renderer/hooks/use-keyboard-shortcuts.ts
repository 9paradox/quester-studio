import {
	findCommandForKeyboardEvent,
	isCommandPaletteOpen,
	runCommand,
} from "@/lib/commands.js";
import { isTypingFocus } from "@/lib/typingFocus.js";
import { useEffect } from "react";

/** App-wide keyboard shortcuts (documented in Preferences → Shortcuts). */
export function useKeyboardShortcuts() {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isCommandPaletteOpen()) return;

			const command = findCommandForKeyboardEvent(event);
			if (!command) return;

			if (command.id === "tab.close" && isTypingFocus(event.target)) {
				return;
			}

			event.preventDefault();
			runCommand(command.id);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}

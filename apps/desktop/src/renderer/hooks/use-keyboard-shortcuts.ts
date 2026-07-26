import { useQuesterStore } from "@/stores/quester-store.js";
import { selectActiveTab } from "@/stores/selectors.js";
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
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const closeTab = useQuesterStore((s) => s.closeTab);
	const runFlow = useQuesterStore((s) => s.runFlow);
	const sendRequest = useQuesterStore((s) => s.sendRequest);
	const activeTabId = useQuesterStore((s) => s.activeTabId);
	const activeTab = useQuesterStore(selectActiveTab);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const mod = event.metaKey || event.ctrlKey;
			if (!mod || event.altKey) return;

			const key = event.key.toLowerCase();

			if (key === "s") {
				event.preventDefault();
				void saveActiveTab();
				return;
			}

			if (key === "enter") {
				event.preventDefault();
				if (activeTab?.kind === "request") {
					void sendRequest();
				} else if (activeTab?.kind === "flow") {
					void runFlow();
				}
				return;
			}

			if (key === "w") {
				if (isEditableTarget(event.target)) return;
				event.preventDefault();
				if (activeTabId) closeTab(activeTabId);
				return;
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		saveActiveTab,
		closeTab,
		runFlow,
		sendRequest,
		activeTabId,
		activeTab?.kind,
	]);
}

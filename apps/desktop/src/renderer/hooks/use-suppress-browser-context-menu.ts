import { useEffect } from "react";

/**
 * Blocks the Chromium/webview default context menu so only app ContextMenus
 * (canvas, sidebar items, tabs) appear.
 */
export function useSuppressBrowserContextMenu(): void {
	useEffect(() => {
		const onContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};
		document.addEventListener("contextmenu", onContextMenu);
		return () => document.removeEventListener("contextmenu", onContextMenu);
	}, []);
}

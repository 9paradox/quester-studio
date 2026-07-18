import { desktopRpc, onNodeRunStatus } from "@/lib/electrobun.js";
import { useEffect } from "react";
import { useQuesterStore } from "./quester-store.js";

export function useAppInit() {
	const loadWorkspace = useQuesterStore((s) => s.loadWorkspace);

	useEffect(() => {
		const unsubscribe = onNodeRunStatus((event) => {
			useQuesterStore.getState().applyNodeRunStatusEvent(event);
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		void (async () => {
			try {
				const path = await desktopRpc.getDefaultWorkspace();
				await loadWorkspace(path);
			} catch (err) {
				useQuesterStore.setState({
					loadError:
						err instanceof Error ? err.message : "Failed to initialize",
					isLoading: false,
				});
			}
		})();
	}, [loadWorkspace]);
}

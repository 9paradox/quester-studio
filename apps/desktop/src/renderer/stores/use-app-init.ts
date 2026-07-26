import { desktopRpc, onNodeRunStatus } from "@/lib/electrobun.js";
import { readTlsVerifyPreference } from "@/lib/tlsPreference.js";
import { readLastWorkspacePath } from "@/lib/workspacePreference.js";
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
				await desktopRpc.setAppTlsVerify(readTlsVerifyPreference());
			} catch {
				/* ignore — preference sync is best-effort at boot */
			}
			const last = readLastWorkspacePath();
			if (!last) {
				useQuesterStore.setState({ isLoading: false, loadError: null });
				return;
			}
			try {
				await loadWorkspace(last);
			} catch (err) {
				useQuesterStore.setState({
					workspacePath: "",
					workspaceName: "",
					loadError:
						err instanceof Error
							? err.message
							: "Failed to restore last workspace",
					isLoading: false,
				});
			}
		})();
	}, [loadWorkspace]);
}

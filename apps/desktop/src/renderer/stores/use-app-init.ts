import { getQuesterClient } from "@/lib/quester-client.js";
import { readTlsVerifyPreference } from "@/lib/tlsPreference.js";
import { readLastWorkspacePath } from "@/lib/workspacePreference.js";
import { useEffect } from "react";
import { useQuesterStore } from "./quester-store.js";

export function useAppInit() {
	const loadWorkspace = useQuesterStore((s) => s.loadWorkspace);

	useEffect(() => {
		const client = getQuesterClient();
		const unsubStatus = client.onNodeRunStatus((event) => {
			useQuesterStore.getState().applyNodeRunStatusEvent(event);
		});
		const unsubForm = client.onFormAwait((event) => {
			useQuesterStore.getState().applyFormAwaitEvent(event);
		});
		return () => {
			unsubStatus();
			unsubForm();
		};
	}, []);

	useEffect(() => {
		void (async () => {
			try {
				await getQuesterClient().setAppTlsVerify(readTlsVerifyPreference());
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

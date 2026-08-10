import { getQuesterClient } from "@/lib/quester-client.js";
import { readTlsVerifyPreference } from "@/lib/tlsPreference.js";
import { readLastWorkspacePath } from "@/lib/workspacePreference.js";
import { useEffect } from "react";
import { useQuesterStore } from "./quester-store.js";

export function useAppInit() {
	const loadWorkspace = useQuesterStore((s) => s.loadWorkspace);

	useEffect(() => {
		const unsubscribe = getQuesterClient().onNodeRunStatus((event) => {
			useQuesterStore.getState().applyNodeRunStatusEvent(event);
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		// Eagerly load electrobun so the store bridge in that module registers
		// before workspace watches start emitting MCP activity.
		let unsubFile: (() => void) | undefined;
		void import("@/lib/electrobun.js").then(
			({ onFlowFileChanged, desktopRpc }) => {
				unsubFile = onFlowFileChanged((event) => {
					const state = useQuesterStore.getState();
					if (
						!state.workspacePath ||
						resolveWorkspaceKey(event.workspace) !==
							resolveWorkspaceKey(state.workspacePath)
					) {
						return;
					}
					state.handleExternalFlowChange(event.flowId);
				});
				void desktopRpc.getMcpServerStatus().then((status) => {
					useQuesterStore.getState().applyMcpServerStatus(status);
				});
			},
		);
		return () => {
			unsubFile?.();
		};
	}, []);

	useEffect(() => {
		void (async () => {
			try {
				await getQuesterClient().setAppTlsVerify(readTlsVerifyPreference());
			} catch {
				/* ignore — preference sync is best-effort at boot */
			}
			// Ensure electrobun (and MCP activity store bridge) is loaded first.
			await import("@/lib/electrobun.js");
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

function resolveWorkspaceKey(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

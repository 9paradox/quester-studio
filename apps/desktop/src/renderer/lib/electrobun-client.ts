import type { QuesterClient } from "@quester-studio/api-contract";
import { desktopRpc, onNodeRunStatus } from "./electrobun.js";

export function createElectrobunQuesterClient(): QuesterClient {
	return {
		...desktopRpc,
		onNodeRunStatus,
	};
}

/**
 * Desktop main-process handlers: thin adapters over @quester-studio/workspace-service
 * plus Electrobun-only APIs (folder picker, native chrome).
 */
export {
	createCollection,
	createEnvironment,
	createFlow,
	createRequest,
	createSecretsFile,
	defaultWorkspaceRoot,
	deleteFlow,
	deleteRequest,
	executeFlowRpc,
	cancelFlowRun,
	executeRequestRpc,
	getAppTlsVerify,
	getDefaultWorkspace,
	importCollection,
	listCollectionRequests,
	listCollections,
	listEnvs,
	listFlows,
	listSecretFiles,
	listSecretNames,
	loadEnvironment,
	loadFlow,
	loadRequest,
	loadSampleFlowJson,
	loadSecretsFile,
	loadWorkspaceManifest,
	openWorkspace,
	openWorkspaceSummary,
	readPathShapes,
	renameFlow,
	listRunTree,
	readRunJson,
	deleteRunPath,
	saveEnvironment,
	saveFlow,
	saveRequest,
	saveSecretsFile,
	saveWorkspaceManifest,
	scaffoldWorkspaceRpc,
	setAppTlsVerify,
	writePathShapes,
	type ExecuteFlowRpcOptions,
} from "@quester-studio/workspace-service";

export async function pickWorkspaceFolder(): Promise<string | null> {
	const { Utils } = await import("electrobun/bun");
	const paths = await Utils.openFileDialog({
		canChooseDirectory: true,
		canChooseFiles: false,
		allowsMultipleSelection: false,
		allowedFileTypes: "*",
	});
	return paths[0] ?? null;
}

export async function pickCollectionFile(): Promise<string | null> {
	const { Utils } = await import("electrobun/bun");
	const paths = await Utils.openFileDialog({
		canChooseDirectory: false,
		canChooseFiles: true,
		allowsMultipleSelection: false,
		allowedFileTypes: "json",
	});
	return paths[0] ?? null;
}

/** Open a file or folder in the OS file manager. */
export async function openPathInOs(
	targetPath: string,
): Promise<{ ok: boolean; error?: string }> {
	const { access } = await import("node:fs/promises");
	const { spawn } = await import("node:child_process");
	const { resolve } = await import("node:path");
	const abs = resolve(targetPath);
	try {
		await access(abs);
	} catch {
		return { ok: false, error: `Path not found: ${abs}` };
	}
	try {
		if (process.platform === "win32") {
			spawn("explorer", [abs], { detached: true, stdio: "ignore" }).unref();
		} else if (process.platform === "darwin") {
			spawn("open", [abs], { detached: true, stdio: "ignore" }).unref();
		} else {
			spawn("xdg-open", [abs], { detached: true, stdio: "ignore" }).unref();
		}
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

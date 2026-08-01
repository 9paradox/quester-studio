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

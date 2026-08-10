import type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	ExecutionLogEntry,
	FlowMeta,
	FormAwaitEvent,
	FormMeta,
	NodeRunStatus,
	NodeRunStatusEvent,
	RequestMeta,
	RunFlowEntry,
	SecretFileMeta,
	WorkspaceSummary,
} from "@quester-studio/api-contract";
import type {
	EnvironmentV1,
	FlowV1,
	FormV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";
import type { RPCSchema } from "electrobun";
import type { ThemePreference } from "./appPreferences.js";

export type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	ExecutionLogEntry,
	FlowMeta,
	FormAwaitEvent,
	FormMeta,
	NodeRunStatus,
	NodeRunStatusEvent,
	RequestMeta,
	RunFlowEntry,
	SecretFileMeta,
	WorkspaceSummary,
};

export type DesktopRPC = {
	bun: RPCSchema<{
		requests: {
			getDefaultWorkspace: {
				params: Record<string, never>;
				response: string;
			};
			pickWorkspaceFolder: {
				params: Record<string, never>;
				response: string | null;
			};
			pickCollectionFile: {
				params: Record<string, never>;
				response: string | null;
			};
			scaffoldWorkspace: {
				params: { path: string; name?: string };
				response: { root: string; name: string; flowId: string };
			};
			openWorkspaceSummary: {
				params: { path: string };
				response: WorkspaceSummary;
			};
			loadWorkspaceManifest: {
				params: { workspace: string };
				response: WorkspaceV1;
			};
			saveWorkspaceManifest: {
				params: {
					workspace: string;
					manifest: WorkspaceV1;
				};
				response: WorkspaceV1;
			};
			listFlows: {
				params: { workspace: string };
				response: FlowMeta[];
			};
			listForms: {
				params: { workspace: string };
				response: FormMeta[];
			};
			listEnvs: {
				params: { workspace: string };
				response: string[];
			};
			loadFlow: {
				params: { flowId: string; workspace: string };
				response: FlowV1;
			};
			loadForm: {
				params: { formId: string; workspace: string };
				response: FormV1;
			};
			executeFlowRpc: {
				params: {
					flowId: string;
					workspace: string;
					runId: string;
					env?: string;
					input?: unknown;
				};
				response: ExecuteFlowRpcResult;
			};
			submitFormRun: {
				params: { runId: string; nodeId: string; values: unknown };
				response: { ok: boolean; error?: string };
			};
			cancelFlowRun: {
				params: { runId: string };
				response: { ok: boolean };
			};
			saveFlow: {
				params: { flow: FlowV1; workspace: string };
				response: FlowV1;
			};
			saveForm: {
				params: { form: FormV1; workspace: string };
				response: FormV1;
			};
			listSecretNames: {
				params: { workspace: string; env: string };
				response: string[];
			};
			createFlow: {
				params: { workspace: string; flowId: string; name?: string };
				response: FlowV1;
			};
			createForm: {
				params: { workspace: string; formId: string; name?: string };
				response: FormV1;
			};
			deleteFlow: {
				params: { workspace: string; flowId: string };
				response: { ok: true };
			};
			deleteForm: {
				params: { workspace: string; formId: string };
				response: { ok: true };
			};
			renameFlow: {
				params: {
					workspace: string;
					flowId: string;
					newId: string;
					name?: string;
				};
				response: FlowV1;
			};
			renameForm: {
				params: {
					workspace: string;
					formId: string;
					newId: string;
					name?: string;
				};
				response: FormV1;
			};
			loadEnvironment: {
				params: { workspace: string; envName: string };
				response: EnvironmentV1;
			};
			saveEnvironment: {
				params: { workspace: string; environment: EnvironmentV1 };
				response: EnvironmentV1;
			};
			createEnvironment: {
				params: { workspace: string; envName: string };
				response: EnvironmentV1;
			};
			listSecretFiles: {
				params: { workspace: string };
				response: SecretFileMeta[];
			};
			loadSecretsFile: {
				params: { workspace: string; envName: string };
				response: SecretsV1;
			};
			saveSecretsFile: {
				params: {
					workspace: string;
					envName: string;
					secrets: SecretsV1;
				};
				response: SecretsV1;
			};
			createSecretsFile: {
				params: { workspace: string; envName: string };
				response: SecretsV1;
			};
			listCollectionRequests: {
				params: { workspace: string };
				response: RequestMeta[];
			};
			listCollections: {
				params: { workspace: string };
				response: string[];
			};
			loadRequest: {
				params: { workspace: string; requestPath: string };
				response: RequestV1;
			};
			saveRequest: {
				params: {
					workspace: string;
					requestPath: string;
					request: RequestV1;
				};
				response: RequestV1;
			};
			createRequest: {
				params: {
					workspace: string;
					requestPath: string;
					name?: string;
				};
				response: RequestV1;
			};
			deleteRequest: {
				params: { workspace: string; requestPath: string };
				response: { ok: true };
			};
			createCollection: {
				params: { workspace: string; collectionName: string };
				response: { ok: true };
			};
			importCollection: {
				params: { workspace: string; filePath: string };
				response: { imported: string[]; skipped: string[] };
			};
			executeRequestRpc: {
				params: {
					requestPath: string;
					workspace: string;
					env?: string;
				};
				response: ExecuteRequestRpcResult;
			};
			readPathShapes: {
				params: { workspace: string };
				response: unknown;
			};
			writePathShapes: {
				params: { workspace: string; data: unknown };
				response: { ok: true };
			};
			setAppTlsVerify: {
				params: { verifyTls: boolean };
				response: { ok: true; verifyTls: boolean };
			};
			getAppTlsVerify: {
				params: Record<string, never>;
				response: { verifyTls: boolean };
			};
			openPathInOs: {
				params: { path: string };
				response: { ok: boolean; error?: string };
			};
			listRunTree: {
				params: { workspace: string };
				response: RunFlowEntry[];
			};
			readRunJson: {
				params: { workspace: string; relativePath: string };
				response: unknown;
			};
			deleteRunPath: {
				params: { workspace: string; relativePath: string };
				response: { ok: true };
			};
			setNativeChromeTheme: {
				params: { theme: ThemePreference };
				response: { ok: true; dark: boolean; theme: ThemePreference };
			};
		};
		messages: Record<string, never>;
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: {
			nodeRunStatus: NodeRunStatusEvent;
			formAwait: FormAwaitEvent;
		};
	}>;
};

import type { KeyValueRow } from "@/components/KeyValueEditor.js";
import { recordToRows } from "@/components/KeyValueEditor.js";
import { runInputJsonFromFlow } from "@/lib/runDefaults.js";
import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";

export type FlowEditorTab = {
	kind: "flow";
	id: string;
	flowId: string;
	flow: FlowV1;
	/** Draft / committed run input for this flow (synced from input node `value`). */
	inputJson: string;
	dirty: boolean;
};

export type EnvEditorTab = {
	kind: "env";
	id: string;
	envName: string;
	environment: EnvironmentV1;
	/** Editing source of truth — preserves empty/in-progress rows. */
	rows: KeyValueRow[];
	dirty: boolean;
};

export type SecretsEditorTab = {
	kind: "secrets";
	id: string;
	envName: string;
	secrets: SecretsV1;
	/** Editing source of truth — preserves empty/in-progress rows. */
	rows: KeyValueRow[];
	dirty: boolean;
};

export type RequestEditorTab = {
	kind: "request";
	id: string;
	requestPath: string;
	request: RequestV1;
	dirty: boolean;
};

export type AppSettingsEditorTab = {
	kind: "appSettings";
	id: string;
	dirty: boolean;
};

export type WorkspaceSettingsEditorTab = {
	kind: "workspaceSettings";
	id: string;
	manifest: WorkspaceV1;
	dirty: boolean;
};

/** Frozen HTTP / node output for a full-bleed response viewer tab. */
export type ResponseViewerSnapshot = {
	source: "flow" | "collection";
	title: string;
	/** Optional node / request id shown under the title. */
	subtitle?: string;
	error?: string | null;
	/** Frozen node/http output (plan 03 may virtualize large payloads). */
	output: unknown;
	pathCopyNodeId?: string | null;
};

export type ResponseViewerTab = {
	kind: "response";
	id: string;
	dirty: boolean;
	snapshot: ResponseViewerSnapshot;
};

export type EditorTab =
	| FlowEditorTab
	| EnvEditorTab
	| SecretsEditorTab
	| RequestEditorTab
	| AppSettingsEditorTab
	| WorkspaceSettingsEditorTab
	| ResponseViewerTab;

export function flowTabId(flowId: string): string {
	return `flow:${flowId}`;
}

export function envTabId(envName: string): string {
	return `env:${envName}`;
}

export function secretsTabId(envName: string): string {
	return `secrets:${envName}`;
}

export function requestTabId(requestPath: string): string {
	return `request:${requestPath}`;
}

export function appSettingsTabId(): string {
	return "settings:app";
}

export function workspaceSettingsTabId(): string {
	return "settings:workspace";
}

export function responseTabId(sourceKey: string, stamp: number): string {
	return `response:${sourceKey}:${stamp}`;
}

export function createFlowEditorTab(flow: FlowV1): FlowEditorTab {
	return {
		kind: "flow",
		id: flowTabId(flow.id),
		flowId: flow.id,
		flow,
		inputJson: runInputJsonFromFlow(flow),
		dirty: false,
	};
}

export function createEnvEditorTab(environment: EnvironmentV1): EnvEditorTab {
	return {
		kind: "env",
		id: envTabId(environment.name),
		envName: environment.name,
		environment,
		rows: recordToRows(environment.variables),
		dirty: false,
	};
}

export function createSecretsEditorTab(
	envName: string,
	secrets: SecretsV1,
): SecretsEditorTab {
	return {
		kind: "secrets",
		id: secretsTabId(envName),
		envName,
		secrets,
		rows: recordToRows(secrets.secrets),
		dirty: false,
	};
}

export function createRequestEditorTab(
	requestPath: string,
	request: RequestV1,
): RequestEditorTab {
	return {
		kind: "request",
		id: requestTabId(requestPath),
		requestPath,
		request,
		dirty: false,
	};
}

export function createAppSettingsEditorTab(): AppSettingsEditorTab {
	return {
		kind: "appSettings",
		id: appSettingsTabId(),
		dirty: false,
	};
}

export function createWorkspaceSettingsEditorTab(
	manifest: WorkspaceV1,
): WorkspaceSettingsEditorTab {
	return {
		kind: "workspaceSettings",
		id: workspaceSettingsTabId(),
		manifest,
		dirty: false,
	};
}

export function createResponseViewerTab(
	snapshot: ResponseViewerSnapshot,
	sourceKey: string,
	stamp: number = Date.now(),
): ResponseViewerTab {
	return {
		kind: "response",
		id: responseTabId(sourceKey, stamp),
		dirty: false,
		snapshot,
	};
}

export function editorTabLabel(tab: EditorTab): string {
	switch (tab.kind) {
		case "flow":
			return tab.flow.name ?? tab.flowId;
		case "env":
			return `${tab.envName}.json`;
		case "secrets":
			return `${tab.envName}.secrets.json`;
		case "request":
			return tab.request.name;
		case "appSettings":
			return "Preferences";
		case "workspaceSettings":
			return "Workspace settings";
		case "response":
			return tab.snapshot.title;
	}
}

export function editorTabIcon(
	tab: EditorTab,
):
	| "flow"
	| "env"
	| "secrets"
	| "request"
	| "appSettings"
	| "workspaceSettings"
	| "response" {
	return tab.kind;
}

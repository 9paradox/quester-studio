import type { KeyValueRow } from "@/components/KeyValueEditor.js";
import { recordToRows } from "@/components/KeyValueEditor.js";
import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester/schema";

export type FlowEditorTab = {
	kind: "flow";
	id: string;
	flowId: string;
	flow: FlowV1;
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

export type EditorTab = FlowEditorTab | EnvEditorTab | SecretsEditorTab;

export function flowTabId(flowId: string): string {
	return `flow:${flowId}`;
}

export function envTabId(envName: string): string {
	return `env:${envName}`;
}

export function secretsTabId(envName: string): string {
	return `secrets:${envName}`;
}

export function createFlowEditorTab(flow: FlowV1): FlowEditorTab {
	return {
		kind: "flow",
		id: flowTabId(flow.id),
		flowId: flow.id,
		flow,
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

export function editorTabLabel(tab: EditorTab): string {
	switch (tab.kind) {
		case "flow":
			return tab.flow.name ?? tab.flowId;
		case "env":
			return `${tab.envName}.json`;
		case "secrets":
			return `${tab.envName}.secrets.json`;
	}
}

export function editorTabIcon(tab: EditorTab): "flow" | "env" | "secrets" {
	return tab.kind;
}

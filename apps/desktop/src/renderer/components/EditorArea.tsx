import type { EditorTab } from "@/lib/editorTabs.js";
import type { FlowV1 } from "@quester/schema";
import type { Edge, Node } from "reactflow";
import { CanvasControls } from "./CanvasControls.js";
import { FlowCanvas } from "./FlowCanvas.js";
import {
	KeyValueEditor,
	type KeyValueRow,
	recordToRows,
} from "./KeyValueEditor.js";

type EditorAreaProps = {
	activeTab: EditorTab | null;
	envRows: KeyValueRow[];
	secretRows: KeyValueRow[];
	envs: string[];
	selectedEnv: string;
	onEnvChange: (env: string) => void;
	isRunning: boolean;
	canRun: boolean;
	onRun: () => void;
	onEnvRowsChange: (rows: KeyValueRow[]) => void;
	onSecretRowsChange: (rows: KeyValueRow[]) => void;
	onGraphChange: (nodes: Node[], edges: Edge[]) => void;
	onSelectNode: (nodeId: string | null) => void;
	onZoomChange: (zoom: number) => void;
};

export function EditorArea({
	activeTab,
	envRows,
	secretRows,
	envs,
	selectedEnv,
	onEnvChange,
	isRunning,
	canRun,
	onRun,
	onEnvRowsChange,
	onSecretRowsChange,
	onGraphChange,
	onSelectNode,
	onZoomChange,
}: EditorAreaProps) {
	if (!activeTab) {
		return (
			<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
				Select a file from the sidebar
			</div>
		);
	}

	if (activeTab.kind === "env") {
		return (
			<div className="relative min-h-0 min-w-0 flex-1 bg-background">
				<KeyValueEditor
					title={`${activeTab.envName}.json`}
					description="Environment variables available as {{env.KEY}} in flows."
					rows={envRows}
					onChange={onEnvRowsChange}
				/>
			</div>
		);
	}

	if (activeTab.kind === "secrets") {
		return (
			<div className="relative min-h-0 min-w-0 flex-1 bg-background">
				<KeyValueEditor
					title={`${activeTab.envName}.secrets.json`}
					description="Secrets are loaded at runtime and never committed to git."
					rows={secretRows}
					onChange={onSecretRowsChange}
					valuePlaceholder="Secret value"
				/>
			</div>
		);
	}

	const flow = activeTab.flow;
	return (
		<div className="relative min-h-0 min-w-0 flex-1">
			<FlowCanvas
				flow={flow}
				onGraphChange={onGraphChange}
				onSelectNode={onSelectNode}
				onZoomChange={onZoomChange}
			/>
			<CanvasControls
				envs={envs}
				selectedEnv={selectedEnv}
				onEnvChange={onEnvChange}
				isRunning={isRunning}
				canRun={canRun}
				onRun={onRun}
			/>
		</div>
	);
}

export function flowFromTab(tab: EditorTab): FlowV1 | null {
	return tab.kind === "flow" ? tab.flow : null;
}

export { recordToRows };

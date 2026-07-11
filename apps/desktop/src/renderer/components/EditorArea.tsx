import type { EditorTab } from "@/lib/editorTabs.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectActiveTab, selectCanRun } from "@/stores/selectors.js";
import type { FlowV1 } from "@quester/schema";
import { useMemo } from "react";
import { CanvasControls } from "./CanvasControls.js";
import { FlowCanvas } from "./FlowCanvas.js";
import { KeyValueEditor, recordToRows } from "./KeyValueEditor.js";

export function EditorArea() {
	const activeTab = useQuesterStore(selectActiveTab);
	const envRows = useMemo(() => {
		if (activeTab?.kind !== "env") return [];
		return recordToRows(activeTab.environment.variables);
	}, [activeTab]);
	const secretRows = useMemo(() => {
		if (activeTab?.kind !== "secrets") return [];
		return recordToRows(activeTab.secrets.secrets);
	}, [activeTab]);
	const envs = useQuesterStore((s) => s.envs);
	const selectedEnv = useQuesterStore((s) => s.selectedEnv);
	const isRunning = useQuesterStore((s) => s.isRunning);
	const canRun = useQuesterStore(selectCanRun);

	const setSelectedEnv = useQuesterStore((s) => s.setSelectedEnv);
	const runFlow = useQuesterStore((s) => s.runFlow);
	const handleEnvRowsChange = useQuesterStore((s) => s.handleEnvRowsChange);
	const handleSecretRowsChange = useQuesterStore(
		(s) => s.handleSecretRowsChange,
	);
	const handleGraphChange = useQuesterStore((s) => s.handleGraphChange);
	const handleSelectNode = useQuesterStore((s) => s.handleSelectNode);
	const setZoom = useQuesterStore((s) => s.setZoom);

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
					onChange={handleEnvRowsChange}
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
					onChange={handleSecretRowsChange}
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
				onGraphChange={handleGraphChange}
				onSelectNode={handleSelectNode}
				onZoomChange={setZoom}
			/>
			<CanvasControls
				envs={envs}
				selectedEnv={selectedEnv}
				onEnvChange={setSelectedEnv}
				isRunning={isRunning}
				canRun={canRun}
				onRun={() => void runFlow()}
			/>
		</div>
	);
}

export function flowFromTab(tab: EditorTab): FlowV1 | null {
	return tab.kind === "flow" ? tab.flow : null;
}

export { recordToRows };

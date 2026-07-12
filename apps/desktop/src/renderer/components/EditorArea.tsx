import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu.js";
import type { EditorTab } from "@/lib/editorTabs.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectActiveTab, selectCanRun } from "@/stores/selectors.js";
import type { FlowV1 } from "@quester/schema";
import type { ReactNode } from "react";
import { CanvasControls } from "./CanvasControls.js";
import { FlowCanvas } from "./FlowCanvas.js";
import { KeyValueEditor } from "./KeyValueEditor.js";
import { RequestEditor } from "./RequestEditor.js";

function saveShortcutLabel(): string {
	if (typeof navigator === "undefined") return "Ctrl+S";
	return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘S" : "Ctrl+S";
}

function EditorContextMenu({
	canSave,
	onSave,
	children,
}: {
	canSave: boolean;
	onSave: () => void;
	children: ReactNode;
}) {
	return (
		<ContextMenu>
			<ContextMenuTrigger className="block h-full min-h-0 min-w-0 w-full flex-1">
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem disabled={!canSave} onClick={onSave}>
					Save
					<ContextMenuShortcut>{saveShortcutLabel()}</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function EditorArea() {
	const activeTab = useQuesterStore(selectActiveTab);
	const envs = useQuesterStore((s) => s.envs);
	const selectedEnv = useQuesterStore((s) => s.selectedEnv);
	const isRunning = useQuesterStore((s) => s.isRunning);
	const canRun = useQuesterStore(selectCanRun);
	const canvasDirty = useQuesterStore((s) => s.canvasDirty);

	const setSelectedEnv = useQuesterStore((s) => s.setSelectedEnv);
	const runFlow = useQuesterStore((s) => s.runFlow);
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const handleEnvRowsChange = useQuesterStore((s) => s.handleEnvRowsChange);
	const handleSecretRowsChange = useQuesterStore(
		(s) => s.handleSecretRowsChange,
	);
	const handleGraphChange = useQuesterStore((s) => s.handleGraphChange);
	const handleSelectNode = useQuesterStore((s) => s.handleSelectNode);
	const handleAddNode = useQuesterStore((s) => s.handleAddNode);
	const handleDropRequest = useQuesterStore((s) => s.handleDropRequest);
	const handleRequestChange = useQuesterStore((s) => s.handleRequestChange);
	const sendRequest = useQuesterStore((s) => s.sendRequest);
	const requestResult = useQuesterStore((s) => s.requestResult);
	const requestError = useQuesterStore((s) => s.requestError);
	const isSendingRequest = useQuesterStore((s) => s.isSendingRequest);
	const deleteNodes = useQuesterStore((s) => s.deleteNodes);
	const deleteEdges = useQuesterStore((s) => s.deleteEdges);
	const duplicateNode = useQuesterStore((s) => s.duplicateNode);
	const setZoom = useQuesterStore((s) => s.setZoom);

	const onSave = () => void saveActiveTab();
	const canSaveTab = Boolean(activeTab?.dirty);

	if (!activeTab) {
		return (
			<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
				Select a file from the sidebar
			</div>
		);
	}

	if (activeTab.kind === "env") {
		return (
			<EditorContextMenu canSave={canSaveTab} onSave={onSave}>
				<div className="relative h-full min-h-0 min-w-0 flex-1 bg-background">
					<KeyValueEditor
						title={`${activeTab.envName}.json`}
						description="Environment variables available as {{env.KEY}} in flows."
						rows={activeTab.rows}
						onChange={handleEnvRowsChange}
					/>
				</div>
			</EditorContextMenu>
		);
	}

	if (activeTab.kind === "secrets") {
		return (
			<EditorContextMenu canSave={canSaveTab} onSave={onSave}>
				<div className="relative h-full min-h-0 min-w-0 flex-1 bg-background">
					<KeyValueEditor
						title={`${activeTab.envName}.secrets.json`}
						description="Secrets are loaded at runtime and never committed to git."
						rows={activeTab.rows}
						onChange={handleSecretRowsChange}
						valuePlaceholder="Secret value"
					/>
				</div>
			</EditorContextMenu>
		);
	}

	if (activeTab.kind === "request") {
		return (
			<EditorContextMenu canSave={canSaveTab} onSave={onSave}>
				<div className="relative h-full min-h-0 min-w-0 flex-1">
					<RequestEditor
						request={activeTab.request}
						envs={envs}
						selectedEnv={selectedEnv}
						onEnvChange={setSelectedEnv}
						onChange={handleRequestChange}
						onSend={() => void sendRequest()}
						isSending={isSendingRequest}
						result={requestResult}
						error={requestError}
					/>
				</div>
			</EditorContextMenu>
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
				onDeleteNodes={deleteNodes}
				onDeleteEdges={deleteEdges}
				onDuplicateNode={duplicateNode}
				onAddNode={handleAddNode}
				onDropRequest={(path, position) =>
					void handleDropRequest(path, position)
				}
				onSave={onSave}
				canSave={canvasDirty}
			/>
			<CanvasControls
				envs={envs}
				selectedEnv={selectedEnv}
				onEnvChange={setSelectedEnv}
				isRunning={isRunning}
				canRun={canRun}
				onRun={() => void runFlow()}
				canSave={canvasDirty}
				onSave={onSave}
			/>
		</div>
	);
}

export function flowFromTab(tab: EditorTab): FlowV1 | null {
	return tab.kind === "flow" ? tab.flow : null;
}

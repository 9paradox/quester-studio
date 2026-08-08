import type { EditorTab } from "@/lib/editorTabs.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectActiveRequestSend,
	selectActiveTab,
	selectCanRun,
} from "@/stores/selectors.js";
import type { FlowV1 } from "@quester-studio/schema";
import { useShallow } from "zustand/react/shallow";
import { AppPreferencesEditor } from "./AppPreferencesEditor.js";
import { CanvasControls } from "./CanvasControls.js";
import { FlowCanvas } from "./FlowCanvas.js";
import { KeyValueEditor } from "./KeyValueEditor.js";
import { RequestEditor } from "./RequestEditor.js";
import { ResponseViewerPage } from "./ResponseViewerPage.js";
import { WorkspaceSettingsEditor } from "./WorkspaceSettingsEditor.js";
import { WorkspaceWelcome } from "./WorkspaceWelcome.js";

export function EditorArea() {
	const activeTab = useQuesterStore(selectActiveTab);
	const workspacePath = useQuesterStore((s) => s.workspacePath);
	const envs = useQuesterStore((s) => s.envs);
	const selectedEnv = useQuesterStore((s) => s.selectedEnv);
	const { isRunning } = useQuesterStore(selectActiveFlowRun);
	const canRun = useQuesterStore(selectCanRun);
	const setSelectedEnv = useQuesterStore((s) => s.setSelectedEnv);
	const runFlow = useQuesterStore((s) => s.runFlow);
	const stopFlow = useQuesterStore((s) => s.stopFlow);
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
	const {
		result: requestResult,
		error: requestError,
		isSending: isSendingRequest,
	} = useQuesterStore(useShallow(selectActiveRequestSend));
	const deleteNodes = useQuesterStore((s) => s.deleteNodes);
	const deleteEdges = useQuesterStore((s) => s.deleteEdges);
	const duplicateNode = useQuesterStore((s) => s.duplicateNode);
	const updateWorkspaceSettingsManifest = useQuesterStore(
		(s) => s.updateWorkspaceSettingsManifest,
	);
	const setZoom = useQuesterStore((s) => s.setZoom);

	const onSave = () => void saveActiveTab();
	const canSaveTab = Boolean(activeTab?.dirty);
	const canSaveFlow = Boolean(activeTab?.kind === "flow" && activeTab.dirty);

	if (!workspacePath) {
		if (activeTab?.kind === "appSettings") {
			return <AppPreferencesEditor />;
		}
		return <WorkspaceWelcome />;
	}

	if (!activeTab) {
		return (
			<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
				Select a file from the sidebar
			</div>
		);
	}

	if (activeTab.kind === "env") {
		const envName = activeTab.envName;
		return (
			<div className="relative h-full min-h-0 min-w-0 flex-1 bg-background">
				<KeyValueEditor
					title={`${envName}.json`}
					description={
						<>
							<p>
								Use in flows as{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{env.KEY}}"}
								</code>
								{" — "}
								e.g.{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{env.API_BASE}}"}
								</code>
								.
							</p>
							<p>
								Linked to env{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{envName}
								</code>
								. Pair with{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{envName}.secrets.json
								</code>{" "}
								(
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{secrets.KEY}}"}
								</code>
								). Select this env when running.
							</p>
						</>
					}
					rows={activeTab.rows}
					onChange={handleEnvRowsChange}
					onSave={onSave}
					canSave={canSaveTab}
				/>
			</div>
		);
	}

	if (activeTab.kind === "secrets") {
		const envName = activeTab.envName;
		return (
			<div className="relative h-full min-h-0 min-w-0 flex-1 bg-background">
				<KeyValueEditor
					title={`${envName}.secrets.json`}
					description={
						<>
							<p>
								Use in flows as{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{secrets.KEY}}"}
								</code>
								{" — "}
								e.g.{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{secrets.password}}"}
								</code>
								. Loaded at runtime; never committed to git.
							</p>
							<p>
								Linked to env{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{envName}
								</code>
								. Pair with{" "}
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{envName}.json
								</code>{" "}
								(
								<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
									{"{{env.KEY}}"}
								</code>
								). Select this env when running.
							</p>
						</>
					}
					rows={activeTab.rows}
					onChange={handleSecretRowsChange}
					valuePlaceholder="Secret value"
					maskValues
					onSave={onSave}
					canSave={canSaveTab}
				/>
			</div>
		);
	}

	if (activeTab.kind === "appSettings") {
		return <AppPreferencesEditor />;
	}

	if (activeTab.kind === "workspaceSettings") {
		return (
			<div className="relative h-full min-h-0 min-w-0 flex-1">
				<WorkspaceSettingsEditor
					tab={activeTab}
					onChange={updateWorkspaceSettingsManifest}
					onSave={onSave}
					canSave={canSaveTab}
				/>
			</div>
		);
	}

	if (activeTab.kind === "request") {
		return (
			<div className="relative h-full min-h-0 min-w-0 flex-1">
				<RequestEditor
					request={activeTab.request}
					requestPath={activeTab.requestPath}
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
		);
	}

	if (activeTab.kind === "response") {
		return (
			<div className="relative h-full min-h-0 min-w-0 flex-1">
				<ResponseViewerPage snapshot={activeTab.snapshot} />
			</div>
		);
	}

	if (activeTab.kind !== "flow") {
		return (
			<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
				Unsupported tab
			</div>
		);
	}

	const flow = activeTab.flow;
	return (
		<div className="relative min-h-0 min-w-0 flex-1">
			<FlowCanvas
				flow={flow}
				workspacePath={workspacePath}
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
				canSave={canSaveFlow}
			/>
			<CanvasControls
				envs={envs}
				selectedEnv={selectedEnv}
				onEnvChange={setSelectedEnv}
				isRunning={isRunning}
				canRun={canRun}
				onRun={() => void runFlow()}
				onStop={stopFlow}
				canSave={canSaveFlow}
				onSave={onSave}
			/>
		</div>
	);
}

export function flowFromTab(tab: EditorTab): FlowV1 | null {
	return tab.kind === "flow" ? tab.flow : null;
}

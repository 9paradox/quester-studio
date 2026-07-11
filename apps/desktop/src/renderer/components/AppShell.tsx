import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import {
	type EditorTab,
	createEnvEditorTab,
	createFlowEditorTab,
	createSecretsEditorTab,
	editorTabLabel,
	envTabId,
	flowTabId,
} from "@/lib/editorTabs.js";
import { desktopRpc } from "@/lib/electrobun.js";
import { addNodeToFlow, reactFlowToFlow } from "@/lib/flowEditor.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { DEFAULT_INPUT } from "@/lib/runDefaults.js";
import type { BuiltinNodeType, FlowV1 } from "@quester/schema";
import { SECRETS_VERSION } from "@quester/schema";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "reactflow";
import type {
	ExecuteFlowRpcResult,
	FlowMeta,
	SecretFileMeta,
} from "../../shared/rpc.js";
import { ActivityBar } from "./ActivityBar.js";
import { AuxiliarySidebar, type RightPanelTab } from "./AuxiliarySidebar.js";
import { EditorArea } from "./EditorArea.js";
import {
	type KeyValueRow,
	recordToRows,
	rowsToEnvVariables,
	rowsToStringRecord,
} from "./KeyValueEditor.js";
import { Panel } from "./Panel.js";
import { PlaygroundSheet } from "./PlaygroundSheet.js";
import { PrimarySidebar } from "./PrimarySidebar.js";
import { ResizeGutter, clamp } from "./ResizeGutter.js";
import { StatusBar } from "./StatusBar.js";
import { TopBar } from "./TopBar.js";

const DEFAULT_PANEL_HEIGHT = 180;
const DEFAULT_SIDEBAR_WIDTH = 240;
const DEFAULT_RIGHT_WIDTH = 320;

function slugifyName(name: string): string {
	return (
		name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "item"
	);
}

export function AppShell() {
	const [workspacePath, setWorkspacePath] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");
	const [flows, setFlows] = useState<FlowMeta[]>([]);
	const [envs, setEnvs] = useState<string[]>([]);
	const [secretFiles, setSecretFiles] = useState<SecretFileMeta[]>([]);
	const [selectedEnv, setSelectedEnv] = useState("local");

	const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
	const [activeTabId, setActiveTabId] = useState<string | null>(null);

	const [activityView, setActivityView] = useState<ActivityView>("flows");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [rightPanelOpen, setRightPanelOpen] = useState(true);
	const [rightPanelTab, setRightPanelTab] =
		useState<RightPanelTab>("inspector");
	const [panelOpen, setPanelOpen] = useState(true);
	const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
	const [panelTab, setPanelTab] = useState<"console" | "logs">("console");
	const [sidebarSearch, setSidebarSearch] = useState("");
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_WIDTH);

	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [zoom, setZoom] = useState(1);

	const [inputJson, setInputJson] = useState(DEFAULT_INPUT);
	const [inputError, setInputError] = useState<string | null>(null);
	const [playgroundOpen, setPlaygroundOpen] = useState(false);
	const [runResult, setRunResult] = useState<ExecuteFlowRpcResult | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [consoleLines, setConsoleLines] = useState<string[]>([
		"> Quester ready",
	]);

	const activeTab = useMemo(
		() => openTabs.find((t) => t.id === activeTabId) ?? null,
		[openTabs, activeTabId],
	);

	const activeFlowTab = activeTab?.kind === "flow" ? activeTab : null;

	const dirtyTabIds = useMemo(
		() => openTabs.filter((t) => t.dirty).map((t) => t.id),
		[openTabs],
	);

	const envRows = useMemo(() => {
		if (activeTab?.kind !== "env") return [];
		return recordToRows(activeTab.environment.variables);
	}, [activeTab]);

	const secretRows = useMemo(() => {
		if (activeTab?.kind !== "secrets") return [];
		return recordToRows(activeTab.secrets.secrets);
	}, [activeTab]);

	const appendConsole = useCallback((line: string) => {
		setConsoleLines((lines) => [...lines, `> ${line}`]);
	}, []);

	const clearConsole = useCallback(() => {
		setConsoleLines(["> Console cleared"]);
	}, []);

	const refreshWorkspaceLists = useCallback(async (path: string) => {
		const [flowList, envList, secretsList] = await Promise.all([
			desktopRpc.listFlows(path),
			desktopRpc.listEnvs(path),
			desktopRpc.listSecretFiles(path),
		]);
		setFlows(flowList);
		setEnvs(envList);
		setSecretFiles(secretsList);
		return { flowList, envList, secretsList };
	}, []);

	const openTab = useCallback((tab: EditorTab) => {
		setOpenTabs((tabs) => {
			const existing = tabs.find((t) => t.id === tab.id);
			if (existing) {
				return tabs.map((t) =>
					t.id === tab.id ? (t.dirty ? t : { ...tab, dirty: false }) : t,
				);
			}
			return [...tabs, tab];
		});
		setActiveTabId(tab.id);
		if (tab.kind === "flow") setSelectedNodeId(null);
	}, []);

	const loadFlow = useCallback(
		async (flowId: string, workspace: string) => {
			const flow = await desktopRpc.loadFlow(flowId, workspace);
			openTab(createFlowEditorTab(flow));
		},
		[openTab],
	);

	const loadEnvironment = useCallback(
		async (envName: string, workspace: string) => {
			const environment = await desktopRpc.loadEnvironment(workspace, envName);
			openTab(createEnvEditorTab(environment));
		},
		[openTab],
	);

	const loadSecretsFile = useCallback(
		async (envName: string, workspace: string) => {
			const secrets = await desktopRpc.loadSecretsFile(workspace, envName);
			openTab(createSecretsEditorTab(envName, secrets));
		},
		[openTab],
	);

	const loadWorkspace = useCallback(
		async (path: string) => {
			setIsLoading(true);
			setLoadError(null);
			setRunResult(null);
			setRunError(null);
			setOpenTabs([]);
			setActiveTabId(null);
			try {
				const summary = await desktopRpc.openWorkspaceSummary(path);
				const { flowList, envList } = await refreshWorkspaceLists(path);
				setWorkspacePath(path);
				setWorkspaceName(summary.name);
				const env = envList[0] ?? "local";
				setSelectedEnv(env);
				appendConsole(`Workspace loaded: ${summary.name}`);

				const firstFlow = flowList[0];
				if (firstFlow) {
					await loadFlow(firstFlow.id, path);
				}
			} catch (err) {
				setLoadError(
					err instanceof Error ? err.message : "Failed to load workspace",
				);
			} finally {
				setIsLoading(false);
			}
		},
		[loadFlow, appendConsole, refreshWorkspaceLists],
	);

	useEffect(() => {
		void (async () => {
			try {
				const path = await desktopRpc.getDefaultWorkspace();
				await loadWorkspace(path);
			} catch (err) {
				setLoadError(
					err instanceof Error ? err.message : "Failed to initialize",
				);
				setIsLoading(false);
			}
		})();
	}, [loadWorkspace]);

	const handleOpenWorkspace = async () => {
		try {
			const path = await desktopRpc.pickWorkspaceFolder();
			if (path) await loadWorkspace(path);
		} catch (err) {
			setLoadError(
				err instanceof Error ? err.message : "Failed to open workspace",
			);
		}
	};

	const handleActivityView = (view: ActivityView) => {
		if (sidebarOpen && activityView === view) {
			setSidebarOpen(false);
			return;
		}
		setActivityView(view);
		setSidebarOpen(true);
	};

	const updateActiveFlow = useCallback(
		(updater: (flow: FlowV1) => FlowV1, dirty = true) => {
			if (!activeTabId) return;
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId && t.kind === "flow"
						? {
								...t,
								flow: updater(t.flow),
								dirty: dirty ? true : t.dirty,
							}
						: t,
				),
			);
		},
		[activeTabId],
	);

	const handleGraphChange = useCallback(
		(nodes: Node[], edges: Edge[]) => {
			if (!activeTabId) return;
			setOpenTabs((tabs) =>
				tabs.map((t) => {
					if (t.id !== activeTabId || t.kind !== "flow") return t;
					const next = reactFlowToFlow(t.flow, nodes, edges);
					if (JSON.stringify(next) === JSON.stringify(t.flow)) return t;
					return { ...t, flow: next, dirty: true };
				}),
			);
		},
		[activeTabId],
	);

	const handleEnvRowsChange = useCallback(
		(rows: KeyValueRow[]) => {
			if (!activeTabId) return;
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId && t.kind === "env"
						? {
								...t,
								environment: {
									...t.environment,
									variables: rowsToEnvVariables(rows),
								},
								dirty: true,
							}
						: t,
				),
			);
		},
		[activeTabId],
	);

	const handleSecretRowsChange = useCallback(
		(rows: KeyValueRow[]) => {
			if (!activeTabId) return;
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.id === activeTabId && t.kind === "secrets"
						? {
								...t,
								secrets: {
									version: SECRETS_VERSION,
									secrets: rowsToStringRecord(rows),
								},
								dirty: true,
							}
						: t,
				),
			);
		},
		[activeTabId],
	);

	const handleAddNode = useCallback(
		(type: BuiltinNodeType) => {
			updateActiveFlow((flow) => addNodeToFlow(flow, type));
			setRightPanelOpen(true);
			setRightPanelTab("inspector");
		},
		[updateActiveFlow],
	);

	const handleSelectNode = useCallback((nodeId: string | null) => {
		setSelectedNodeId(nodeId);
		if (nodeId) {
			setRightPanelOpen(true);
			setRightPanelTab("inspector");
		}
	}, []);

	const handleUpdateNode = useCallback(
		(nodeId: string, data: Record<string, unknown>) => {
			updateActiveFlow((flow) => ({
				...flow,
				nodes: flow.nodes.map((n) => (n.id === nodeId ? { ...n, data } : n)),
			}));
		},
		[updateActiveFlow],
	);

	const handleCloseTab = useCallback(
		(tabId: string) => {
			const tab = openTabs.find((t) => t.id === tabId);
			if (tab?.dirty) {
				const ok = window.confirm(
					`Close ${editorTabLabel(tab)} with unsaved changes?`,
				);
				if (!ok) return;
			}
			setOpenTabs((tabs) => tabs.filter((t) => t.id !== tabId));
			if (activeTabId === tabId) {
				const remaining = openTabs.filter((t) => t.id !== tabId);
				setActiveTabId(remaining[0]?.id ?? null);
			}
		},
		[openTabs, activeTabId],
	);

	const handleSaveActive = async (tabId = activeTabId) => {
		if (!tabId || !workspacePath) return;
		const tab = openTabs.find((t) => t.id === tabId);
		if (!tab?.dirty) return;
		try {
			if (tab.kind === "flow") {
				const saved = await desktopRpc.saveFlow(tab.flow, workspacePath);
				setOpenTabs((tabs) =>
					tabs.map((t) =>
						t.id === tab.id
							? {
									...t,
									flowId: saved.id,
									flow: saved,
									dirty: false,
									id: flowTabId(saved.id),
								}
							: t,
					),
				);
				if (activeTabId === tab.id) setActiveTabId(flowTabId(saved.id));
				appendConsole(`Saved flow ${saved.id}`);
			} else if (tab.kind === "env") {
				const saved = await desktopRpc.saveEnvironment(
					workspacePath,
					tab.environment,
				);
				setOpenTabs((tabs) =>
					tabs.map((t) =>
						t.id === tab.id
							? {
									...t,
									environment: saved,
									envName: saved.name,
									id: envTabId(saved.name),
									dirty: false,
								}
							: t,
					),
				);
				if (activeTabId === tab.id) setActiveTabId(envTabId(saved.name));
				appendConsole(`Saved ${saved.name}.json`);
			} else {
				const saved = await desktopRpc.saveSecretsFile(
					workspacePath,
					tab.envName,
					tab.secrets,
				);
				setOpenTabs((tabs) =>
					tabs.map((t) =>
						t.id === tab.id ? { ...t, secrets: saved, dirty: false } : t,
					),
				);
				appendConsole(`Saved ${tab.envName}.secrets.json`);
			}
			await refreshWorkspaceLists(workspacePath);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Save failed");
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleCreateFlow = async () => {
		if (!workspacePath) return;
		const name = window.prompt("New flow name");
		if (!name?.trim()) return;
		const flowId = slugifyName(name);
		try {
			const flow = await desktopRpc.createFlow(
				workspacePath,
				flowId,
				name.trim(),
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createFlowEditorTab(flow));
			appendConsole(`Created flow ${flow.id}`);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Create flow failed");
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleCreateEnv = async () => {
		if (!workspacePath) return;
		const name = window.prompt("New environment name");
		if (!name?.trim()) return;
		const envName = slugifyName(name);
		try {
			const environment = await desktopRpc.createEnvironment(
				workspacePath,
				envName,
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createEnvEditorTab(environment));
			appendConsole(`Created ${envName}.json`);
		} catch (err) {
			setRunError(
				err instanceof Error ? err.message : "Create environment failed",
			);
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleCreateSecretsFile = async () => {
		if (!workspacePath) return;
		const name = window.prompt(
			"Environment name for secrets file",
			envs[0] ?? "local",
		);
		if (!name?.trim()) return;
		const envName = slugifyName(name);
		try {
			const secrets = await desktopRpc.createSecretsFile(
				workspacePath,
				envName,
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createSecretsEditorTab(envName, secrets));
			appendConsole(`Created ${envName}.secrets.json`);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Create secrets failed");
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleRenameFlow = async (flowId: string) => {
		if (!workspacePath) return;
		const meta = flows.find((f) => f.id === flowId);
		const tab = openTabs.find((t) => t.kind === "flow" && t.flowId === flowId);
		const currentName =
			tab?.kind === "flow"
				? (tab.flow.name ?? tab.flowId)
				: (meta?.name ?? flowId);
		const name = window.prompt("Rename flow", currentName);
		if (!name?.trim() || name.trim() === currentName) return;

		const newId = slugifyName(name);
		try {
			const saved = await desktopRpc.renameFlow(
				workspacePath,
				flowId,
				newId,
				name.trim(),
			);
			await refreshWorkspaceLists(workspacePath);
			const newTabId = flowTabId(saved.id);
			setOpenTabs((tabs) =>
				tabs.map((t) =>
					t.kind === "flow" && t.flowId === flowId
						? {
								...t,
								flowId: saved.id,
								flow: saved,
								dirty: false,
								id: newTabId,
							}
						: t,
				),
			);
			if (activeTabId === flowTabId(flowId)) setActiveTabId(newTabId);
			appendConsole(`Renamed flow to ${saved.id}`);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Rename failed");
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleDeleteFlow = async (flowId: string) => {
		if (!workspacePath) return;
		const meta = flows.find((f) => f.id === flowId);
		const tabId = flowTabId(flowId);
		const tab = openTabs.find((t) => t.id === tabId);
		if (tab?.dirty) {
			const saveFirst = window.confirm(
				`${meta?.name ?? flowId} has unsaved changes. Save before deleting?`,
			);
			if (saveFirst) await handleSaveActive(tabId);
		}
		const ok = window.confirm(`Delete ${meta?.name ?? flowId}?`);
		if (!ok) return;
		try {
			await desktopRpc.deleteFlow(workspacePath, flowId);
			await refreshWorkspaceLists(workspacePath);
			setOpenTabs((tabs) => tabs.filter((t) => t.id !== tabId));
			if (activeTabId === tabId) {
				const remaining = openTabs.filter((t) => t.id !== tabId);
				setActiveTabId(remaining[0]?.id ?? null);
			}
			appendConsole(`Deleted flow ${flowId}`);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Delete failed");
			setPanelTab("logs");
			setPanelOpen(true);
		}
	};

	const handleRun = async () => {
		if (!activeFlowTab || !workspacePath) return;

		let input: unknown;
		try {
			input = JSON.parse(inputJson);
			setInputError(null);
		} catch {
			setInputError("Invalid JSON input");
			setPlaygroundOpen(true);
			return;
		}

		setIsRunning(true);
		setRunError(null);
		setRunResult(null);
		setPanelOpen(true);
		setPanelTab("logs");
		setRightPanelOpen(true);
		setRightPanelTab("response");
		appendConsole(`Run started: ${activeFlowTab.flowId}`);

		try {
			const result = await desktopRpc.executeFlowRpc({
				flowId: activeFlowTab.flowId,
				workspace: workspacePath,
				env: selectedEnv,
				input,
			});
			setRunResult(result);
			appendConsole("Run finished");
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Flow execution failed");
			appendConsole(
				err instanceof Error ? err.message : "Flow execution failed",
			);
		} finally {
			setIsRunning(false);
		}
	};

	const anyDirty = openTabs.some((t) => t.dirty);
	const statusLabel = activeTab != null ? editorTabLabel(activeTab) : "No file";

	return (
		<TooltipProvider>
			<div className="flex h-screen w-screen flex-col overflow-hidden">
				<TopBar
					openTabs={openTabs}
					activeTabId={activeTabId}
					onSelectTab={setActiveTabId}
					onCloseTab={handleCloseTab}
				/>
				{loadError ? (
					<Alert variant="destructive" className="rounded-none border-x-0">
						<AlertDescription>{loadError}</AlertDescription>
					</Alert>
				) : null}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<ActivityBar
							activeView={activityView}
							sidebarOpen={sidebarOpen}
							onViewChange={handleActivityView}
						/>
						{sidebarOpen ? (
							<>
								<PrimarySidebar
									width={sidebarWidth}
									view={activityView}
									workspaceName={workspaceName}
									flows={flows}
									activeTabId={activeTabId}
									dirtyTabIds={dirtyTabIds}
									envs={envs}
									secretFiles={secretFiles}
									search={sidebarSearch}
									canSave={Boolean(activeTab?.dirty)}
									onSearchChange={setSidebarSearch}
									onOpenWorkspace={() => void handleOpenWorkspace()}
									onSelectFlow={(id) => void loadFlow(id, workspacePath)}
									onSelectEnv={(name) =>
										void loadEnvironment(name, workspacePath)
									}
									onSelectSecretsFile={(name) =>
										void loadSecretsFile(name, workspacePath)
									}
									onCreateFlow={() => void handleCreateFlow()}
									onCreateEnv={() => void handleCreateEnv()}
									onCreateSecretsFile={() => void handleCreateSecretsFile()}
									onRenameFlow={(id) => void handleRenameFlow(id)}
									onDeleteFlow={(id) => void handleDeleteFlow(id)}
									onSaveActive={() => void handleSaveActive()}
									onAddNode={handleAddNode}
								/>
								<ResizeGutter
									orientation="vertical"
									onResize={(delta) =>
										setSidebarWidth((w) => clamp(w + delta, 180, 480))
									}
								/>
							</>
						) : null}
						<EditorArea
							activeTab={activeTab}
							envRows={envRows}
							secretRows={secretRows}
							envs={envs}
							selectedEnv={selectedEnv}
							onEnvChange={setSelectedEnv}
							isRunning={isRunning}
							canRun={Boolean(activeFlowTab && workspacePath && !isLoading)}
							onRun={() => void handleRun()}
							onEnvRowsChange={handleEnvRowsChange}
							onSecretRowsChange={handleSecretRowsChange}
							onGraphChange={handleGraphChange}
							onSelectNode={handleSelectNode}
							onZoomChange={setZoom}
						/>
						{rightPanelOpen && activeFlowTab ? (
							<ResizeGutter
								orientation="vertical"
								onResize={(delta) =>
									setRightPanelWidth((w) => clamp(w - delta, 260, 560))
								}
							/>
						) : null}
						<AuxiliarySidebar
							width={rightPanelWidth}
							open={rightPanelOpen && Boolean(activeFlowTab)}
							activeTab={rightPanelTab}
							onTabChange={setRightPanelTab}
							flow={activeFlowTab?.flow ?? null}
							selectedNodeId={selectedNodeId}
							onUpdateNode={handleUpdateNode}
							runResult={runResult}
							runError={runError}
						/>
					</div>
					<Panel
						open={panelOpen}
						height={panelHeight}
						activeTab={panelTab}
						consoleLines={consoleLines}
						logs={runResult?.logs ?? []}
						runError={runError}
						onTabChange={setPanelTab}
						onToggle={() => setPanelOpen((v) => !v)}
						onResize={setPanelHeight}
						onClearConsole={clearConsole}
					/>
					<StatusBar
						workspaceName={workspaceName}
						flowName={statusLabel}
						env={selectedEnv}
						nodeCount={activeFlowTab?.flow.nodes.length ?? 0}
						edgeCount={activeFlowTab?.flow.edges.length ?? 0}
						openTabCount={openTabs.length}
						isRunning={isRunning}
						zoom={zoom}
						dirty={anyDirty}
					/>
				</div>
				<PlaygroundSheet
					open={playgroundOpen}
					inputJson={inputJson}
					inputError={inputError}
					onOpenChange={setPlaygroundOpen}
					onInputChange={setInputJson}
					onRun={() => void handleRun()}
					isRunning={isRunning}
				/>
			</div>
		</TooltipProvider>
	);
}

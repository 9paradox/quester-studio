import type { ExecuteFlowResult } from "@quester/engine";
import type { FlowV1 } from "@quester/schema";
import { useCallback, useEffect, useState } from "react";
import type { FlowMeta } from "../../shared/rpc.js";
import { desktopRpc } from "../lib/electrobun.js";
import { FlowCanvas } from "./FlowCanvas.js";
import { FlowSidebar } from "./FlowSidebar.js";
import { DEFAULT_INPUT, RunPanel } from "./RunPanel.js";
import { WorkspaceBar } from "./WorkspaceBar.js";

export function AppShell() {
	const [workspacePath, setWorkspacePath] = useState("");
	const [workspaceName, setWorkspaceName] = useState("");
	const [flows, setFlows] = useState<FlowMeta[]>([]);
	const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
	const [currentFlow, setCurrentFlow] = useState<FlowV1 | null>(null);
	const [envs, setEnvs] = useState<string[]>([]);
	const [selectedEnv, setSelectedEnv] = useState("local");
	const [inputJson, setInputJson] = useState(DEFAULT_INPUT);
	const [inputError, setInputError] = useState<string | null>(null);
	const [runResult, setRunResult] = useState<ExecuteFlowResult | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	const loadFlow = useCallback(async (flowId: string, workspace: string) => {
		const flow = await desktopRpc.loadFlow(flowId, workspace);
		setCurrentFlow(flow);
		setSelectedFlowId(flowId);
	}, []);

	const loadWorkspace = useCallback(
		async (path: string) => {
			setIsLoading(true);
			setLoadError(null);
			setRunResult(null);
			setRunError(null);
			try {
				const summary = await desktopRpc.openWorkspaceSummary(path);
				const [flowList, envList] = await Promise.all([
					desktopRpc.listFlows(path),
					desktopRpc.listEnvs(path),
				]);
				setWorkspacePath(path);
				setWorkspaceName(summary.name);
				setFlows(flowList);
				setEnvs(envList);
				setSelectedEnv(envList[0] ?? "local");

				const firstFlow = flowList[0];
				if (firstFlow) {
					await loadFlow(firstFlow.id, path);
				} else {
					setSelectedFlowId(null);
					setCurrentFlow(null);
				}
			} catch (err) {
				setLoadError(
					err instanceof Error ? err.message : "Failed to load workspace",
				);
			} finally {
				setIsLoading(false);
			}
		},
		[loadFlow],
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

	const handleSelectFlow = async (flowId: string) => {
		if (!workspacePath) return;
		try {
			await loadFlow(flowId, workspacePath);
			setRunResult(null);
			setRunError(null);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Failed to load flow");
		}
	};

	const handleRun = async () => {
		if (!selectedFlowId || !workspacePath) return;

		let input: unknown;
		try {
			input = JSON.parse(inputJson);
			setInputError(null);
		} catch {
			setInputError("Invalid JSON input");
			return;
		}

		setIsRunning(true);
		setRunError(null);
		setRunResult(null);
		try {
			const result = await desktopRpc.executeFlowRpc({
				flowId: selectedFlowId,
				workspace: workspacePath,
				env: selectedEnv,
				input,
			});
			setRunResult(result);
		} catch (err) {
			setRunError(err instanceof Error ? err.message : "Flow execution failed");
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<div className="flex h-screen w-screen flex-col">
			<WorkspaceBar
				workspaceName={workspaceName || "—"}
				workspacePath={workspacePath || "—"}
				onOpenWorkspace={() => void handleOpenWorkspace()}
				isLoading={isLoading}
			/>
			{loadError ? (
				<div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
					{loadError}
				</div>
			) : null}
			<div className="flex min-h-0 flex-1">
				<FlowSidebar
					flows={flows}
					selectedFlowId={selectedFlowId}
					onSelectFlow={(id) => void handleSelectFlow(id)}
				/>
				<main className="min-w-0 flex-1">
					<FlowCanvas flow={currentFlow} />
				</main>
				<RunPanel
					envs={envs}
					selectedEnv={selectedEnv}
					onEnvChange={setSelectedEnv}
					inputJson={inputJson}
					onInputChange={setInputJson}
					onRun={() => void handleRun()}
					isRunning={isRunning}
					runResult={runResult}
					runError={runError}
					inputError={inputError}
					selectedFlowId={selectedFlowId}
				/>
			</div>
		</div>
	);
}

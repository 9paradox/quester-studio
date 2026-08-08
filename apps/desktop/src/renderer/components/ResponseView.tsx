import { JsonViewer } from "@/components/JsonViewer.js";
import { NodeResponsePanels } from "@/components/response/NodeResponsePanels.js";
import { resolveSelectedStep } from "@/components/response/resolveStep.js";
import { ErrorAlert } from "@/components/response/shared.js";
import type { StepView } from "@/components/response/types.js";
import { isHttpOutput } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import { getQuesterClient } from "@/lib/quester-client.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	type BuiltinNodeType,
	type FlowNodeV1,
	builtinNodeTypes,
} from "@quester-studio/schema";
import { IconExternalLink, IconFolderOpen } from "@tabler/icons-react";
import { useState } from "react";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

type ResponseViewProps = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	selectedNodeId: string | null;
	selectedNode: FlowNodeV1 | null;
	onSelectNode?: (nodeId: string) => void;
};

function runSteps(runResult: ExecuteFlowRpcResult): StepView[] {
	if (runResult.steps?.length > 0) return runResult.steps;
	return Object.keys(runResult.nodeOutputs ?? {}).map((nodeId) => ({
		nodeId,
		type: "node",
		input: runResult.nodeInputs?.[nodeId],
		output: runResult.nodeOutputs[nodeId],
		error: runResult.failedNodeId === nodeId ? runResult.error : undefined,
	}));
}

function shortError(message: string, max = 120): string {
	const oneLine = message.replace(/\s+/g, " ").trim();
	return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function RunSummary({
	runResult,
	runError,
	onSelectNode,
}: {
	runResult: ExecuteFlowRpcResult;
	runError: string | null;
	onSelectNode?: (nodeId: string) => void;
}) {
	const passed = !runResult.error;
	const steps = runSteps(runResult);
	const assertSteps = steps.filter((s) => s.type === "assert");
	const assertPassed = assertSteps.filter((s) => !s.error).length;
	const assertFailed = assertSteps.filter((s) => s.error).length;
	const failureMessage = runError ?? runResult.error ?? null;
	const [openError, setOpenError] = useState<string | null>(null);
	const [opening, setOpening] = useState(false);

	const openRunFolder = async () => {
		if (!runResult.runDir) return;
		setOpening(true);
		setOpenError(null);
		try {
			const result = await getQuesterClient().openPathInOs(runResult.runDir);
			if (!result.ok) {
				setOpenError(result.error ?? "Could not open folder");
			}
		} catch (error) {
			setOpenError(error instanceof Error ? error.message : String(error));
		} finally {
			setOpening(false);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				{passed ? (
					<Badge variant="outline">Passed</Badge>
				) : (
					<Badge variant="destructive">Failed</Badge>
				)}
				{assertSteps.length > 0 ? (
					<Badge variant="secondary">
						Asserts {assertPassed}/{assertSteps.length}
					</Badge>
				) : null}
			</div>

			{runResult.runDir ? (
				<div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
					<p className="text-xs text-muted-foreground">On-disk run folder</p>
					<p className="break-all font-mono text-[11px] text-foreground">
						{runResult.runDir}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 gap-1.5 text-xs"
							disabled={opening}
							onClick={() => void openRunFolder()}
						>
							<IconFolderOpen className="size-3.5" />
							Open folder
						</Button>
					</div>
					{openError ? (
						<p className="text-xs text-destructive">{openError}</p>
					) : null}
				</div>
			) : null}

			{!passed && runResult.failedNodeId ? (
				<div className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs">
					<span className="font-mono font-medium">
						{runResult.failedNodeId}
					</span>
					{failureMessage ? (
						<p className="mt-1 text-muted-foreground">
							{shortError(failureMessage)}
						</p>
					) : null}
				</div>
			) : null}

			{assertSteps.length > 0 ? (
				<p className="text-xs text-muted-foreground">
					Assert steps:{" "}
					<span className="text-foreground">{assertPassed} passed</span>
					{assertFailed > 0 ? (
						<>
							, <span className="text-destructive">{assertFailed} failed</span>
						</>
					) : null}
				</p>
			) : null}

			{steps.length > 0 ? (
				<section className="flex flex-col gap-1.5">
					<h3 className="text-xs font-medium text-muted-foreground">Steps</h3>
					<ul className="flex flex-col gap-0.5">
						{steps.map((step) => {
							const failed =
								Boolean(step.error) || runResult.failedNodeId === step.nodeId;
							const label = `${step.nodeId} · ${step.type} · ${failed ? "fail" : "ok"}`;
							return (
								<li key={step.nodeId}>
									{onSelectNode ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-auto w-full justify-start px-2 py-1 font-mono text-xs font-normal"
											onClick={() => onSelectNode(step.nodeId)}
										>
											<span
												className={
													failed ? "text-destructive" : "text-foreground"
												}
											>
												{label}
											</span>
										</Button>
									) : (
										<span className="block px-2 py-1 font-mono text-xs text-muted-foreground">
											{label}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				</section>
			) : null}
		</div>
	);
}

function isBuiltinType(type: string): type is BuiltinNodeType {
	return (builtinNodeTypes as readonly string[]).includes(type);
}

export function ResponseView({
	runResult,
	runError,
	selectedNodeId,
	selectedNode,
	onSelectNode,
}: ResponseViewProps) {
	const openResponseViewerTab = useQuesterStore((s) => s.openResponseViewerTab);

	if (!runResult && !runError) {
		return (
			<p className="text-sm text-muted-foreground">
				Run a flow, then select a node to inspect its request and response.
			</p>
		);
	}

	if (!runResult) {
		return (
			<ErrorAlert title="Run failed" message={runError ?? "Unknown error"} />
		);
	}

	const { selected } = resolveSelectedStep(
		runResult,
		selectedNodeId,
		selectedNode,
	);
	const errorText = runError ?? runResult.error ?? null;
	const nodeType = selectedNode?.type ?? selected?.type;
	const presentation =
		nodeType && isBuiltinType(nodeType) ? getNodePresentation(nodeType) : null;
	const Icon = presentation?.icon;

	if (!selectedNodeId) {
		const openFlowOutput = () => {
			if (runResult.output === undefined && !errorText) return;
			openResponseViewerTab(
				{
					source: "flow",
					title: "Flow output",
					subtitle: "final",
					error: errorText,
					output: runResult.output ?? null,
				},
				`flow-output:${runResult.runDir ?? "latest"}`,
			);
		};
		return (
			<div className="flex flex-col gap-3">
				<RunSummary
					runResult={runResult}
					runError={runError}
					onSelectNode={onSelectNode}
				/>
				{runResult.output !== undefined ? (
					<section className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="text-xs font-medium text-muted-foreground">
								Flow output
							</h3>
							<Badge variant="outline">final</Badge>
							<span className="flex-1" />
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 gap-1.5 px-2 text-xs"
								onClick={openFlowOutput}
							>
								<IconExternalLink className="size-3.5" />
								Open in tab
							</Button>
						</div>
						<JsonViewer
							value={runResult.output}
							defaultExpandedDepth={2}
							enablePathCopy
						/>
					</section>
				) : null}
			</div>
		);
	}

	if (!selected) {
		return (
			<div className="flex flex-col gap-3">
				{errorText ? (
					<ErrorAlert title="Run error" message={errorText} />
				) : null}
				<p className="text-sm text-muted-foreground">
					No run data for{" "}
					<span className="font-mono text-foreground">{selectedNodeId}</span>{" "}
					yet. Run the flow to capture this node&apos;s details.
				</p>
			</div>
		);
	}

	const failed =
		Boolean(selected.error) || runResult.failedNodeId === selected.nodeId;

	const openNodeResponse = () => {
		openResponseViewerTab(
			{
				source: "flow",
				title: `${selected.nodeId} response`,
				subtitle: presentation?.label ?? nodeType ?? "node",
				error: selected.error ?? (failed ? errorText : null),
				output: selected.output,
				pathCopyNodeId: selected.nodeId,
			},
			`flow:${selected.nodeId}`,
		);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				{Icon ? (
					<span className="flex size-6 items-center justify-center rounded-md bg-muted">
						<Icon className="size-3.5" />
					</span>
				) : null}
				<span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
					{selected.nodeId}
				</span>
				<Badge variant="secondary">
					{presentation?.label ?? nodeType ?? "node"}
				</Badge>
				{failed ? (
					<Badge variant="destructive">failed</Badge>
				) : (
					<Badge variant="outline">ok</Badge>
				)}
				{nodeType === "http" && isHttpOutput(selected.output) ? (
					selected.output.status !== undefined ? (
						<Badge variant="outline">{selected.output.status}</Badge>
					) : null
				) : null}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2 text-xs"
					onClick={openNodeResponse}
				>
					<IconExternalLink className="size-3.5" />
					Open in tab
				</Button>
			</div>

			<NodeResponsePanels step={selected} node={selectedNode} />
		</div>
	);
}

export function ResponseViewScroll(props: ResponseViewProps) {
	return (
		<ScrollArea className="h-full">
			<div className="p-3">
				<ResponseView {...props} />
			</div>
		</ScrollArea>
	);
}

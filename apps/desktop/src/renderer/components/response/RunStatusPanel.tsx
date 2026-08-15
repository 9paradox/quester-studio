import { resolveAssertChecks } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import {
	type NodeTiming,
	nodeTimingDurationMs,
	totalRunDurationMs,
} from "@/lib/nodeRunStatus.js";
import { getQuesterClient } from "@/lib/quester-client.js";
import { cn } from "@/lib/utils.js";
import type { FlowNodeV1 } from "@quester-studio/schema";
import {
	IconCircleCheck,
	IconCircleDashed,
	IconCircleX,
	IconFolderOpen,
	IconLoader2,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type {
	ExecuteFlowRpcResult,
	NodeRunStatus,
} from "../../../shared/rpc.js";

export type RunStatusPanelProps = {
	flowNodes: FlowNodeV1[];
	isRunning: boolean;
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	nodeStatuses: Record<string, NodeRunStatus>;
	nodeTimings: Record<string, NodeTiming>;
	selectedNodeId: string | null;
	onFocusNode: (nodeId: string) => void;
};

function formatDuration(ms: number | null): string {
	if (ms === null) return "—";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function shortError(message: string, max = 120): string {
	const oneLine = message.replace(/\s+/g, " ").trim();
	return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function statusLabel(status: NodeRunStatus): string {
	switch (status) {
		case "running":
			return "running";
		case "success":
			return "ok";
		case "error":
			return "fail";
		case "skipped":
			return "skipped";
		default:
			return "idle";
	}
}

function TimelineMarker({ status }: { status: NodeRunStatus }) {
	if (status === "running") {
		return (
			<IconLoader2
				className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none text-primary"
				aria-hidden
			/>
		);
	}
	if (status === "success") {
		return (
			<IconCircleCheck className="size-3.5 shrink-0 text-chart-2" aria-hidden />
		);
	}
	if (status === "error") {
		return (
			<IconCircleX className="size-3.5 shrink-0 text-destructive" aria-hidden />
		);
	}
	if (status === "skipped") {
		return (
			<IconCircleDashed
				className="size-3.5 shrink-0 text-muted-foreground"
				aria-hidden
			/>
		);
	}
	return (
		<span
			className="size-2.5 shrink-0 rounded-full border border-muted-foreground/50 bg-background"
			aria-hidden
		/>
	);
}

type TimelineRow = {
	nodeId: string;
	type: string;
	label?: string;
	status: NodeRunStatus;
	durationMs: number | null;
	error?: string;
	output?: unknown;
};

function buildTimelineRows({
	flowNodes,
	isRunning,
	runResult,
	nodeStatuses,
	nodeTimings,
}: {
	flowNodes: FlowNodeV1[];
	isRunning: boolean;
	runResult: ExecuteFlowRpcResult | null;
	nodeStatuses: Record<string, NodeRunStatus>;
	nodeTimings: Record<string, NodeTiming>;
}): TimelineRow[] {
	const stepById = new Map(
		(runResult?.steps ?? []).map((s) => [s.nodeId, s] as const),
	);
	const orderedIds: string[] = [];
	const seen = new Set<string>();
	for (const step of runResult?.steps ?? []) {
		orderedIds.push(step.nodeId);
		seen.add(step.nodeId);
	}
	for (const node of flowNodes) {
		if (!seen.has(node.id)) {
			orderedIds.push(node.id);
			seen.add(node.id);
		}
	}

	return orderedIds.map((nodeId) => {
		const flowNode = flowNodes.find((n) => n.id === nodeId);
		const step = stepById.get(nodeId);
		const status =
			nodeStatuses[nodeId] ??
			(step
				? step.error
					? "error"
					: "success"
				: isRunning
					? "idle"
					: "skipped");
		const label =
			typeof flowNode?.data?.label === "string"
				? flowNode.data.label
				: undefined;
		return {
			nodeId,
			type: flowNode?.type ?? step?.type ?? "node",
			label,
			status,
			durationMs: nodeTimingDurationMs(nodeTimings[nodeId]),
			error: step?.error,
			output: step?.output,
		};
	});
}

export function RunStatusPanel({
	flowNodes,
	isRunning,
	runResult,
	runError,
	nodeStatuses,
	nodeTimings,
	selectedNodeId,
	onFocusNode,
}: RunStatusPanelProps) {
	const rows = useMemo(
		() =>
			buildTimelineRows({
				flowNodes,
				isRunning,
				runResult,
				nodeStatuses,
				nodeTimings,
			}),
		[flowNodes, isRunning, runResult, nodeStatuses, nodeTimings],
	);

	const assertRows = rows.filter((r) => r.type === "assert");
	const assertPassed = assertRows.filter((r) => r.status === "success").length;
	const assertFailed = assertRows.filter((r) => r.status === "error").length;
	const failedNodes = rows.filter((r) => r.status === "error").length;
	const totalMs = totalRunDurationMs(nodeTimings);
	const failureMessage = runError ?? runResult?.error ?? null;
	const cancelled = Boolean(runResult?.cancelled);

	let overall: "running" | "success" | "failed" | "cancelled" = "running";
	if (!isRunning) {
		if (cancelled) overall = "cancelled";
		else if (runResult?.error || runError) overall = "failed";
		else if (runResult) overall = "success";
		else overall = "failed";
	}

	const [openError, setOpenError] = useState<string | null>(null);
	const [opening, setOpening] = useState(false);

	const openRunFolder = async () => {
		if (!runResult?.runDir) return;
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
			<section className="flex flex-col gap-2">
				<output
					className="flex flex-wrap items-center gap-2"
					aria-live="polite"
				>
					{overall === "running" ? (
						<Badge variant="secondary">Running…</Badge>
					) : null}
					{overall === "success" ? (
						<Badge variant="outline">Success</Badge>
					) : null}
					{overall === "failed" ? (
						<Badge variant="destructive">Failed</Badge>
					) : null}
					{overall === "cancelled" ? (
						<Badge variant="secondary">Cancelled</Badge>
					) : null}
					{assertRows.length > 0 ? (
						<Badge variant="secondary">
							Asserts {assertPassed}/{assertRows.length}
						</Badge>
					) : null}
					{failedNodes > 0 ? (
						<Badge variant="outline">Failed nodes {failedNodes}</Badge>
					) : null}
					<Badge variant="outline">{formatDuration(totalMs)}</Badge>
				</output>

				{runResult?.runDir ? (
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

				{overall === "failed" && runResult?.failedNodeId ? (
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
			</section>

			<section className="flex flex-col gap-1.5">
				<h3 className="text-xs font-medium text-muted-foreground">Timeline</h3>
				{rows.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						No nodes in this flow.
					</p>
				) : (
					<ol className="flex flex-col">
						{rows.map((row, index) => {
							const checks =
								row.type === "assert"
									? resolveAssertChecks(row.output, row.error)
									: [];
							const isLast = index === rows.length - 1;
							return (
								<li key={row.nodeId} className="flex gap-2">
									<div className="flex w-3.5 shrink-0 flex-col items-center">
										<div className="flex h-6 items-center">
											<TimelineMarker status={row.status} />
										</div>
										{!isLast ? (
											<div className="w-px flex-1 bg-border" aria-hidden />
										) : null}
									</div>
									<div className={cn("min-w-0 flex-1", !isLast && "pb-2")}>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className={cn(
												"h-auto w-full justify-start gap-2 px-2 py-1 font-mono text-xs font-normal",
												selectedNodeId === row.nodeId && "bg-muted",
												row.status === "error" && "text-destructive",
											)}
											onClick={() => onFocusNode(row.nodeId)}
										>
											<span className="min-w-0 flex-1 truncate text-left">
												{row.nodeId}
												<span className="text-muted-foreground">
													{" "}
													· {row.label ?? row.type} · {statusLabel(row.status)}
												</span>
											</span>
											<span className="shrink-0 text-muted-foreground">
												{formatDuration(row.durationMs)}
											</span>
										</Button>
										{checks.length > 0 ? (
											<ul className="mt-0.5 flex flex-col gap-0.5 pl-2">
												{checks.map((check) => (
													<li
														key={`${row.nodeId}:${check.path}:${check.message ?? ""}`}
														className={cn(
															"font-mono text-[11px]",
															check.ok
																? "text-muted-foreground"
																: "text-destructive",
														)}
													>
														{check.ok ? "✓" : "✗"} {check.path}
														{check.message && !check.ok
															? `: ${check.message.replace(`${check.path}: `, "")}`
															: null}
													</li>
												))}
											</ul>
										) : null}
									</div>
								</li>
							);
						})}
					</ol>
				)}
			</section>
		</div>
	);
}

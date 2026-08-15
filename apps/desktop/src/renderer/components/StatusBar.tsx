import { Button } from "@/components/ui/button.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectActiveFlowTab,
	selectAnyDirty,
	selectRunningFlowCount,
	selectSendingRequestCount,
	selectStatusLabel,
} from "@/stores/selectors.js";
import { IconLoader2, IconPlayerStop } from "@tabler/icons-react";

function formatActivityLabel(
	runningFlows: number,
	sendingRequests: number,
): string | null {
	const parts: string[] = [];
	if (runningFlows > 0) {
		parts.push(runningFlows === 1 ? "1 flow" : `${runningFlows} flows`);
	}
	if (sendingRequests > 0) {
		parts.push(
			sendingRequests === 1 ? "1 request" : `${sendingRequests} requests`,
		);
	}
	if (parts.length === 0) return null;
	if (runningFlows > 0 && sendingRequests === 0) {
		return runningFlows === 1 ? "Running…" : `Running ${runningFlows} flows…`;
	}
	if (sendingRequests > 0 && runningFlows === 0) {
		return sendingRequests === 1
			? "Sending…"
			: `Sending ${sendingRequests} requests…`;
	}
	return `Running ${parts.join(" · ")}…`;
}

export function StatusBar() {
	const workspaceName = useQuesterStore((s) => s.workspaceName);
	const flowName = useQuesterStore(selectStatusLabel);
	const env = useQuesterStore((s) => s.selectedEnv);
	const activeFlowTab = useQuesterStore(selectActiveFlowTab);
	const openTabCount = useQuesterStore((s) => s.openTabs.length);
	const activeFlowRunning = useQuesterStore(
		(s) => selectActiveFlowRun(s).isRunning,
	);
	const runningFlows = useQuesterStore(selectRunningFlowCount);
	const sendingRequests = useQuesterStore(selectSendingRequestCount);
	const stopFlow = useQuesterStore((s) => s.stopFlow);
	const pathIndexStatus = useQuesterStore((s) => s.pathIndexStatus);
	const zoom = useQuesterStore((s) => s.zoom);
	const dirty = useQuesterStore(selectAnyDirty);

	const nodeCount = activeFlowTab?.flow.nodes.length ?? 0;
	const edgeCount = activeFlowTab?.flow.edges.length ?? 0;
	const activityLabel = formatActivityLabel(runningFlows, sendingRequests);

	return (
		<footer className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-2 text-2xs text-muted-foreground">
			<output
				className="flex min-w-0 items-center gap-2 truncate"
				aria-live="polite"
			>
				<span className="truncate" title={workspaceName}>
					{workspaceName || "—"}
				</span>
				<span className="text-border">|</span>
				<span className="truncate" title={flowName}>
					{flowName}
				</span>
				<span className="text-border">|</span>
				<span>{env}</span>
				{activityLabel ? (
					<>
						<span className="text-border">|</span>
						<span className="text-primary">{activityLabel}</span>
						{activeFlowRunning ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-5 px-1.5 text-2xs text-destructive hover:text-destructive"
								onClick={stopFlow}
							>
								<IconPlayerStop className="size-3" data-icon="inline-start" />
								Stop
							</Button>
						) : null}
					</>
				) : null}
				{pathIndexStatus === "updating" ? (
					<>
						<span className="text-border">|</span>
						<span className="inline-flex items-center gap-1 text-primary">
							<IconLoader2
								className="size-3 animate-spin motion-reduce:animate-none"
								aria-hidden
							/>
							Indexing paths…
						</span>
					</>
				) : null}
			</output>
			<div className="flex shrink-0 items-center gap-2">
				<span>
					{nodeCount} nodes · {edgeCount} edges
				</span>
				<span className="text-border">|</span>
				<span>
					{openTabCount} tab{openTabCount === 1 ? "" : "s"}
				</span>
				<span className="text-border">|</span>
				<span>{Math.round(zoom * 100)}%</span>
				{dirty ? (
					<>
						<span className="text-border">|</span>
						<span className="text-amber-600 dark:text-amber-400">unsaved</span>
					</>
				) : null}
			</div>
		</footer>
	);
}

import { Button } from "@/components/ui/button.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectActiveFlowTab,
	selectAnyDirty,
	selectStatusLabel,
} from "@/stores/selectors.js";
import { IconLoader2, IconPlayerStop } from "@tabler/icons-react";

export function StatusBar() {
	const workspaceName = useQuesterStore((s) => s.workspaceName);
	const flowName = useQuesterStore(selectStatusLabel);
	const env = useQuesterStore((s) => s.selectedEnv);
	const activeFlowTab = useQuesterStore(selectActiveFlowTab);
	const openTabCount = useQuesterStore((s) => s.openTabs.length);
	const isRunning = useQuesterStore((s) => selectActiveFlowRun(s).isRunning);
	const stopFlow = useQuesterStore((s) => s.stopFlow);
	const pathIndexStatus = useQuesterStore((s) => s.pathIndexStatus);
	const zoom = useQuesterStore((s) => s.zoom);
	const dirty = useQuesterStore(selectAnyDirty);

	const nodeCount = activeFlowTab?.flow.nodes.length ?? 0;
	const edgeCount = activeFlowTab?.flow.edges.length ?? 0;

	return (
		<footer className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-2 text-[11px] text-muted-foreground">
			<div className="flex min-w-0 items-center gap-2 truncate">
				<span className="truncate" title={workspaceName}>
					{workspaceName || "—"}
				</span>
				<span className="text-border">|</span>
				<span className="truncate" title={flowName}>
					{flowName}
				</span>
				<span className="text-border">|</span>
				<span>{env}</span>
				{isRunning ? (
					<>
						<span className="text-border">|</span>
						<span className="text-primary">Running…</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-5 px-1.5 text-[11px] text-destructive hover:text-destructive"
							onClick={stopFlow}
						>
							<IconPlayerStop className="size-3" data-icon="inline-start" />
							Stop
						</Button>
					</>
				) : null}
				{pathIndexStatus === "updating" ? (
					<>
						<span className="text-border">|</span>
						<span className="inline-flex items-center gap-1 text-primary">
							<IconLoader2 className="size-3 animate-spin" aria-hidden />
							Indexing paths…
						</span>
					</>
				) : null}
			</div>
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

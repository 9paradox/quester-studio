import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	IconChevronUp,
	IconCopy,
	IconGripHorizontal,
	IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 480;

export function Panel() {
	const open = useQuesterStore((s) => s.panelOpen);
	const height = useQuesterStore((s) => s.panelHeight);
	const activeTab = useQuesterStore((s) => s.panelTab);
	const consoleLines = useQuesterStore((s) => s.consoleLines);
	const runResult = useQuesterStore((s) => s.runResult);
	const runError = useQuesterStore((s) => s.runError);

	const setPanelTab = useQuesterStore((s) => s.setPanelTab);
	const togglePanel = useQuesterStore((s) => s.togglePanel);
	const setPanelHeight = useQuesterStore((s) => s.setPanelHeight);
	const clearConsole = useQuesterStore((s) => s.clearConsole);

	const logs = runResult?.logs ?? [];
	const dragging = useRef(false);
	const startY = useRef(0);
	const startHeight = useRef(height);
	const [consoleFilter, setConsoleFilter] = useState("");
	const [logsFilter, setLogsFilter] = useState("");
	const [logLevel, setLogLevel] = useState<"all" | "info" | "error">("all");

	const filteredConsoleLines = useMemo(() => {
		const q = consoleFilter.trim().toLowerCase();
		if (!q) return consoleLines;
		return consoleLines.filter((line) => line.toLowerCase().includes(q));
	}, [consoleLines, consoleFilter]);

	const filteredLogs = useMemo(() => {
		let entries = logs;
		if (logLevel !== "all") {
			entries = entries.filter((l) => l.level === logLevel);
		}
		const q = logsFilter.trim().toLowerCase();
		if (!q) return entries;
		return entries.filter((l) => l.message.toLowerCase().includes(q));
	}, [logs, logsFilter, logLevel]);

	const logsText = useMemo(() => {
		if (filteredLogs.length === 0 && !runError) {
			return "No logs yet. Run a flow to see execution steps.";
		}
		const lines = filteredLogs.map(
			(l) => `[${l.level}] ${new Date(l.ts).toLocaleTimeString()} ${l.message}`,
		);
		if (runError && logLevel !== "info") {
			lines.push(`[error] ${runError}`);
		}
		return lines.join("\n");
	}, [filteredLogs, runError, logLevel]);

	const onPointerMove = useCallback(
		(e: PointerEvent) => {
			if (!dragging.current) return;
			const delta = startY.current - e.clientY;
			const next = Math.min(
				MAX_HEIGHT,
				Math.max(MIN_HEIGHT, startHeight.current + delta),
			);
			setPanelHeight(next);
		},
		[setPanelHeight],
	);

	const onPointerUp = useCallback(() => {
		dragging.current = false;
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
	}, [onPointerMove]);

	const onResizeStart = (e: React.PointerEvent) => {
		dragging.current = true;
		startY.current = e.clientY;
		startHeight.current = height;
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	const copyConsole = async () => {
		await navigator.clipboard.writeText(filteredConsoleLines.join("\n"));
	};

	const copyLogs = async () => {
		await navigator.clipboard.writeText(logsText);
	};

	if (!open) {
		return (
			<button
				type="button"
				className="flex h-7 shrink-0 items-center border-t bg-background px-3 text-xs text-muted-foreground hover:bg-muted/50"
				onClick={togglePanel}
			>
				&gt;_ Panel
			</button>
		);
	}

	return (
		<div
			className="flex shrink-0 flex-col border-t bg-background"
			style={{ height }}
		>
			<button
				type="button"
				tabIndex={0}
				aria-label="Resize panel"
				className="flex h-2 w-full shrink-0 cursor-row-resize items-center justify-center border-b bg-muted/40 hover:bg-muted/70"
				onPointerDown={onResizeStart}
			>
				<IconGripHorizontal className="size-3 text-muted-foreground" />
			</button>
			<Tabs
				value={activeTab}
				onValueChange={(v) => setPanelTab(v as "console" | "logs")}
				className="flex min-h-0 flex-1 flex-col"
			>
				<div className="flex shrink-0 items-center gap-2 border-b px-2">
					<TabsList variant="line" className="h-8 shrink-0 bg-transparent">
						<TabsTrigger value="console" className="text-xs">
							Console
						</TabsTrigger>
						<TabsTrigger value="logs" className="text-xs">
							Logs
						</TabsTrigger>
					</TabsList>
					<div className="flex min-w-0 flex-1 items-center gap-1">
						{activeTab === "console" ? (
							<>
								<Input
									value={consoleFilter}
									onChange={(e) => setConsoleFilter(e.target.value)}
									placeholder="Filter…"
									className="h-6 max-w-[160px] text-xs"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => void copyConsole()}
									aria-label="Copy console"
								>
									<IconCopy />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={clearConsole}
									aria-label="Clear console"
								>
									<IconTrash />
								</Button>
							</>
						) : (
							<>
								<Input
									value={logsFilter}
									onChange={(e) => setLogsFilter(e.target.value)}
									placeholder="Filter…"
									className="h-6 max-w-[120px] text-xs"
								/>
								<select
									value={logLevel}
									onChange={(e) =>
										setLogLevel(e.target.value as "all" | "info" | "error")
									}
									className="h-6 rounded-md border bg-background px-1.5 text-xs"
								>
									<option value="all">All</option>
									<option value="info">Info</option>
									<option value="error">Error</option>
								</select>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => void copyLogs()}
									aria-label="Copy logs"
								>
									<IconCopy />
								</Button>
							</>
						)}
					</div>
					<button
						type="button"
						className={cn("rounded p-1 text-muted-foreground hover:bg-muted")}
						onClick={togglePanel}
						aria-label="Collapse panel"
					>
						<IconChevronUp className="size-4" />
					</button>
				</div>
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<TabsContent
						value="console"
						className="m-0 min-h-0 flex-1 overflow-auto p-3"
					>
						<pre className="font-mono text-xs leading-relaxed text-muted-foreground">
							{filteredConsoleLines.length === 0
								? "No matching console output."
								: filteredConsoleLines.join("\n")}
						</pre>
					</TabsContent>
					<TabsContent
						value="logs"
						className="m-0 min-h-0 flex-1 overflow-auto p-3"
					>
						<pre className="font-mono text-xs leading-relaxed">{logsText}</pre>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}

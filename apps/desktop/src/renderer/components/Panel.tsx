import { JsonViewer, stringifyJson } from "@/components/JsonViewer.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { Input } from "@/components/ui/input.js";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { FlowEditorTab } from "@/lib/editorTabs.js";
import { listRunHistory } from "@/lib/runHistory.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveConsoleLines,
	selectActiveFlowRun,
} from "@/stores/selectors.js";
import {
	IconChevronDown,
	IconChevronUp,
	IconCopy,
	IconGripHorizontal,
	IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ExecutionLogEntry } from "../../shared/rpc.js";

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 480;

function formatLogLine(entry: ExecutionLogEntry): string {
	const time = new Date(entry.ts).toLocaleTimeString();
	const base = `[${entry.level}] ${time} ${entry.message}`;
	if (entry.data === undefined) return base;
	return `${base}\n${stringifyJson(entry.data)}`;
}

function LogEntryRow({ entry }: { entry: ExecutionLogEntry }) {
	const [open, setOpen] = useState(entry.phase === "error");
	const hasData = entry.data !== undefined;

	return (
		<div
			className={cn(
				"rounded-md border border-transparent px-2 py-1.5",
				entry.level === "error" && "border-destructive/20 bg-destructive/5",
				hasData && "hover:bg-muted/30",
			)}
		>
			{hasData ? (
				<Collapsible open={open} onOpenChange={setOpen}>
					<CollapsibleTrigger className="flex w-full items-start gap-2 text-left">
						<IconChevronDown
							className={cn(
								"mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
								open && "rotate-180",
							)}
						/>
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
							<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
								{new Date(entry.ts).toLocaleTimeString()}
							</span>
							<Badge
								variant={entry.level === "error" ? "destructive" : "secondary"}
							>
								{entry.level}
							</Badge>
							{entry.nodeType ? (
								<Badge variant="outline">{entry.nodeType}</Badge>
							) : null}
							<span
								className={cn(
									"min-w-0 flex-1 truncate font-mono text-xs",
									entry.level === "error"
										? "text-destructive"
										: "text-foreground",
								)}
							>
								{entry.message}
							</span>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="mt-2 ml-5">
							<JsonViewer value={entry.data} defaultExpandedDepth={2} />
						</div>
					</CollapsibleContent>
				</Collapsible>
			) : (
				<div className="flex flex-wrap items-center gap-2 pl-5">
					<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
						{new Date(entry.ts).toLocaleTimeString()}
					</span>
					<Badge
						variant={entry.level === "error" ? "destructive" : "secondary"}
					>
						{entry.level}
					</Badge>
					<span
						className={cn(
							"min-w-0 flex-1 truncate font-mono text-xs",
							entry.level === "error" ? "text-destructive" : "text-foreground",
						)}
					>
						{entry.message}
					</span>
				</div>
			)}
		</div>
	);
}

export function Panel() {
	const open = useQuesterStore((s) => s.panelOpen);
	const height = useQuesterStore((s) => s.panelHeight);
	const activeTab = useQuesterStore((s) => s.panelTab);
	const consoleLines = useQuesterStore(selectActiveConsoleLines);
	const mcpActivityLog = useQuesterStore((s) => s.mcpActivityLog);
	const { runResult, runError } = useQuesterStore(selectActiveFlowRun);

	const setPanelTab = useQuesterStore((s) => s.setPanelTab);
	const togglePanel = useQuesterStore((s) => s.togglePanel);
	const setPanelHeight = useQuesterStore((s) => s.setPanelHeight);
	const clearConsole = useQuesterStore((s) => s.clearConsole);
	const clearLogs = useQuesterStore((s) => s.clearLogs);
	const clearMcpActivity = useQuesterStore((s) => s.clearMcpActivity);
	const replayRunFromHistory = useQuesterStore((s) => s.replayRunFromHistory);
	const openTabs = useQuesterStore((s) => s.openTabs);
	const activeTabId = useQuesterStore((s) => s.activeTabId);

	const activeFlowTab = openTabs.find(
		(t): t is FlowEditorTab => t.id === activeTabId && t.kind === "flow",
	);
	const historyEntries = activeFlowTab
		? listRunHistory(activeFlowTab.flowId)
		: [];

	const logs = runResult?.logs ?? [];
	const dragging = useRef(false);
	const startY = useRef(0);
	const startHeight = useRef(height);
	const [consoleFilter, setConsoleFilter] = useState("");
	const [logsFilter, setLogsFilter] = useState("");
	const [mcpFilter, setMcpFilter] = useState("");
	const [logLevel, setLogLevel] = useState<"all" | "info" | "error">("all");

	const filteredConsoleLines = useMemo(() => {
		const q = consoleFilter.trim().toLowerCase();
		if (!q) return consoleLines;
		return consoleLines.filter((line) => line.toLowerCase().includes(q));
	}, [consoleLines, consoleFilter]);

	const filteredMcpActivity = useMemo(() => {
		const q = mcpFilter.trim().toLowerCase();
		if (!q) return mcpActivityLog;
		return mcpActivityLog.filter((e) => {
			const hay =
				`${e.tool} ${e.summary} ${e.flowId ?? ""} ${e.nodeId ?? ""} ${e.error ?? ""}`.toLowerCase();
			return hay.includes(q);
		});
	}, [mcpActivityLog, mcpFilter]);

	const filteredLogs = useMemo(() => {
		let entries = logs;
		if (logLevel !== "all") {
			entries = entries.filter((l) => l.level === logLevel);
		}
		const q = logsFilter.trim().toLowerCase();
		if (!q) return entries;
		return entries.filter((l) => {
			const hay = `${l.message} ${stringifyJson(l.data ?? "")}`.toLowerCase();
			return hay.includes(q);
		});
	}, [logs, logsFilter, logLevel]);

	const logsText = useMemo(() => {
		if (filteredLogs.length === 0 && !runError) {
			return "No logs yet. Run a flow to see execution steps.";
		}
		const lines = filteredLogs.map(formatLogLine);
		if (runError && logLevel !== "info") {
			lines.push(`[error] ${runError}`);
		}
		return lines.join("\n\n");
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

	const copyMcp = async () => {
		const text = filteredMcpActivity
			.map((e) => {
				const time = new Date(e.ts).toLocaleTimeString();
				const dur = e.durationMs != null ? ` ${e.durationMs}ms` : "";
				const err = e.error ? ` — ${e.error}` : "";
				return `[${e.ok ? "ok" : "err"}] ${time} ${e.tool} · ${e.summary}${dur}${err}`;
			})
			.join("\n");
		await navigator.clipboard.writeText(text || "No MCP activity yet.");
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
				onValueChange={(v) =>
					setPanelTab(v as "console" | "logs" | "history" | "mcp")
				}
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
						<TabsTrigger value="history" className="text-xs">
							History
						</TabsTrigger>
						<TabsTrigger value="mcp" className="text-xs">
							MCP
							{mcpActivityLog.length > 0 ? (
								<span className="ml-1 tabular-nums text-muted-foreground">
									{mcpActivityLog.length}
								</span>
							) : null}
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
						) : activeTab === "logs" ? (
							<>
								<Input
									value={logsFilter}
									onChange={(e) => setLogsFilter(e.target.value)}
									placeholder="Filter…"
									className="h-6 max-w-[120px] text-xs"
								/>
								<Select
									value={logLevel}
									onValueChange={(v) =>
										v && setLogLevel(v as "all" | "info" | "error")
									}
								>
									<SelectTrigger size="sm" className="min-w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent align="end">
										<SelectGroup>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="info">Info</SelectItem>
											<SelectItem value="error">Error</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => void copyLogs()}
									aria-label="Copy logs"
								>
									<IconCopy />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={clearLogs}
									aria-label="Clear logs"
								>
									<IconTrash />
								</Button>
							</>
						) : activeTab === "mcp" ? (
							<>
								<Input
									value={mcpFilter}
									onChange={(e) => setMcpFilter(e.target.value)}
									placeholder="Filter…"
									className="h-6 max-w-[160px] text-xs"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => void copyMcp()}
									aria-label="Copy MCP activity"
								>
									<IconCopy />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={clearMcpActivity}
									aria-label="Clear MCP activity"
								>
									<IconTrash />
								</Button>
							</>
						) : null}
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
						className="m-0 min-h-0 flex-1 overflow-auto p-2"
					>
						{!activeFlowTab ? (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								Switch to a flow tab to see execution logs. Collection request
								results stay in the request editor.
							</p>
						) : filteredLogs.length === 0 && !runError ? (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								No logs yet. Run a flow to see execution steps and response
								objects.
							</p>
						) : (
							<div className="flex flex-col gap-1">
								{filteredLogs.map((entry, i) => (
									<LogEntryRow
										key={`${entry.ts}-${entry.message}-${i}`}
										entry={entry}
									/>
								))}
								{runError && logLevel !== "info" ? (
									<div className="rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5">
										<div className="flex flex-wrap items-start gap-2 pl-5">
											<Badge variant="destructive">error</Badge>
											<span className="min-w-0 flex-1 break-words font-mono text-xs whitespace-pre-wrap text-destructive">
												{runError}
											</span>
										</div>
									</div>
								) : null}
							</div>
						)}
					</TabsContent>
					<TabsContent
						value="history"
						className="m-0 min-h-0 flex-1 overflow-auto p-2"
					>
						{!activeFlowTab ? (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								Switch to a flow tab to browse run history.
							</p>
						) : historyEntries.length === 0 ? (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								No completed runs yet for {activeFlowTab.flowId}.
							</p>
						) : (
							<ul className="flex flex-col gap-1">
								{historyEntries.map((entry) => (
									<li key={entry.runId}>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-auto w-full justify-start px-2 py-1.5 font-mono text-xs font-normal"
											onClick={() => replayRunFromHistory(entry.runId)}
										>
											<span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
												<span className="flex w-full items-center gap-2">
													<Badge variant={entry.ok ? "outline" : "destructive"}>
														{entry.ok ? "ok" : "fail"}
													</Badge>
													<span className="truncate text-muted-foreground tabular-nums">
														{new Date(entry.ts).toLocaleString()}
													</span>
												</span>
												<span className="truncate text-foreground">
													{entry.runId.slice(0, 8)}
													{entry.error ? ` · ${entry.error}` : ""}
												</span>
											</span>
										</Button>
									</li>
								))}
							</ul>
						)}
					</TabsContent>
					<TabsContent
						value="mcp"
						className="m-0 min-h-0 flex-1 overflow-auto p-2"
					>
						{filteredMcpActivity.length === 0 ? (
							<p className="px-1 py-2 text-xs text-muted-foreground">
								No MCP tool activity yet. When Cursor (or another host) calls
								quester MCP tools against this workspace, each action appears
								here. Flow saves/patches auto-reload the canvas when the tab is
								clean.
							</p>
						) : (
							<div className="flex flex-col gap-1">
								{filteredMcpActivity.map((entry, i) => (
									<div
										key={`${entry.ts}-${entry.tool}-${i}`}
										className={cn(
											"rounded-md border border-transparent px-2 py-1.5",
											!entry.ok && "border-destructive/20 bg-destructive/5",
										)}
									>
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
												{new Date(entry.ts).toLocaleTimeString()}
											</span>
											<Badge variant={entry.ok ? "secondary" : "destructive"}>
												{entry.ok ? "ok" : "err"}
											</Badge>
											<Badge variant="outline">{entry.tool}</Badge>
											{entry.durationMs != null ? (
												<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
													{entry.durationMs}ms
												</span>
											) : null}
											<span
												className={cn(
													"min-w-0 flex-1 truncate font-mono text-xs",
													entry.ok ? "text-foreground" : "text-destructive",
												)}
											>
												{entry.summary}
											</span>
										</div>
										{entry.error ? (
											<p className="mt-1 pl-0 font-mono text-[11px] text-destructive break-words whitespace-pre-wrap">
												{entry.error}
											</p>
										) : null}
									</div>
								))}
							</div>
						)}
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}

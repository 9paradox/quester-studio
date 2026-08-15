import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu.js";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import {
	type EditorTab,
	editorTabIcon,
	editorTabLabel,
} from "@/lib/editorTabs.js";
import { focusRing } from "@/lib/focusRing.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	IconChevronDown,
	IconFile,
	IconFolderOpen,
	IconForms,
	IconHistory,
	IconJson,
	IconKey,
	IconSettings,
	IconTopologyRing2,
	IconWorld,
	IconX,
} from "@tabler/icons-react";
import { useLayoutEffect, useRef, useState } from "react";

function TabIcon({ tab }: { tab: EditorTab }) {
	const kind = editorTabIcon(tab);
	const className = "size-3 shrink-0 opacity-70";
	if (kind === "flow") return <IconTopologyRing2 className={className} />;
	if (kind === "form") return <IconForms className={className} />;
	if (kind === "env") return <IconFile className={className} />;
	if (kind === "request") return <IconWorld className={className} />;
	if (kind === "response") return <IconJson className={className} />;
	if (kind === "runLog") return <IconHistory className={className} />;
	if (kind === "appSettings" || kind === "workspaceSettings") {
		return <IconSettings className={className} />;
	}
	return <IconKey className={className} />;
}

function saveShortcutLabel(): string {
	if (typeof navigator === "undefined") return "Ctrl+S";
	return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘S" : "Ctrl+S";
}

function WorkspaceChip() {
	const workspaceName = useQuesterStore((s) => s.workspaceName);
	const workspacePath = useQuesterStore((s) => s.workspacePath);
	const openWorkspaceSettings = useQuesterStore((s) => s.openWorkspaceSettings);
	const openWorkspacePicker = useQuesterStore((s) => s.openWorkspacePicker);
	const closeWorkspace = useQuesterStore((s) => s.closeWorkspace);

	const label = workspaceName || "No workspace";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						className={cn(
							focusRing,
							"flex h-9 max-w-[200px] shrink-0 items-center gap-1 border-r border-border/50 px-2.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground",
						)}
						aria-label="Workspace actions"
					/>
				}
			>
				<span className="truncate">{label}</span>
				<IconChevronDown className="size-3 shrink-0 opacity-70" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-44">
				<DropdownMenuItem onClick={() => void openWorkspaceSettings()}>
					<IconSettings />
					Workspace settings
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => void openWorkspacePicker()}>
					<IconFolderOpen />
					Open workspace
				</DropdownMenuItem>
				{workspacePath ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => closeWorkspace()}
						>
							<IconX />
							Close workspace
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function TopBar() {
	const openTabs = useQuesterStore((s) => s.openTabs);
	const activeTabId = useQuesterStore((s) => s.activeTabId);
	const setActiveTabId = useQuesterStore((s) => s.setActiveTabId);
	const closeTab = useQuesterStore((s) => s.closeTab);
	const closeTabsToLeft = useQuesterStore((s) => s.closeTabsToLeft);
	const closeTabsToRight = useQuesterStore((s) => s.closeTabsToRight);
	const reorderTabs = useQuesterStore((s) => s.reorderTabs);
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	const scrollTabIntoView = (tabId: string) => {
		const container = scrollRef.current;
		if (!container) return;
		const el = container.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`);
		if (!el) return;
		const target =
			el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
		container.scrollTo({
			left: Math.max(0, target),
			behavior: "smooth",
		});
	};

	const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		const el = scrollRef.current;
		if (!el) return;
		if (el.scrollWidth <= el.clientWidth) return;
		e.preventDefault();
		el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
	};

	useLayoutEffect(() => {
		if (!activeTabId) return;
		const container = scrollRef.current;
		if (!container) return;
		const el = container.querySelector<HTMLElement>(
			`[data-tab-id="${activeTabId}"]`,
		);
		if (!el) return;
		const target =
			el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
		container.scrollTo({
			left: Math.max(0, target),
			behavior: "smooth",
		});
	}, [activeTabId]);

	const handleDragStart = (index: number) => {
		setDragIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDropIndex(index);
	};

	const handleDrop = (e: React.DragEvent, toIndex: number) => {
		e.preventDefault();
		const raw = e.dataTransfer.getData("text/plain");
		const fromIndex = Number(raw);
		if (!Number.isNaN(fromIndex)) {
			reorderTabs(fromIndex, toIndex);
		}
		setDragIndex(null);
		setDropIndex(null);
	};

	const handleDragEnd = () => {
		setDragIndex(null);
		setDropIndex(null);
	};

	return (
		<header className="flex h-9 shrink-0 overflow-hidden border-b bg-muted/20">
			<WorkspaceChip />
			<div className="flex h-9 w-px shrink-0 bg-border/50" aria-hidden />
			<div
				ref={scrollRef}
				onWheel={onWheel}
				role="tablist"
				aria-label="Open editors"
				className="flex h-9 min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
			>
				{openTabs.length === 0 ? (
					<span className="flex h-9 items-center px-3 text-xs text-muted-foreground">
						No editor open
					</span>
				) : (
					openTabs.map((tab, index) => {
						const active = tab.id === activeTabId;
						const label = editorTabLabel(tab);
						const isDragging = dragIndex === index;
						const showDropBefore =
							dropIndex === index && dragIndex !== null && dragIndex !== index;
						return (
							<ContextMenu key={tab.id}>
								<ContextMenuTrigger
									data-tab-id={tab.id}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.effectAllowed = "move";
										e.dataTransfer.setData("text/plain", String(index));
										handleDragStart(index);
									}}
									onDragOver={(e) => handleDragOver(e, index)}
									onDrop={(e) => handleDrop(e, index)}
									onDragEnd={handleDragEnd}
									className={cn(
										"group relative flex h-9 max-h-9 shrink-0 items-center border-r border-border/50",
										active
											? "bg-background text-foreground"
											: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
										isDragging && "opacity-50",
										showDropBefore &&
											"before:pointer-events-none before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary",
									)}
								>
									<button
										type="button"
										role="tab"
										aria-selected={active}
										className={cn(
											focusRing,
											"flex h-9 max-w-[180px] min-w-0 items-center gap-1.5 px-2.5 text-xs",
										)}
										onClick={() => {
											setActiveTabId(tab.id);
											scrollTabIntoView(tab.id);
										}}
									>
										<TabIcon tab={tab} />
										<span className="truncate">{label}</span>
										{tab.dirty ? (
											<span
												className="size-1.5 shrink-0 rounded-full bg-primary"
												role="img"
												aria-label="Unsaved changes"
											/>
										) : null}
									</button>
									<button
										type="button"
										className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-0 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100"
										onClick={() => void closeTab(tab.id)}
										aria-label={`Close ${label}`}
									>
										<IconX className="size-3" />
									</button>
									{active ? (
										<span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
									) : null}
								</ContextMenuTrigger>
								<ContextMenuContent>
									<ContextMenuItem
										onClick={() => {
											setActiveTabId(tab.id);
											scrollTabIntoView(tab.id);
										}}
									>
										Activate
									</ContextMenuItem>
									<ContextMenuItem
										disabled={!tab.dirty}
										onClick={() => void saveActiveTab(tab.id)}
									>
										Save
										<ContextMenuShortcut>
											{saveShortcutLabel()}
										</ContextMenuShortcut>
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										disabled={index === 0}
										onClick={() => void closeTabsToLeft(tab.id)}
									>
										Close to the Left
									</ContextMenuItem>
									<ContextMenuItem
										disabled={index === openTabs.length - 1}
										onClick={() => void closeTabsToRight(tab.id)}
									>
										Close to the Right
									</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem onClick={() => void closeTab(tab.id)}>
										Close
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
						);
					})
				)}
			</div>
		</header>
	);
}

export function DirtyBadge({ dirty }: { dirty: boolean }) {
	if (!dirty) return null;
	return <span className="text-[10px] text-muted-foreground">unsaved</span>;
}

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu.js";
import {
	type EditorTab,
	editorTabIcon,
	editorTabLabel,
} from "@/lib/editorTabs.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	IconFile,
	IconKey,
	IconTopologyRing2,
	IconX,
} from "@tabler/icons-react";
import { useLayoutEffect, useRef } from "react";

function TabIcon({ tab }: { tab: EditorTab }) {
	const kind = editorTabIcon(tab);
	const className = "size-3 shrink-0 opacity-70";
	if (kind === "flow") return <IconTopologyRing2 className={className} />;
	if (kind === "env") return <IconFile className={className} />;
	return <IconKey className={className} />;
}

function saveShortcutLabel(): string {
	if (typeof navigator === "undefined") return "Ctrl+S";
	return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘S" : "Ctrl+S";
}

export function TopBar() {
	const openTabs = useQuesterStore((s) => s.openTabs);
	const activeTabId = useQuesterStore((s) => s.activeTabId);
	const setActiveTabId = useQuesterStore((s) => s.setActiveTabId);
	const closeTab = useQuesterStore((s) => s.closeTab);
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const scrollRef = useRef<HTMLDivElement>(null);

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

	return (
		<header className="h-9 shrink-0 overflow-hidden border-b bg-muted/20">
			<div
				ref={scrollRef}
				onWheel={onWheel}
				className="flex h-9 max-h-9 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
			>
				{openTabs.length === 0 ? (
					<span className="flex h-9 items-center px-3 text-xs text-muted-foreground">
						No editor open
					</span>
				) : (
					openTabs.map((tab) => {
						const active = tab.id === activeTabId;
						const label = editorTabLabel(tab);
						return (
							<ContextMenu key={tab.id}>
								<ContextMenuTrigger
									data-tab-id={tab.id}
									className={cn(
										"group relative flex h-9 max-h-9 shrink-0 items-center border-r border-border/50",
										active
											? "bg-background text-foreground"
											: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
									)}
								>
									<button
										type="button"
										className="flex h-9 max-w-[180px] min-w-0 items-center gap-1.5 px-2.5 text-xs"
										onClick={() => {
											setActiveTabId(tab.id);
											scrollTabIntoView(tab.id);
										}}
									>
										<TabIcon tab={tab} />
										<span className="truncate">{label}</span>
										{tab.dirty ? (
											<span className="size-1.5 shrink-0 rounded-full bg-primary" />
										) : null}
									</button>
									<button
										type="button"
										className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-0 hover:bg-muted group-hover:opacity-100"
										onClick={() => closeTab(tab.id)}
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
									<ContextMenuItem onClick={() => closeTab(tab.id)}>
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

import { EmptyState } from "@/components/Typography.js";
import { Button } from "@/components/ui/button.js";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu.js";
import { Input } from "@/components/ui/input.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { promptConfirm } from "@/lib/confirmPrompt.js";
import {
	setFlowDragData,
	setFormDragData,
	setNodeDragData,
	setRequestDragData,
} from "@/lib/dnd.js";
import {
	envTabId,
	flowTabId,
	formTabId,
	requestTabId,
	runLogTabId,
	secretsTabId,
} from "@/lib/editorTabs.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { nodeCatalogGroups } from "@/lib/nodeCatalog.js";
import { getQuesterClient } from "@/lib/quester-client.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowTab,
	selectActiveTab,
	selectDirtyTabIds,
} from "@/stores/selectors.js";
import type { RunFlowEntry } from "@quester-studio/api-contract";
import {
	IconChevronRight,
	IconDeviceFloppy,
	IconFile,
	IconFolder,
	IconForms,
	IconGripVertical,
	IconKey,
	IconPencil,
	IconPlus,
	IconRefresh,
	IconTopologyRing2,
	IconTrash,
	IconUpload,
	IconWorld,
} from "@tabler/icons-react";
import type { ComponentType, DragEvent, ReactNode, SVGProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { RequestMeta } from "../../shared/rpc.js";
import { FlowSettingsDialog } from "./FlowSettingsDialog.js";
import { SettingsSidebar } from "./SettingsSidebar.js";

type ListIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

function DragGrip({ className }: { className?: string }) {
	return (
		<IconGripVertical
			className={cn(
				"size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground",
				className,
			)}
			aria-hidden
		/>
	);
}

export function PrimarySidebar() {
	const width = useQuesterStore((s) => s.sidebarWidth);
	const view = useQuesterStore((s) => s.activityView);
	const workspacePath = useQuesterStore((s) => s.workspacePath);
	const flows = useQuesterStore((s) => s.flows);
	const forms = useQuesterStore((s) => s.forms);
	const requests = useQuesterStore((s) => s.requests);
	const collections = useQuesterStore((s) => s.collections);
	const activeTabId = useQuesterStore((s) => s.activeTabId);
	const dirtyTabIds = useQuesterStore(useShallow(selectDirtyTabIds));
	const envs = useQuesterStore((s) => s.envs);
	const secretFiles = useQuesterStore((s) => s.secretFiles);
	const search = useQuesterStore((s) => s.sidebarSearch);
	const activeTab = useQuesterStore(selectActiveTab);
	const activeFlowTab = useQuesterStore(selectActiveFlowTab);
	const canSave = Boolean(activeTab?.dirty);

	const setSidebarSearch = useQuesterStore((s) => s.setSidebarSearch);
	const loadFlow = useQuesterStore((s) => s.loadFlow);
	const loadForm = useQuesterStore((s) => s.loadForm);
	const loadEnvironment = useQuesterStore((s) => s.loadEnvironment);
	const loadSecretsFile = useQuesterStore((s) => s.loadSecretsFile);
	const loadRequest = useQuesterStore((s) => s.loadRequest);
	const createFlow = useQuesterStore((s) => s.createFlow);
	const createForm = useQuesterStore((s) => s.createForm);
	const createEnv = useQuesterStore((s) => s.createEnv);
	const createSecretsFile = useQuesterStore((s) => s.createSecretsFile);
	const createCollection = useQuesterStore((s) => s.createCollection);
	const importCollection = useQuesterStore((s) => s.importCollection);
	const createRequest = useQuesterStore((s) => s.createRequest);
	const deleteRequest = useQuesterStore((s) => s.deleteRequest);
	const addRequestToCanvas = useQuesterStore((s) => s.addRequestToCanvas);
	const handleDropFlow = useQuesterStore((s) => s.handleDropFlow);
	const handleDropForm = useQuesterStore((s) => s.handleDropForm);
	const renameFlow = useQuesterStore((s) => s.renameFlow);
	const deleteFlow = useQuesterStore((s) => s.deleteFlow);
	const renameForm = useQuesterStore((s) => s.renameForm);
	const deleteForm = useQuesterStore((s) => s.deleteForm);
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const handleAddNode = useQuesterStore((s) => s.handleAddNode);
	const updateActiveFlowMeta = useQuesterStore((s) => s.updateActiveFlowMeta);
	const openRunLogTab = useQuesterStore((s) => s.openRunLogTab);
	const showError = useQuesterStore((s) => s.showError);
	const closeTab = useQuesterStore((s) => s.closeTab);

	const [flowDetailsId, setFlowDetailsId] = useState<string | null>(null);
	const flowDetailsTarget = flows.find((f) => f.id === flowDetailsId);

	const [runTree, setRunTree] = useState<RunFlowEntry[]>([]);
	const [runsLoading, setRunsLoading] = useState(false);
	const [runsError, setRunsError] = useState<string | null>(null);

	const refreshRuns = useCallback(async () => {
		if (!workspacePath) {
			setRunTree([]);
			return;
		}
		setRunsLoading(true);
		setRunsError(null);
		try {
			setRunTree(await getQuesterClient().listRunTree(workspacePath));
		} catch (err: unknown) {
			setRunTree([]);
			setRunsError(err instanceof Error ? err.message : "Failed to load runs");
		} finally {
			setRunsLoading(false);
		}
	}, [workspacePath]);

	const deleteRunEntry = useCallback(
		async (relativePath: string, label: string, kind: "file" | "folder") => {
			if (!workspacePath) return;
			const ok = await promptConfirm({
				title: kind === "folder" ? "Delete folder" : "Delete file",
				description:
					kind === "folder"
						? `Delete "${label}" and everything inside? This cannot be undone.`
						: `Delete "${label}"? This cannot be undone.`,
				confirmLabel: "Delete",
				destructive: true,
			});
			if (!ok) return;
			try {
				await getQuesterClient().deleteRunPath(workspacePath, relativePath);
				const prefix = `${relativePath}/`;
				for (const tab of useQuesterStore.getState().openTabs) {
					if (
						tab.kind === "runLog" &&
						(tab.relativePath === relativePath ||
							tab.relativePath.startsWith(prefix))
					) {
						void closeTab(tab.id);
					}
				}
				await refreshRuns();
			} catch (err: unknown) {
				showError(
					err instanceof Error ? err.message : "Failed to delete run path",
				);
			}
		},
		[workspacePath, closeTab, refreshRuns, showError],
	);

	useEffect(() => {
		if (view !== "runs") {
			return;
		}
		void refreshRuns();
	}, [view, refreshRuns]);

	const filteredFlows = flows.filter((f) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
	});

	const filteredForms = forms.filter((f) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
	});

	const filteredEnvs = envs.filter((env) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return env.toLowerCase().includes(q);
	});

	const filteredSecrets = secretFiles.filter((file) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return (
			file.envName.toLowerCase().includes(q) ||
			file.fileName.toLowerCase().includes(q)
		);
	});

	const filteredRequests = requests.filter((req) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return (
			req.name.toLowerCase().includes(q) ||
			req.path.toLowerCase().includes(q) ||
			req.collection.toLowerCase().includes(q)
		);
	});

	const requestsByCollection = useMemo(
		() => groupRequestsByCollection(filteredRequests, collections),
		[filteredRequests, collections],
	);

	const filteredRunTree = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return runTree;
		return runTree
			.map((flow) => {
				const runs = flow.runs
					.map((run) => {
						const files = run.files.filter(
							(f) =>
								f.name.toLowerCase().includes(q) ||
								f.relativePath.toLowerCase().includes(q),
						);
						const runMatch =
							run.name.toLowerCase().includes(q) ||
							(run.meta?.status?.toLowerCase().includes(q) ?? false) ||
							(run.meta?.flowName?.toLowerCase().includes(q) ?? false);
						if (runMatch) return run;
						if (files.length === 0) return null;
						return { ...run, files };
					})
					.filter((r): r is NonNullable<typeof r> => r !== null);
				const flowMatch = flow.flowId.toLowerCase().includes(q);
				if (flowMatch) return flow;
				if (runs.length === 0) return null;
				return { ...flow, runs };
			})
			.filter((f): f is NonNullable<typeof f> => f !== null);
	}, [runTree, search]);

	return (
		<aside
			style={{ width }}
			className="flex h-full min-h-0 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
		>
			<div className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
				{viewTitle(view)}
			</div>
			<Separator className="shrink-0 bg-sidebar-border" />

			{view === "flows" ? (
				<SidebarFileList
					search={search}
					onSearchChange={setSidebarSearch}
					onCreate={() => void createFlow()}
					onSave={() => void saveActiveTab()}
					canSave={canSave}
					createLabel="New"
					searchPlaceholder="Search flows…"
				>
					{filteredFlows.map((flow) => (
						<FileListItem
							key={flow.id}
							icon={IconTopologyRing2}
							label={flow.name}
							selected={activeTabId === flowTabId(flow.id)}
							dirty={dirtyTabIds.includes(flowTabId(flow.id))}
							draggable
							onDragStart={(event) => {
								setFlowDragData(event.dataTransfer, flow.id);
							}}
							onSelect={() => void loadFlow(flow.id, workspacePath)}
							onAddToCanvas={() => handleDropFlow(flow.id)}
							addToCanvasLabel="Add as subflow"
							onRename={() => void renameFlow(flow.id)}
							onEditDetails={() => {
								void (async () => {
									await loadFlow(flow.id, workspacePath);
									setFlowDetailsId(flow.id);
								})();
							}}
							onDelete={() => void deleteFlow(flow.id)}
						/>
					))}
					{filteredFlows.length === 0 ? (
						<EmptyState>No flows found</EmptyState>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "forms" ? (
				<SidebarFileList
					search={search}
					onSearchChange={setSidebarSearch}
					onCreate={() => void createForm()}
					onSave={() => void saveActiveTab()}
					canSave={canSave}
					createLabel="New"
					searchPlaceholder="Search forms…"
				>
					{filteredForms.map((form) => (
						<FileListItem
							key={form.id}
							icon={IconForms}
							label={form.name}
							selected={activeTabId === formTabId(form.id)}
							dirty={dirtyTabIds.includes(formTabId(form.id))}
							draggable
							onDragStart={(event) => {
								setFormDragData(event.dataTransfer, {
									formId: form.id,
									name: form.name,
								});
							}}
							onSelect={() => void loadForm(form.id, workspacePath)}
							onAddToCanvas={() => handleDropForm(form.id)}
							addToCanvasLabel="Add as form node"
							onRename={() => void renameForm(form.id)}
							onDelete={() => void deleteForm(form.id)}
						/>
					))}
					{filteredForms.length === 0 ? (
						<EmptyState>No forms found</EmptyState>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "envs" ? (
				<SidebarFileList
					search={search}
					onSearchChange={setSidebarSearch}
					onCreate={() => void createEnv()}
					onSave={() => void saveActiveTab()}
					canSave={canSave}
					createLabel="New env"
					searchPlaceholder="Search environments…"
				>
					{filteredEnvs.map((env) => (
						<FileListItem
							key={env}
							icon={IconFile}
							label={`${env}.json`}
							selected={activeTabId === envTabId(env)}
							dirty={dirtyTabIds.includes(envTabId(env))}
							onSelect={() => void loadEnvironment(env, workspacePath)}
						/>
					))}
					{filteredEnvs.length === 0 ? (
						<EmptyState>No environments</EmptyState>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "secrets" ? (
				<SidebarFileList
					search={search}
					onSearchChange={setSidebarSearch}
					onCreate={() => void createSecretsFile()}
					onSave={() => void saveActiveTab()}
					canSave={canSave}
					createLabel="New secrets"
					searchPlaceholder="Search secrets files…"
				>
					{filteredSecrets.map((file) => (
						<FileListItem
							key={file.envName}
							icon={IconKey}
							label={file.fileName}
							selected={activeTabId === secretsTabId(file.envName)}
							dirty={dirtyTabIds.includes(secretsTabId(file.envName))}
							onSelect={() => void loadSecretsFile(file.envName, workspacePath)}
						/>
					))}
					{filteredSecrets.length === 0 ? (
						<EmptyState>
							No secrets files. Create one for an environment.
						</EmptyState>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "nodes" ? (
				<ScrollArea className="min-h-0 flex-1">
					<div className="flex flex-col gap-3 p-2">
						<p className="px-1 text-xs text-muted-foreground">
							Click or drag onto the canvas
						</p>
						{nodeCatalogGroups.map((group) => (
							<div key={group.title} className="flex flex-col gap-1">
								<div className="px-1 text-xs font-medium text-muted-foreground">
									{group.title}
								</div>
								{group.nodes.map((node) => {
									const NodeIcon = node.icon;
									return (
										<Button
											key={node.type}
											type="button"
											variant="ghost"
											draggable
											className="group h-auto cursor-grab items-start justify-start gap-2 px-2 py-1.5 text-left font-normal active:cursor-grabbing"
											onClick={() => handleAddNode(node.type)}
											onDragStart={(event) => {
												setNodeDragData(event.dataTransfer, node.type);
											}}
										>
											<DragGrip className="mt-0.5" />
											<NodeIcon className="mt-0.5 size-4 shrink-0 opacity-70" />
											<span className="flex min-w-0 flex-col gap-0">
												<span className="text-sm">{node.label}</span>
												<span className="text-xs text-muted-foreground">
													{node.description}
												</span>
											</span>
										</Button>
									);
								})}
							</div>
						))}
					</div>
				</ScrollArea>
			) : null}

			{view === "collections" ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 flex-col gap-2 p-2">
						<div className="flex gap-1 px-1">
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="flex-1"
								onClick={() => void createCollection()}
							>
								<IconFolder />
								Collection
							</Button>
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="flex-1"
								onClick={() => void createRequest()}
							>
								<IconPlus />
								Request
							</Button>
						</div>
						<div className="flex gap-1 px-1">
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="flex-1"
								onClick={() => void importCollection()}
							>
								<IconUpload />
								Import
							</Button>
						</div>
						<div className="flex gap-1 px-1">
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="flex-1"
								onClick={() => void saveActiveTab()}
								disabled={!canSave}
							>
								<IconDeviceFloppy />
								Save
							</Button>
						</div>
						<Input
							value={search}
							onChange={(e) => setSidebarSearch(e.target.value)}
							placeholder="Search requests…"
							aria-label="Search requests"
							className="h-8 bg-background"
						/>
						<p className="px-1 text-2xs text-muted-foreground">
							Drag a request onto the canvas to insert an HTTP node (copy, not
							linked).
						</p>
					</div>
					<ScrollArea className="min-h-0 flex-1">
						<div className="flex flex-col gap-2 px-2 pb-2">
							{requestsByCollection.map(([collection, items]) => (
								<div
									key={collection || "__root"}
									className="flex flex-col gap-0.5"
								>
									<div className="flex items-center justify-between gap-1 px-1 py-1">
										<span className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-muted-foreground">
											{collection ? (
												<IconFolder className="size-3.5 shrink-0 opacity-70" />
											) : null}
											{collection || "Root"}
										</span>
										{collection ? (
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												onClick={() => void createRequest(collection)}
												aria-label={`New request in ${collection}`}
											>
												<IconPlus />
											</Button>
										) : null}
									</div>
									{items.map((req) => (
										<RequestListItem
											key={req.path}
											request={req}
											selected={activeTabId === requestTabId(req.path)}
											dirty={dirtyTabIds.includes(requestTabId(req.path))}
											onSelect={() => void loadRequest(req.path, workspacePath)}
											onAddToCanvas={() => void addRequestToCanvas(req.path)}
											onDelete={() => void deleteRequest(req.path)}
										/>
									))}
									{collection && items.length === 0 ? (
										<p className="px-2 pb-1 text-2xs text-muted-foreground">
											Empty — add a request
										</p>
									) : null}
								</div>
							))}
							{requestsByCollection.length === 0 ? (
								<EmptyState>
									No collections yet. Create a collection or request.
								</EmptyState>
							) : null}
						</div>
					</ScrollArea>
				</div>
			) : null}

			{view === "runs" ? (
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 flex-col gap-2 p-2">
						<div className="flex gap-1 px-1">
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="flex-1"
								onClick={() => void refreshRuns()}
								disabled={runsLoading || !workspacePath}
							>
								<IconRefresh />
								Refresh
							</Button>
						</div>
						<Input
							value={search}
							onChange={(e) => setSidebarSearch(e.target.value)}
							placeholder="Search runs…"
							aria-label="Search runs"
							className="h-8 bg-background"
						/>
					</div>
					<ScrollArea className="min-h-0 flex-1">
						<div className="flex flex-col gap-2 px-2 pb-2">
							{!workspacePath ? (
								<EmptyState>Open a workspace to browse run logs.</EmptyState>
							) : null}
							{workspacePath && runsLoading ? (
								<EmptyState>Loading runs…</EmptyState>
							) : null}
							{runsError ? (
								<p className="px-2 py-4 text-xs text-destructive">
									{runsError}
								</p>
							) : null}
							{workspacePath &&
							!runsLoading &&
							!runsError &&
							filteredRunTree.length === 0 ? (
								<EmptyState>
									No run logs yet. Enable runs in workspace settings and execute
									a flow.
								</EmptyState>
							) : null}
							{filteredRunTree.map((flow) => (
								<Collapsible
									key={flow.flowId}
									defaultOpen
									className="group/flow flex flex-col gap-0.5"
								>
									<div className="group flex items-center rounded-md hover:bg-sidebar-accent/70">
										<CollapsibleTrigger className="flex h-8 min-w-0 flex-1 items-center gap-1.5 px-1 text-left text-sm">
											<IconChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-open/flow:rotate-90" />
											<IconFolder className="size-3.5 shrink-0 opacity-70" />
											<span className="truncate font-medium">
												{flow.flowId}
											</span>
											<span className="shrink-0 text-3xs text-muted-foreground">
												{flow.runs.length}
											</span>
										</CollapsibleTrigger>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="mr-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
											aria-label={`Delete flow runs ${flow.flowId}`}
											onClick={() =>
												void deleteRunEntry(flow.flowId, flow.flowId, "folder")
											}
										>
											<IconTrash />
										</Button>
									</div>
									<CollapsibleContent className="flex flex-col gap-0.5 pl-3">
										{flow.runs.map((run) => (
											<Collapsible
												key={run.relativePath}
												defaultOpen={false}
												className="group/run flex flex-col gap-0.5"
											>
												<div className="group flex items-center rounded-md hover:bg-sidebar-accent/70">
													<CollapsibleTrigger className="flex h-8 min-w-0 flex-1 items-center gap-1.5 px-1 text-left text-xs">
														<IconChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-open/run:rotate-90" />
														<span className="truncate font-mono text-2xs">
															{run.name}
														</span>
														{run.meta?.status ? (
															<span
																className="shrink-0 text-3xs text-muted-foreground"
																title={
																	run.meta.status === "running"
																		? "Run did not finish writing a terminal status (interrupted or cancelled between steps)"
																		: undefined
																}
															>
																{run.meta.status === "running"
																	? "incomplete"
																	: run.meta.status}
															</span>
														) : null}
													</CollapsibleTrigger>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														className="mr-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
														aria-label={`Delete run ${run.name}`}
														onClick={() =>
															void deleteRunEntry(
																run.relativePath,
																run.name,
																"folder",
															)
														}
													>
														<IconTrash />
													</Button>
												</div>
												<CollapsibleContent className="flex flex-col gap-0.5 pl-3">
													{run.files.map((file) => (
														<FileListItem
															key={file.relativePath}
															icon={IconFile}
															label={file.name}
															selected={
																activeTabId === runLogTabId(file.relativePath)
															}
															dirty={false}
															onSelect={() =>
																void openRunLogTab(
																	file.relativePath,
																	`${flow.flowId} · ${file.name}`,
																)
															}
															onDelete={() =>
																void deleteRunEntry(
																	file.relativePath,
																	file.name,
																	"file",
																)
															}
														/>
													))}
												</CollapsibleContent>
											</Collapsible>
										))}
									</CollapsibleContent>
								</Collapsible>
							))}
						</div>
					</ScrollArea>
				</div>
			) : null}

			{view === "settings" ? <SettingsSidebar /> : null}

			<FlowSettingsDialog
				open={Boolean(flowDetailsId)}
				onOpenChange={(open) => {
					if (!open) setFlowDetailsId(null);
				}}
				flow={
					activeFlowTab?.flowId === flowDetailsId
						? {
								name: activeFlowTab.flow.name,
								description: activeFlowTab.flow.description,
								settings: activeFlowTab.flow.settings,
							}
						: {
								name: flowDetailsTarget?.name,
								description: undefined,
								settings: undefined,
							}
				}
				onSave={({ name, description, http }) => {
					updateActiveFlowMeta({ name, description, http });
					void useQuesterStore.getState().saveActiveTab();
				}}
			/>
		</aside>
	);
}

function SidebarFileList({
	search,
	onSearchChange,
	onCreate,
	onSave,
	canSave,
	createLabel,
	searchPlaceholder,
	children,
}: {
	search: string;
	onSearchChange: (value: string) => void;
	onCreate: () => void;
	onSave: () => void;
	canSave: boolean;
	createLabel: string;
	searchPlaceholder: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex shrink-0 flex-col gap-2 p-2">
				<div className="flex gap-1 px-1">
					<Button
						type="button"
						variant="outline"
						size="xs"
						className="flex-1"
						onClick={onCreate}
					>
						<IconPlus />
						{createLabel}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="xs"
						className="flex-1"
						onClick={onSave}
						disabled={!canSave}
					>
						<IconDeviceFloppy />
						Save
					</Button>
				</div>
				<Input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={searchPlaceholder}
					aria-label={searchPlaceholder}
					className="h-8 bg-background"
				/>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-0.5 px-2 pb-2">{children}</div>
			</ScrollArea>
		</div>
	);
}

function FileListItem({
	icon: Icon,
	label,
	selected,
	dirty,
	onSelect,
	onRename,
	onEditDetails,
	onDelete,
	draggable,
	onDragStart,
	onAddToCanvas,
	addToCanvasLabel = "Add to canvas",
}: {
	icon: ListIcon;
	label: string;
	selected: boolean;
	dirty: boolean;
	onSelect: () => void;
	onRename?: () => void;
	onEditDetails?: () => void;
	onDelete?: () => void;
	draggable?: boolean;
	onDragStart?: (event: DragEvent) => void;
	onAddToCanvas?: () => void;
	addToCanvasLabel?: string;
}) {
	const item = (
		<div
			className={cn(
				"group flex items-center rounded-md hover:bg-sidebar-accent/70",
				selected && "bg-sidebar-accent text-sidebar-accent-foreground",
			)}
		>
			<button
				type="button"
				draggable={draggable}
				aria-current={selected ? "true" : undefined}
				className={cn(
					"flex h-8 min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-sm font-normal",
					draggable && "cursor-grab active:cursor-grabbing",
				)}
				onClick={onSelect}
				onDragStart={
					draggable
						? (event) => {
								onDragStart?.(event);
							}
						: undefined
				}
			>
				{draggable ? <DragGrip /> : null}
				<Icon className="size-3.5 shrink-0 opacity-70" />
				<span className="truncate">{label}</span>
				{dirty ? (
					<span
						className="size-1.5 shrink-0 rounded-full bg-primary"
						role="img"
						aria-label="Unsaved changes"
					/>
				) : null}
			</button>
			{onRename || onDelete ? (
				<div className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
					{onRename ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={onRename}
							aria-label={`Rename ${label}`}
						>
							<IconPencil />
						</Button>
					) : null}
					{onDelete ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={onDelete}
							aria-label={`Delete ${label}`}
						>
							<IconTrash />
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger className="block w-full">{item}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={onSelect}>Open</ContextMenuItem>
				{onAddToCanvas ? (
					<ContextMenuItem onClick={onAddToCanvas}>
						{addToCanvasLabel}
					</ContextMenuItem>
				) : null}
				{onEditDetails ? (
					<ContextMenuItem onClick={onEditDetails}>
						Flow settings…
					</ContextMenuItem>
				) : null}
				{onRename ? (
					<ContextMenuItem onClick={onRename}>Rename</ContextMenuItem>
				) : null}
				{onDelete ? (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem variant="destructive" onClick={onDelete}>
							Delete
						</ContextMenuItem>
					</>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	);
}

function RequestListItem({
	request,
	selected,
	dirty,
	onSelect,
	onAddToCanvas,
	onDelete,
}: {
	request: RequestMeta;
	selected: boolean;
	dirty: boolean;
	onSelect: () => void;
	onAddToCanvas: () => void;
	onDelete: () => void;
}) {
	const item = (
		<div
			className={cn(
				"group flex items-center rounded-md",
				selected && "bg-sidebar-accent text-sidebar-accent-foreground",
			)}
		>
			<button
				type="button"
				draggable
				aria-current={selected ? "true" : undefined}
				className="flex h-8 min-w-0 flex-1 cursor-grab items-center gap-1.5 px-2 text-left text-sm font-normal active:cursor-grabbing"
				onClick={onSelect}
				onDragStart={(event) => {
					setRequestDragData(event.dataTransfer, request.path);
				}}
			>
				<DragGrip />
				<IconWorld className="size-3.5 shrink-0 opacity-70" />
				<span className="truncate">{request.name}</span>
				{dirty ? (
					<span
						className="size-1.5 shrink-0 rounded-full bg-primary"
						role="img"
						aria-label="Unsaved changes"
					/>
				) : null}
			</button>
		</div>
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger className="block w-full">{item}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={onSelect}>Open</ContextMenuItem>
				<ContextMenuItem onClick={onAddToCanvas}>Add to canvas</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive" onClick={onDelete}>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function groupRequestsByCollection(
	requests: RequestMeta[],
	collections: string[],
): Array<[string, RequestMeta[]]> {
	const map = new Map<string, RequestMeta[]>();
	for (const folder of collections) {
		map.set(folder, []);
	}
	for (const req of requests) {
		const key = req.collection;
		const list = map.get(key) ?? [];
		list.push(req);
		map.set(key, list);
	}
	return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function viewTitle(view: ActivityView): string {
	switch (view) {
		case "flows":
			return "Workspace";
		case "forms":
			return "Forms";
		case "collections":
			return "Collections";
		case "envs":
			return "Environments";
		case "secrets":
			return "Secrets";
		case "runs":
			return "Runs";
		case "nodes":
			return "Add node";
		case "settings":
			return "Settings";
		default:
			return view;
	}
}

import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { envTabId, flowTabId, secretsTabId } from "@/lib/editorTabs.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { nodeCatalogGroups } from "@/lib/nodeCatalog.js";
import { cn } from "@/lib/utils.js";
import type { BuiltinNodeType } from "@quester/schema";
import {
	IconDeviceFloppy,
	IconFolderOpen,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { FlowMeta, SecretFileMeta } from "../../shared/rpc.js";

type PrimarySidebarProps = {
	width: number;
	view: ActivityView;
	workspaceName: string;
	flows: FlowMeta[];
	activeTabId: string | null;
	dirtyTabIds: string[];
	envs: string[];
	secretFiles: SecretFileMeta[];
	search: string;
	canSave: boolean;
	onSearchChange: (value: string) => void;
	onOpenWorkspace: () => void;
	onSelectFlow: (flowId: string) => void;
	onSelectEnv: (envName: string) => void;
	onSelectSecretsFile: (envName: string) => void;
	onCreateFlow: () => void;
	onCreateEnv: () => void;
	onCreateSecretsFile: () => void;
	onRenameFlow: (flowId: string) => void;
	onDeleteFlow: (flowId: string) => void;
	onSaveActive: () => void;
	onAddNode: (type: BuiltinNodeType) => void;
};

export function PrimarySidebar({
	width,
	view,
	workspaceName,
	flows,
	activeTabId,
	dirtyTabIds,
	envs,
	secretFiles,
	search,
	canSave,
	onSearchChange,
	onOpenWorkspace,
	onSelectFlow,
	onSelectEnv,
	onSelectSecretsFile,
	onCreateFlow,
	onCreateEnv,
	onCreateSecretsFile,
	onRenameFlow,
	onDeleteFlow,
	onSaveActive,
	onAddNode,
}: PrimarySidebarProps) {
	const filteredFlows = flows.filter((f) => {
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
					onSearchChange={onSearchChange}
					workspaceName={workspaceName}
					onOpenWorkspace={onOpenWorkspace}
					onCreate={onCreateFlow}
					onSave={onSaveActive}
					canSave={canSave}
					createLabel="New"
					searchPlaceholder="Search flows…"
				>
					{filteredFlows.map((flow) => (
						<FileListItem
							key={flow.id}
							label={flow.name}
							selected={activeTabId === flowTabId(flow.id)}
							dirty={dirtyTabIds.includes(flowTabId(flow.id))}
							onSelect={() => onSelectFlow(flow.id)}
							onRename={() => onRenameFlow(flow.id)}
							onDelete={() => onDeleteFlow(flow.id)}
						/>
					))}
					{filteredFlows.length === 0 ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							No flows found
						</p>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "envs" ? (
				<SidebarFileList
					search={search}
					onSearchChange={onSearchChange}
					onCreate={onCreateEnv}
					onSave={onSaveActive}
					canSave={canSave}
					createLabel="New env"
					searchPlaceholder="Search environments…"
				>
					{filteredEnvs.map((env) => (
						<FileListItem
							key={env}
							label={`${env}.json`}
							selected={activeTabId === envTabId(env)}
							dirty={dirtyTabIds.includes(envTabId(env))}
							onSelect={() => onSelectEnv(env)}
						/>
					))}
					{filteredEnvs.length === 0 ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							No environments
						</p>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "secrets" ? (
				<SidebarFileList
					search={search}
					onSearchChange={onSearchChange}
					onCreate={onCreateSecretsFile}
					onSave={onSaveActive}
					canSave={canSave}
					createLabel="New secrets"
					searchPlaceholder="Search secrets files…"
				>
					{filteredSecrets.map((file) => (
						<FileListItem
							key={file.envName}
							label={file.fileName}
							selected={activeTabId === secretsTabId(file.envName)}
							dirty={dirtyTabIds.includes(secretsTabId(file.envName))}
							onSelect={() => onSelectSecretsFile(file.envName)}
						/>
					))}
					{filteredSecrets.length === 0 ? (
						<p className="px-2 py-4 text-xs text-muted-foreground">
							No secrets files. Create one for an environment.
						</p>
					) : null}
				</SidebarFileList>
			) : null}

			{view === "nodes" ? (
				<ScrollArea className="min-h-0 flex-1">
					<div className="flex flex-col gap-3 p-2">
						{nodeCatalogGroups.map((group) => (
							<div key={group.title} className="flex flex-col gap-1">
								<div className="px-1 text-xs font-medium text-muted-foreground">
									{group.title}
								</div>
								{group.nodes.map((node) => (
									<Button
										key={node.type}
										type="button"
										variant="ghost"
										className="h-auto flex-col items-start gap-0 px-2 py-1.5 text-left font-normal"
										onClick={() => onAddNode(node.type)}
									>
										<span className="text-sm">{node.label}</span>
										<span className="text-xs text-muted-foreground">
											{node.description}
										</span>
									</Button>
								))}
							</div>
						))}
					</div>
				</ScrollArea>
			) : null}
		</aside>
	);
}

function SidebarFileList({
	search,
	onSearchChange,
	workspaceName,
	onOpenWorkspace,
	onCreate,
	onSave,
	canSave,
	createLabel,
	searchPlaceholder,
	children,
}: {
	search: string;
	onSearchChange: (value: string) => void;
	workspaceName?: string;
	onOpenWorkspace?: () => void;
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
				{workspaceName ? (
					<div className="flex items-center justify-between gap-1 px-1">
						<span className="truncate text-xs font-medium">
							{workspaceName}
						</span>
						{onOpenWorkspace ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={onOpenWorkspace}
								aria-label="Open workspace folder"
							>
								<IconFolderOpen />
							</Button>
						) : null}
					</div>
				) : null}
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
	label,
	selected,
	dirty,
	onSelect,
	onRename,
	onDelete,
}: {
	label: string;
	selected: boolean;
	dirty: boolean;
	onSelect: () => void;
	onRename?: () => void;
	onDelete?: () => void;
}) {
	return (
		<div
			className={cn(
				"group flex items-center rounded-md",
				selected && "bg-sidebar-accent text-sidebar-accent-foreground",
			)}
		>
			<button
				type="button"
				className="flex h-8 min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-sm font-normal"
				onClick={onSelect}
			>
				<span className="truncate">{label}</span>
				{dirty ? (
					<span className="size-1.5 shrink-0 rounded-full bg-primary" />
				) : null}
			</button>
			{onRename || onDelete ? (
				<div className="flex shrink-0 opacity-0 group-hover:opacity-100">
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
}

function viewTitle(view: ActivityView): string {
	switch (view) {
		case "flows":
			return "Workspace";
		case "envs":
			return "Environments";
		case "secrets":
			return "Secrets";
		case "nodes":
			return "Add node";
		default:
			return view;
	}
}

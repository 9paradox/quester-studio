import {
	HttpSettingsFields,
	type HttpSettingsPatch,
	applyHttpSettingsPatch,
} from "@/components/HttpSettingsFields.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { WorkspaceSettingsEditorTab } from "@/lib/editorTabs.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import type { WorkspaceV1 } from "@quester-studio/schema";
import { useEffect, useState } from "react";
import {
	SettingsField,
	SettingsPageLayout,
	SettingsSection,
} from "./SettingsPageLayout.js";

const CATEGORIES = [
	{ id: "details", label: "Details" },
	{ id: "http", label: "HTTP" },
	{ id: "runs", label: "Runs" },
	{ id: "mcp", label: "MCP" },
] as const;

type WorkspaceSettingsEditorProps = {
	tab: WorkspaceSettingsEditorTab;
	onChange: (manifest: WorkspaceV1) => void;
	onSave: () => void;
	canSave: boolean;
};

export function WorkspaceSettingsEditor({
	tab,
	onChange,
	onSave,
	canSave,
}: WorkspaceSettingsEditorProps) {
	const [category, setCategory] = useState(tab.category);
	useEffect(() => {
		setCategory(tab.category);
	}, [tab.category]);
	const setWorkspaceSettingsCategory = useQuesterStore(
		(s) => s.setWorkspaceSettingsCategory,
	);
	const { manifest } = tab;

	const selectCategory = (id: string) => {
		setCategory(id as typeof tab.category);
		setWorkspaceSettingsCategory(id as typeof tab.category);
	};

	const patchManifest = (partial: Partial<WorkspaceV1>) => {
		onChange({ ...manifest, ...partial });
	};

	const patchHttp = (partial: HttpSettingsPatch) => {
		onChange({
			...manifest,
			settings: {
				...manifest.settings,
				http: applyHttpSettingsPatch(manifest.settings?.http, partial),
			},
		});
	};

	const runsEnabled = Boolean(manifest.runs?.enabled);
	const runsDir = manifest.runs?.dir ?? "runs";
	const mcpStatus = useQuesterStore((s) => s.mcpServerStatus);
	const startMcpServer = useQuesterStore((s) => s.startMcpServer);
	const stopMcpServer = useQuesterStore((s) => s.stopMcpServer);
	const copyMcpConfig = useQuesterStore((s) => s.copyMcpConfig);
	const workspacePath = useQuesterStore((s) => s.workspacePath);

	const patchRuns = (partial: { enabled?: boolean; dir?: string }) => {
		const nextEnabled = partial.enabled ?? runsEnabled;
		const nextDir = (partial.dir ?? runsDir).trim() || "runs";
		onChange({
			...manifest,
			runs: {
				enabled: nextEnabled,
				dir: nextDir,
			},
		});
	};

	return (
		<SettingsPageLayout
			title="Workspace settings"
			categories={[...CATEGORIES]}
			activeCategory={category}
			onCategoryChange={selectCategory}
			footer={
				<Button size="sm" disabled={!canSave} onClick={onSave}>
					Save
				</Button>
			}
		>
			{category === "details" ? (
				<SettingsSection title="Details">
					<SettingsField
						label="Name"
						htmlFor="ws-name"
						description="Display name stored in quester.json."
					>
						<Input
							id="ws-name"
							value={manifest.name}
							onChange={(e) => patchManifest({ name: e.target.value })}
							className="bg-background"
						/>
					</SettingsField>
					<SettingsField
						label="Description"
						htmlFor="ws-description"
						description="Optional notes for collaborators."
					>
						<Textarea
							id="ws-description"
							value={manifest.description ?? ""}
							onChange={(e) =>
								patchManifest({
									description: e.target.value || undefined,
								})
							}
							rows={4}
							className="bg-background"
						/>
					</SettingsField>
				</SettingsSection>
			) : null}

			{category === "http" ? (
				<SettingsSection title="HTTP defaults">
					<HttpSettingsFields
						idPrefix="ws"
						http={manifest.settings?.http}
						onPatch={patchHttp}
						allowInherit
						inheritHint="Unset TLS inherits App Preferences / env. Cookie jar defaults to on when unset."
					/>
				</SettingsSection>
			) : null}

			{category === "runs" ? (
				<SettingsSection title="On-disk run logs">
					<SettingsField
						label="Write run folders"
						htmlFor="ws-runs-enabled"
						description="When on, each flow run creates a timestamped folder under the directory below with per-step JSON (input, processed input, output). Keep this folder gitignored."
					>
						<Select
							value={runsEnabled ? "on" : "off"}
							onValueChange={(value) => {
								if (value === "on" || value === "off") {
									patchRuns({ enabled: value === "on" });
								}
							}}
						>
							<SelectTrigger
								id="ws-runs-enabled"
								className="w-full bg-background"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="on">On</SelectItem>
								<SelectItem value="off">Off</SelectItem>
							</SelectContent>
						</Select>
					</SettingsField>
					<SettingsField
						label="Runs directory"
						htmlFor="ws-runs-dir"
						description="Relative to the workspace root (default: runs)."
					>
						<Input
							id="ws-runs-dir"
							value={runsDir}
							onChange={(e) => patchRuns({ dir: e.target.value })}
							placeholder="runs"
							className="bg-background font-mono"
						/>
					</SettingsField>
				</SettingsSection>
			) : null}

			{category === "mcp" ? (
				<SettingsSection title="MCP server">
					<p className="mb-3 text-xs text-muted-foreground">
						Start a local workspace-scoped{" "}
						<code className="rounded bg-muted px-1 py-0.5">mcp serve</code>{" "}
						process managed by Desktop. Cursor / Claude / VS Code still spawn
						their own process from the copied config (stdio). Configure{" "}
						<code className="rounded bg-muted px-1 py-0.5">
							settings.mcp.servers
						</code>{" "}
						in quester.json for the flow <code>mcp</code> node (external tools).
					</p>
					<SettingsField
						label="Status"
						description={
							mcpStatus.running
								? `Running${mcpStatus.pid != null ? ` · pid ${mcpStatus.pid}` : ""}${
										mcpStatus.workspace
											? ` · ${mcpStatus.workspace}`
											: workspacePath
												? ` · ${workspacePath}`
												: ""
									}`
								: mcpStatus.error
									? `Off — ${mcpStatus.error}`
									: "Off"
						}
					>
						<div className="flex flex-wrap items-center gap-2">
							<span
								className={
									mcpStatus.running
										? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
										: "text-sm font-medium text-muted-foreground"
								}
							>
								{mcpStatus.running ? "Running" : "Off"}
							</span>
							{mcpStatus.running ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => void stopMcpServer()}
								>
									Stop
								</Button>
							) : (
								<Button
									size="sm"
									onClick={() => void startMcpServer()}
									disabled={!workspacePath}
								>
									Start
								</Button>
							)}
							<Button
								size="sm"
								variant="ghost"
								onClick={() => void copyMcpConfig()}
								disabled={!workspacePath}
							>
								Copy config
							</Button>
						</div>
					</SettingsField>
				</SettingsSection>
			) : null}
		</SettingsPageLayout>
	);
}

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
import type { WorkspaceV1 } from "@quester-studio/schema";
import { useState } from "react";
import {
	SettingsField,
	SettingsPageLayout,
	SettingsSection,
} from "./SettingsPageLayout.js";

const CATEGORIES = [
	{ id: "details", label: "Details" },
	{ id: "http", label: "HTTP" },
	{ id: "runs", label: "Runs" },
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
	const [category, setCategory] = useState<string>("details");
	const { manifest } = tab;

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
			onCategoryChange={setCategory}
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
		</SettingsPageLayout>
	);
}

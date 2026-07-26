import {
	HttpSettingsFields,
	type HttpSettingsPatch,
	applyHttpSettingsPatch,
} from "@/components/HttpSettingsFields.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
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
		</SettingsPageLayout>
	);
}

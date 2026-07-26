import { HeadersEditor } from "@/components/HeadersEditor.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { WorkspaceSettingsEditorTab } from "@/lib/editorTabs.js";
import type { WorkspaceV1 } from "@quester/schema";
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

	const patchHttp = (partial: {
		defaultHeaders?: Record<string, string>;
		timeoutMs?: number;
	}) => {
		onChange({
			...manifest,
			settings: {
				...manifest.settings,
				http: {
					defaultHeaders:
						partial.defaultHeaders ??
						manifest.settings?.http?.defaultHeaders ??
						{},
					...(partial.timeoutMs !== undefined
						? { timeoutMs: partial.timeoutMs }
						: manifest.settings?.http?.timeoutMs !== undefined
							? { timeoutMs: manifest.settings.http.timeoutMs }
							: {}),
				},
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
					<SettingsField
						label="Request timeout (ms)"
						htmlFor="ws-timeout"
						description="How long HTTP requests wait before timing out. Set to 0 for no timeout. Applied to flows unless a flow overrides it."
					>
						<Input
							id="ws-timeout"
							type="number"
							min={0}
							value={manifest.settings?.http?.timeoutMs ?? 0}
							onChange={(e) => {
								const n = Number(e.target.value);
								patchHttp({
									timeoutMs: Number.isFinite(n)
										? Math.max(0, Math.floor(n))
										: 0,
								});
							}}
							className="bg-background"
						/>
					</SettingsField>
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-foreground">
							Default headers
						</p>
						<p className="text-xs text-muted-foreground">
							Merged into every HTTP node. Node-level headers override the same
							keys.
						</p>
						<HeadersEditor
							headers={manifest.settings?.http?.defaultHeaders ?? {}}
							onChange={(defaultHeaders) => patchHttp({ defaultHeaders })}
						/>
					</div>
				</SettingsSection>
			) : null}
		</SettingsPageLayout>
	);
}

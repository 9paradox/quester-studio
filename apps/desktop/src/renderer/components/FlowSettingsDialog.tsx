import {
	HttpSettingsFields,
	type HttpSettingsPatch,
	applyHttpSettingsPatch,
} from "@/components/HttpSettingsFields.js";
import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { FlowV1, HttpSettingsV1 } from "@quester-studio/schema";
import { useEffect, useState } from "react";
import {
	SettingsField,
	SettingsPageLayout,
	SettingsSection,
} from "./SettingsPageLayout.js";

const CATEGORIES = [
	{ id: "details", label: "Details" },
	{ id: "http", label: "HTTP" },
] as const;

type FlowSettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	flow: Pick<FlowV1, "name" | "description" | "settings">;
	onSave: (next: {
		name: string;
		description: string;
		http: HttpSettingsV1 | undefined;
	}) => void;
};

export function FlowSettingsDialog({
	open,
	onOpenChange,
	flow,
	onSave,
}: FlowSettingsDialogProps) {
	const [category, setCategory] = useState<string>("details");
	const [draftName, setDraftName] = useState(flow.name ?? "");
	const [draftDescription, setDraftDescription] = useState(
		flow.description ?? "",
	);
	const [draftHttp, setDraftHttp] = useState<HttpSettingsV1 | undefined>(
		flow.settings?.http,
	);

	useEffect(() => {
		if (!open) return;
		setCategory("details");
		setDraftName(flow.name ?? "");
		setDraftDescription(flow.description ?? "");
		setDraftHttp(flow.settings?.http);
	}, [open, flow.name, flow.description, flow.settings?.http]);

	const patchHttp = (partial: HttpSettingsPatch) => {
		setDraftHttp(applyHttpSettingsPatch(draftHttp, partial));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
				<DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
					<DialogTitle>Flow settings</DialogTitle>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-hidden">
					<SettingsPageLayout
						title=""
						categories={[...CATEGORIES]}
						activeCategory={category}
						onCategoryChange={setCategory}
						hideTitleBar
					>
						{category === "details" ? (
							<SettingsSection title="Details">
								<SettingsField label="Name" htmlFor="flow-settings-name">
									<Input
										id="flow-settings-name"
										value={draftName}
										onChange={(e) => setDraftName(e.target.value)}
										className="bg-background"
									/>
								</SettingsField>
								<SettingsField
									label="Description"
									htmlFor="flow-settings-description"
								>
									<Textarea
										id="flow-settings-description"
										value={draftDescription}
										onChange={(e) => setDraftDescription(e.target.value)}
										rows={4}
										className="bg-background"
									/>
								</SettingsField>
							</SettingsSection>
						) : null}
						{category === "http" ? (
							<SettingsSection title="HTTP defaults">
								<HttpSettingsFields
									idPrefix="flow"
									http={draftHttp}
									onPatch={patchHttp}
									allowInherit
									inheritHint="Unset fields inherit from workspace settings, then App Preferences for TLS."
								/>
							</SettingsSection>
						) : null}
					</SettingsPageLayout>
				</div>
				<DialogFooter className="shrink-0 border-t px-4 py-3">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							onSave({
								name: draftName.trim(),
								description: draftDescription,
								http: draftHttp,
							});
							onOpenChange(false);
						}}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

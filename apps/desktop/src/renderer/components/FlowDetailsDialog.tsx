import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import { useEffect, useState } from "react";

type FlowDetailsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	description: string;
	onSave: (next: { name: string; description: string }) => void;
};

export function FlowDetailsDialog({
	open,
	onOpenChange,
	name,
	description,
	onSave,
}: FlowDetailsDialogProps) {
	const [draftName, setDraftName] = useState(name);
	const [draftDescription, setDraftDescription] = useState(description);

	useEffect(() => {
		if (!open) return;
		setDraftName(name);
		setDraftDescription(description);
	}, [open, name, description]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Flow details</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3 py-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="flow-detail-name">Name</Label>
						<Input
							id="flow-detail-name"
							value={draftName}
							onChange={(e) => setDraftName(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="flow-detail-description">Description</Label>
						<Textarea
							id="flow-detail-description"
							value={draftDescription}
							onChange={(e) => setDraftDescription(e.target.value)}
							rows={4}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							onSave({
								name: draftName.trim(),
								description: draftDescription,
							});
							onOpenChange(false);
						}}
					>
						Apply
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

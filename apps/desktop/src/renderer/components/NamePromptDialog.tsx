import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
	getNamePromptRequest,
	resolveNamePrompt,
	subscribeNamePrompt,
} from "@/lib/namePrompt.js";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

export function NamePromptDialog() {
	const request = useSyncExternalStore(
		subscribeNamePrompt,
		getNamePromptRequest,
		() => null,
	);
	const open = request !== null;
	const inputId = useId();
	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (!request) return;
		setDraft(request.defaultValue ?? "");
	}, [request]);

	const submit = () => {
		resolveNamePrompt(draft);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) resolveNamePrompt(null);
			}}
		>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<DialogHeader>
						<DialogTitle>{request?.title ?? "Name"}</DialogTitle>
						{request?.description ? (
							<DialogDescription>{request.description}</DialogDescription>
						) : null}
					</DialogHeader>
					<div className="flex flex-col gap-1.5 py-2">
						<Label htmlFor={inputId}>{request?.label ?? "Name"}</Label>
						<Input
							id={inputId}
							value={draft}
							placeholder={request?.placeholder}
							onChange={(e) => setDraft(e.target.value)}
							onFocus={(e) => e.currentTarget.select()}
							autoFocus
							autoComplete="off"
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => resolveNamePrompt(null)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!draft.trim()}>
							{request?.confirmLabel ?? "OK"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

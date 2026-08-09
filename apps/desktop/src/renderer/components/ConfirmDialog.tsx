import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
import {
	getConfirmPromptRequest,
	resolveConfirmPrompt,
	subscribeConfirmPrompt,
} from "@/lib/confirmPrompt.js";
import { useSyncExternalStore } from "react";

export function ConfirmDialog() {
	const request = useSyncExternalStore(
		subscribeConfirmPrompt,
		getConfirmPromptRequest,
		() => null,
	);
	const open = request !== null;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) resolveConfirmPrompt(false);
			}}
		>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>{request?.title ?? "Confirm"}</DialogTitle>
					{request?.description ? (
						<DialogDescription>{request.description}</DialogDescription>
					) : null}
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => resolveConfirmPrompt(false)}
					>
						{request?.cancelLabel ?? "Cancel"}
					</Button>
					<Button
						type="button"
						variant={request?.destructive ? "destructive" : "default"}
						autoFocus
						onClick={() => resolveConfirmPrompt(true)}
					>
						{request?.confirmLabel ?? "OK"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

import { Button } from "@/components/ui/button.js";
import { Label } from "@/components/ui/label.js";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet.js";
import { Textarea } from "@/components/ui/textarea.js";
import { useQuesterStore } from "@/stores/quester-store.js";

export function PlaygroundSheet() {
	const open = useQuesterStore((s) => s.playgroundOpen);
	const inputJson = useQuesterStore((s) => s.inputJson);
	const inputError = useQuesterStore((s) => s.inputError);
	const isRunning = useQuesterStore((s) => s.isRunning);

	const setPlaygroundOpen = useQuesterStore((s) => s.setPlaygroundOpen);
	const setInputJson = useQuesterStore((s) => s.setInputJson);
	const runFlow = useQuesterStore((s) => s.runFlow);

	return (
		<Sheet open={open} onOpenChange={setPlaygroundOpen}>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Playground input</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-2 px-4">
					<Label htmlFor="playground-input">Input JSON</Label>
					<Textarea
						id="playground-input"
						value={inputJson}
						onChange={(e) => setInputJson(e.target.value)}
						className="min-h-[200px] font-mono text-xs"
						spellCheck={false}
					/>
					{inputError ? (
						<p className="text-sm text-destructive">{inputError}</p>
					) : null}
				</div>
				<SheetFooter>
					<Button
						type="button"
						onClick={() => void runFlow()}
						disabled={isRunning}
					>
						{isRunning ? "Running…" : "Run flow"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

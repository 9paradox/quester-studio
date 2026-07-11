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

type PlaygroundSheetProps = {
	open: boolean;
	inputJson: string;
	inputError: string | null;
	onOpenChange: (open: boolean) => void;
	onInputChange: (value: string) => void;
	onRun: () => void;
	isRunning: boolean;
};

export function PlaygroundSheet({
	open,
	inputJson,
	inputError,
	onOpenChange,
	onInputChange,
	onRun,
	isRunning,
}: PlaygroundSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Playground input</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-2 px-4">
					<Label htmlFor="playground-input">Input JSON</Label>
					<Textarea
						id="playground-input"
						value={inputJson}
						onChange={(e) => onInputChange(e.target.value)}
						className="min-h-48 font-mono text-xs"
						spellCheck={false}
					/>
					{inputError ? (
						<p className="text-xs text-destructive">{inputError}</p>
					) : null}
				</div>
				<SheetFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button type="button" onClick={onRun} disabled={isRunning}>
						{isRunning ? "Running…" : "Run"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

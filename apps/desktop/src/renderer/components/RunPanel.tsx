import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card.js";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { Label } from "@/components/ui/label.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { Separator } from "@/components/ui/separator.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { ExecuteFlowResult } from "@quester/engine";
import { IconPlayerPlay } from "@tabler/icons-react";

const DEFAULT_INPUT = JSON.stringify(
	{ username: "demo", email: "demo@example.com" },
	null,
	2,
);

type RunPanelProps = {
	envs: string[];
	selectedEnv: string;
	onEnvChange: (env: string) => void;
	inputJson: string;
	onInputChange: (value: string) => void;
	onRun: () => void;
	isRunning: boolean;
	runResult: ExecuteFlowResult | null;
	runError: string | null;
	inputError: string | null;
	selectedFlowId: string | null;
};

export function RunPanel({
	envs,
	selectedEnv,
	onEnvChange,
	inputJson,
	onInputChange,
	onRun,
	isRunning,
	runResult,
	runError,
	inputError,
	selectedFlowId,
}: RunPanelProps) {
	const envOptions = envs.length === 0 ? ["local"] : envs;

	return (
		<aside className="flex w-72 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground">
			<div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/70">
				Run
			</div>
			<Separator className="bg-sidebar-border" />
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-4 p-3">
					<div className="flex flex-col gap-2">
						<Label htmlFor="run-env">Environment</Label>
						<Select
							value={selectedEnv}
							onValueChange={(value) => {
								if (value) onEnvChange(value);
							}}
						>
							<SelectTrigger id="run-env" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{envOptions.map((env) => (
									<SelectItem key={env} value={env}>
										{env}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="run-input">Input (JSON)</Label>
						<Textarea
							id="run-input"
							value={inputJson}
							onChange={(e) => onInputChange(e.target.value)}
							className="min-h-28 font-mono"
							spellCheck={false}
						/>
						{inputError ? (
							<p className="text-xs text-destructive">{inputError}</p>
						) : null}
					</div>

					<Button
						type="button"
						onClick={onRun}
						disabled={isRunning || !selectedFlowId}
						className="w-full"
					>
						<IconPlayerPlay />
						{isRunning ? "Running…" : "Run"}
					</Button>

					{runError ? (
						<Alert variant="destructive">
							<AlertDescription>{runError}</AlertDescription>
						</Alert>
					) : null}

					{runResult ? (
						<div className="flex flex-col gap-3">
							<Card>
								<CardHeader className="p-3 pb-0">
									<CardTitle className="text-sm">Output</CardTitle>
								</CardHeader>
								<CardContent className="p-3 pt-2">
									<pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
										{JSON.stringify(runResult.output, null, 2)}
									</pre>
								</CardContent>
							</Card>
							<Collapsible>
								<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50">
									Node outputs
								</CollapsibleTrigger>
								<CollapsibleContent>
									<pre className="mt-2 max-h-40 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
										{JSON.stringify(runResult.nodeOutputs, null, 2)}
									</pre>
								</CollapsibleContent>
							</Collapsible>
						</div>
					) : null}
				</div>
			</ScrollArea>
		</aside>
	);
}

export { DEFAULT_INPUT };

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

type ResponseViewProps = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
};

export function ResponseView({ runResult, runError }: ResponseViewProps) {
	if (runError && !runResult) {
		return <p className="text-sm text-destructive">{runError}</p>;
	}

	if (!runResult) {
		return (
			<p className="text-sm text-muted-foreground">
				Run a flow to see the response here.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div>
				<div className="mb-1 text-xs font-medium text-muted-foreground">
					Output
				</div>
				<pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
					{JSON.stringify(runResult.output, null, 2)}
				</pre>
			</div>
			<Collapsible defaultOpen>
				<CollapsibleTrigger className="text-xs font-medium">
					Node outputs
				</CollapsibleTrigger>
				<CollapsibleContent>
					<pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs">
						{JSON.stringify(runResult.nodeOutputs, null, 2)}
					</pre>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

export function ResponseViewScroll({ runResult, runError }: ResponseViewProps) {
	return (
		<ScrollArea className="h-full">
			<div className="p-3">
				<ResponseView runResult={runResult} runError={runError} />
			</div>
		</ScrollArea>
	);
}

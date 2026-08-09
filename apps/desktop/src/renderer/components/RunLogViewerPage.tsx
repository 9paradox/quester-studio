import { JsonPane } from "@/components/JsonPane.js";
import { ErrorAlert, MetaChip } from "@/components/response/shared.js";
import { Badge } from "@/components/ui/badge.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { RunLogEditorTab } from "@/lib/editorTabs.js";

type RunLogViewerPageProps = {
	tab: RunLogEditorTab;
};

type RunMetaLike = {
	flowId: string;
	status: string;
	startedAt: string;
	finishedAt?: string;
	flowName?: string;
	env?: string;
	error?: string;
	failedNodeId?: string;
};

type RunStepLike = {
	seq: number;
	nodeId: string;
	type: string;
	input: unknown;
	processedInput: unknown;
	output: unknown;
	error?: string | null;
};

function isRunMeta(data: unknown): data is RunMetaLike {
	if (!data || typeof data !== "object") return false;
	const o = data as Record<string, unknown>;
	return (
		typeof o.flowId === "string" &&
		typeof o.status === "string" &&
		typeof o.startedAt === "string"
	);
}

function isRunStep(data: unknown): data is RunStepLike {
	if (!data || typeof data !== "object") return false;
	const o = data as Record<string, unknown>;
	return (
		typeof o.seq === "number" &&
		typeof o.nodeId === "string" &&
		typeof o.type === "string" &&
		"input" in o &&
		"output" in o
	);
}

function statusVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	if (status === "success") return "default";
	if (status === "failed") return "destructive";
	if (status === "cancelled") return "secondary";
	return "outline";
}

/** Full-bleed viewer for a run log file (structured UI or raw JSON). */
export function RunLogViewerPage({ tab }: RunLogViewerPageProps) {
	const data = tab.data;
	const structuredReady = data !== null && (isRunMeta(data) || isRunStep(data));

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-medium">{tab.title}</h1>
					<p className="truncate font-mono text-[11px] text-muted-foreground">
						{tab.relativePath}
					</p>
				</div>
				<Badge variant="outline">run log</Badge>
			</div>

			<div className="flex min-h-0 flex-1 flex-col p-4">
				{tab.loading ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : null}

				{tab.error ? (
					<div className="mb-3 shrink-0">
						<ErrorAlert title="Failed to load run log" message={tab.error} />
					</div>
				) : null}

				{!tab.loading && !tab.error && data !== null ? (
					<Tabs
						defaultValue={structuredReady ? "structured" : "raw"}
						className="flex min-h-0 flex-1 flex-col gap-2"
					>
						<TabsList
							variant="line"
							className="h-8 w-fit shrink-0 justify-start"
						>
							{structuredReady ? (
								<TabsTrigger value="structured" className="text-xs">
									Structured
								</TabsTrigger>
							) : null}
							<TabsTrigger value="raw" className="text-xs">
								Raw
							</TabsTrigger>
						</TabsList>

						{structuredReady && isRunMeta(data) ? (
							<TabsContent
								value="structured"
								className="mt-0 min-h-0 flex-1 overflow-auto"
							>
								<div className="flex flex-col gap-3">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant={statusVariant(data.status)}>
											{data.status}
										</Badge>
										{data.env ? (
											<MetaChip label="Env" value={data.env} />
										) : null}
										{data.flowName ? (
											<MetaChip label="Flow" value={data.flowName} />
										) : (
											<MetaChip label="Flow" value={data.flowId} />
										)}
										<MetaChip label="Started" value={data.startedAt} />
										{data.finishedAt ? (
											<MetaChip label="Finished" value={data.finishedAt} />
										) : null}
										{data.failedNodeId ? (
											<MetaChip label="Failed node" value={data.failedNodeId} />
										) : null}
									</div>
									{data.error ? (
										<ErrorAlert title="Run error" message={data.error} />
									) : null}
									<JsonPane
										value={data}
										defaultExpandedDepth={2}
										showRaw={false}
										className="min-h-0"
									/>
								</div>
							</TabsContent>
						) : null}

						{structuredReady && isRunStep(data) ? (
							<TabsContent
								value="structured"
								className="mt-0 min-h-0 flex-1 overflow-auto"
							>
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="outline">{data.type}</Badge>
										<MetaChip label="Seq" value={String(data.seq)} />
										<MetaChip label="Node" value={data.nodeId} />
									</div>
									{data.error ? (
										<ErrorAlert title="Step error" message={data.error} />
									) : null}
									<section className="flex min-h-0 flex-col gap-1.5">
										<h2 className="text-xs font-medium text-muted-foreground">
											Input
										</h2>
										<JsonPane
											value={data.input}
											defaultExpandedDepth={2}
											showRaw={false}
											className="min-h-[8rem]"
										/>
									</section>
									<section className="flex min-h-0 flex-col gap-1.5">
										<h2 className="text-xs font-medium text-muted-foreground">
											Processed input
										</h2>
										<JsonPane
											value={data.processedInput}
											defaultExpandedDepth={2}
											showRaw={false}
											className="min-h-[8rem]"
										/>
									</section>
									<section className="flex min-h-0 flex-col gap-1.5">
										<h2 className="text-xs font-medium text-muted-foreground">
											Output
										</h2>
										<JsonPane
											value={data.output}
											defaultExpandedDepth={2}
											showRaw={false}
											className="min-h-[8rem]"
										/>
									</section>
								</div>
							</TabsContent>
						) : null}

						{!structuredReady ? (
							<p className="text-xs text-muted-foreground">
								Unrecognized run file shape — showing raw JSON.
							</p>
						) : null}

						<TabsContent
							value="raw"
							className="mt-0 min-h-0 flex-1 overflow-auto"
						>
							<JsonPane
								value={data}
								defaultExpandedDepth={3}
								showRaw
								className="min-h-0"
							/>
						</TabsContent>
					</Tabs>
				) : null}
			</div>
		</div>
	);
}

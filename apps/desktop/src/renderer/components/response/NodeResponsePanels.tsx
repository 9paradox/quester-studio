import { JsonPane } from "@/components/JsonPane.js";
import {
	HttpRequestPanel,
	HttpResponsePanel,
} from "@/components/response/HttpResponsePanels.js";
import { ErrorAlert, MetaChip } from "@/components/response/shared.js";
import type { StepView } from "@/components/response/types.js";
import {
	isHttpOutput,
	isRecord,
	parseAssertFailures,
} from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { Separator } from "@/components/ui/separator.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { FlowNodeV1 } from "@quester/schema";

function ResultWithInput({
	result,
	input,
	error,
	resultLabel = "Result",
}: {
	result: unknown;
	input: unknown;
	error?: string;
	resultLabel?: string;
}) {
	return (
		<div className="flex flex-col gap-4">
			{error ? <ErrorAlert message={error} /> : null}
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">
					{resultLabel}
				</h3>
				{!error ? <JsonPane value={result} defaultExpandedDepth={4} /> : null}
			</section>
			<Separator />
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Input</h3>
				<JsonPane value={input} />
			</section>
		</div>
	);
}

function AssertPanels({ step }: { step: StepView }) {
	const failures = parseAssertFailures(step.error);
	const ok = !step.error && isRecord(step.output) && step.output.ok === true;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				{ok ? (
					<Badge variant="secondary">All checks passed</Badge>
				) : step.error ? (
					<Badge variant="destructive">Assertion failed</Badge>
				) : (
					<Badge variant="outline">Unknown</Badge>
				)}
			</div>

			{failures.length > 0 ? (
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Failures
					</h3>
					<ul className="flex flex-col gap-1.5">
						{failures.map((msg) => (
							<li key={msg}>
								<ErrorAlert title="Check failed" message={msg} />
							</li>
						))}
					</ul>
				</section>
			) : step.error ? (
				<ErrorAlert message={step.error} />
			) : null}

			{!step.error ? (
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">Output</h3>
					<JsonPane value={step.output} />
				</section>
			) : null}

			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">
					Checked input
				</h3>
				<JsonPane value={step.input} />
			</section>
		</div>
	);
}

function IfPanels({ step }: { step: StepView }) {
	const condition =
		isRecord(step.output) && typeof step.output.condition === "boolean"
			? step.output.condition
			: null;
	const branch =
		condition === true ? "true" : condition === false ? "false" : null;

	return (
		<div className="flex flex-col gap-4">
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Branch</h3>
				<div className="flex flex-wrap gap-2">
					{condition !== null ? (
						<MetaChip label="Condition" value={String(condition)} />
					) : null}
					{branch ? (
						<Badge variant={branch === "true" ? "secondary" : "outline"}>
							→ {branch}
						</Badge>
					) : (
						<Badge variant="outline">No branch data</Badge>
					)}
				</div>
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Output</h3>
				<JsonPane value={step.output} />
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Input</h3>
				<JsonPane value={step.input} />
			</section>
		</div>
	);
}

function SetPanels({
	step,
	node,
}: {
	step: StepView;
	node: FlowNodeV1 | null;
}) {
	const variables =
		node?.data && isRecord(node.data) && isRecord(node.data.variables)
			? node.data.variables
			: {};

	return (
		<div className="flex flex-col gap-4">
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">
					Variables applied
				</h3>
				<p className="text-[11px] text-muted-foreground">
					Values written to{" "}
					<code className="font-mono text-[10px]">{"{{vars.*}}"}</code> for
					later nodes. Output below is the passthrough previous value.
				</p>
				<JsonPane value={variables} />
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">
					Passthrough output
				</h3>
				{!step.error ? <JsonPane value={step.output} /> : null}
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Input</h3>
				<JsonPane value={step.input} />
			</section>
		</div>
	);
}

function StartPanels({ step }: { step: StepView }) {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">
				Flow entry. Execution starts here and continues to the next connected
				node.
			</p>
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Output</h3>
				<JsonPane value={step.output} />
			</section>
		</div>
	);
}

function ConfigInputOutputPanels({
	step,
	node,
}: {
	step: StepView;
	node: FlowNodeV1 | null;
}) {
	const config = node?.data ?? {};
	return (
		<div className="flex flex-col gap-4">
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Context</h3>
				<Tabs defaultValue="config">
					<TabsList variant="line" className="h-8 w-full justify-start">
						<TabsTrigger value="config" className="text-xs">
							Config
						</TabsTrigger>
						<TabsTrigger value="input" className="text-xs">
							Input
						</TabsTrigger>
					</TabsList>
					<TabsContent value="config" className="mt-2">
						<JsonPane value={config} />
					</TabsContent>
					<TabsContent value="input" className="mt-2">
						<JsonPane value={step.input} />
					</TabsContent>
				</Tabs>
			</section>
			<Separator />
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Output</h3>
				{!step.error ? <JsonPane value={step.output} /> : null}
			</section>
		</div>
	);
}

export function NodeResponsePanels({
	step,
	node,
}: {
	step: StepView;
	node: FlowNodeV1 | null;
}) {
	const nodeType = node?.type ?? step.type;

	if (nodeType === "http") {
		const httpOut = isHttpOutput(step.output) ? step.output : null;
		return (
			<>
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">Request</h3>
					<HttpRequestPanel
						request={httpOut?.request}
						upstreamInput={step.input}
					/>
				</section>
				<Separator />
				<section className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Response
					</h3>
					<HttpResponsePanel output={step.output} error={step.error} />
				</section>
			</>
		);
	}

	switch (nodeType) {
		case "assert":
			return <AssertPanels step={step} />;
		case "if":
			return <IfPanels step={step} />;
		case "set":
			return <SetPanels step={step} node={node} />;
		case "start":
			return <StartPanels step={step} />;
		case "extract":
		case "json":
		case "template":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
				/>
			);
		case "transform":
		case "merge":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Merged / mapped result"
				/>
			);
		case "input":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Run payload"
				/>
			);
		case "output":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Flow result"
				/>
			);
		default:
			return <ConfigInputOutputPanels step={step} node={node} />;
	}
}

import { JsonPane } from "@/components/JsonPane.js";
import { SectionHeading } from "@/components/Typography.js";
import {
	HttpRequestPanel,
	HttpResponsePanel,
} from "@/components/response/HttpResponsePanels.js";
import { ErrorAlert, MetaChip } from "@/components/response/shared.js";
import type { StepView } from "@/components/response/types.js";
import {
	isHttpOutput,
	isRecord,
	resolveAssertChecks,
} from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { Separator } from "@/components/ui/separator.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { FlowNodeV1 } from "@quester-studio/schema";

function ResultWithInput({
	result,
	input,
	error,
	resultLabel = "Result",
	pathCopyNodeId = null,
}: {
	result: unknown;
	input: unknown;
	error?: string;
	resultLabel?: string;
	pathCopyNodeId?: string | null;
}) {
	return (
		<div className="flex flex-col gap-4">
			{error ? <ErrorAlert message={error} /> : null}
			<section className="flex flex-col gap-2">
				<SectionHeading>{resultLabel}</SectionHeading>
				{!error ? (
					<JsonPane
						value={result}
						defaultExpandedDepth={2}
						pathCopyNodeId={pathCopyNodeId}
					/>
				) : null}
			</section>
			<Separator />
			<section className="flex flex-col gap-2">
				<SectionHeading>Input</SectionHeading>
				<JsonPane value={input} />
			</section>
		</div>
	);
}

function AssertPanels({ step }: { step: StepView }) {
	const checks = resolveAssertChecks(step.output, step.error);
	const failures = checks.filter((c) => !c.ok);
	const ok =
		!step.error &&
		(checks.length === 0
			? isRecord(step.output) && step.output.ok === true
			: failures.length === 0);

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

			{checks.length > 0 ? (
				<section className="flex flex-col gap-2">
					<SectionHeading>Checks</SectionHeading>
					<ul className="flex flex-col gap-1.5">
						{checks.map((check) =>
							check.ok ? (
								<li
									key={`${check.path}:ok`}
									className="rounded-md border border-border bg-muted/30 px-2.5 py-2 font-mono text-xs text-muted-foreground"
								>
									✓ {check.path}
								</li>
							) : (
								<li key={`${check.path}:${check.message ?? "fail"}`}>
									<ErrorAlert
										title="Check failed"
										message={check.message ?? check.path}
									/>
								</li>
							),
						)}
					</ul>
				</section>
			) : step.error ? (
				<ErrorAlert message={step.error} />
			) : null}

			{!step.error ? (
				<section className="flex flex-col gap-2">
					<SectionHeading>Output</SectionHeading>
					<JsonPane value={step.output} pathCopyNodeId={step.nodeId} />
				</section>
			) : null}

			<section className="flex flex-col gap-2">
				<SectionHeading>Checked input</SectionHeading>
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
				<SectionHeading>Branch</SectionHeading>
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
			<ResultWithInput
				result={step.output}
				input={step.input}
				error={step.error}
				pathCopyNodeId={step.nodeId}
			/>
		</div>
	);
}

function TryPanels({ step }: { step: StepView }) {
	const failed = isRecord(step.output) && step.output.failed === true;
	const branch = failed
		? "failed"
		: step.output !== undefined
			? "success"
			: null;

	return (
		<div className="flex flex-col gap-4">
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<SectionHeading>Branch</SectionHeading>
				<div className="flex flex-wrap gap-2">
					{failed ? <MetaChip label="Failed" value="true" /> : null}
					{branch ? (
						<Badge variant={branch === "success" ? "secondary" : "outline"}>
							→ {branch}
						</Badge>
					) : (
						<Badge variant="outline">No branch data</Badge>
					)}
				</div>
			</section>
			<ResultWithInput
				result={step.output}
				input={step.input}
				error={step.error}
				pathCopyNodeId={step.nodeId}
			/>
		</div>
	);
}

function ForeachPanels({ step }: { step: StepView }) {
	const count =
		isRecord(step.output) && typeof step.output.count === "number"
			? step.output.count
			: null;
	const truncated =
		isRecord(step.output) && typeof step.output.truncated === "boolean"
			? step.output.truncated
			: null;

	return (
		<div className="flex flex-col gap-4">
			{step.error ? <ErrorAlert message={step.error} /> : null}
			<section className="flex flex-col gap-2">
				<SectionHeading>Loop</SectionHeading>
				<div className="flex flex-wrap gap-2">
					{count !== null ? (
						<MetaChip label="Count" value={String(count)} />
					) : null}
					{truncated !== null ? (
						<MetaChip label="Truncated" value={String(truncated)} />
					) : null}
					<Badge variant="secondary">→ complete</Badge>
				</div>
			</section>
			<ResultWithInput
				result={step.output}
				input={step.input}
				error={step.error}
				pathCopyNodeId={step.nodeId}
			/>
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
				<SectionHeading>Variables applied</SectionHeading>
				<p className="text-2xs text-muted-foreground">
					Values written to{" "}
					<code className="font-mono text-3xs">{"{{vars.*}}"}</code> for later
					nodes. Output below is the passthrough previous value.
				</p>
				<JsonPane value={variables} />
			</section>
			<section className="flex flex-col gap-2">
				<SectionHeading>Passthrough output</SectionHeading>
				{!step.error ? <JsonPane value={step.output} /> : null}
			</section>
			<section className="flex flex-col gap-2">
				<SectionHeading>Input</SectionHeading>
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
				<SectionHeading>Output</SectionHeading>
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
				<SectionHeading>Context</SectionHeading>
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
				<SectionHeading>Output</SectionHeading>
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
					<SectionHeading>Request</SectionHeading>
					<HttpRequestPanel
						request={httpOut?.request}
						upstreamInput={step.input}
					/>
				</section>
				<Separator />
				<section className="flex flex-col gap-2">
					<SectionHeading>Response</SectionHeading>
					<HttpResponsePanel
						output={step.output}
						error={step.error}
						pathCopyNodeId={step.nodeId}
					/>
				</section>
			</>
		);
	}

	switch (nodeType) {
		case "assert":
			return <AssertPanels step={step} />;
		case "if":
			return <IfPanels step={step} />;
		case "try":
			return <TryPanels step={step} />;
		case "foreach":
			return <ForeachPanels step={step} />;
		case "set":
			return <SetPanels step={step} node={node} />;
		case "bearer":
		case "basicAuth":
		case "apiKey":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Passthrough (credentials not echoed)"
					pathCopyNodeId={step.nodeId}
				/>
			);
		case "start":
			return <StartPanels step={step} />;
		case "extract":
		case "json":
		case "inspect":
		case "log":
		case "template":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					pathCopyNodeId={step.nodeId}
				/>
			);
		case "transform":
		case "merge":
		case "join":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Joined / merged / mapped result"
					pathCopyNodeId={step.nodeId}
				/>
			);
		case "input":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Run payload"
					pathCopyNodeId={step.nodeId}
				/>
			);
		case "output":
			return (
				<ResultWithInput
					result={step.output}
					input={step.input}
					error={step.error}
					resultLabel="Flow result"
					pathCopyNodeId={step.nodeId}
				/>
			);
		default:
			return <ConfigInputOutputPanels step={step} node={node} />;
	}
}

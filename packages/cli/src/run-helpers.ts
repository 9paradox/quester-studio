import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	type ExecuteFlowResult,
	FlowCancelledError,
	FlowExecutionError,
	RunFileLogger,
	collectSecretValues,
	createRunDirName,
	executeFlow,
} from "@quester-studio/engine";
import type { FlowV1, WorkspaceV1 } from "@quester-studio/schema";

export type RunReport = {
	ok: boolean;
	flowId: string;
	flowName?: string;
	env?: string;
	failedNodeId?: string;
	failedNodeType?: string;
	error?: string;
	cancelled?: boolean;
	runDir?: string;
	steps: ExecuteFlowResult["steps"];
	output?: unknown;
};

export function formatHumanFailure(report: RunReport): string {
	const lines: string[] = [];
	if (report.cancelled) {
		lines.push(`Cancelled: ${report.flowId}`);
	} else {
		lines.push(
			`Failed: ${report.flowId}${report.error ? ` — ${report.error}` : ""}`,
		);
	}
	if (report.failedNodeId) {
		lines.push(
			`  node: ${report.failedNodeId}${report.failedNodeType ? ` (${report.failedNodeType})` : ""}`,
		);
	}
	for (const step of report.steps) {
		const mark = step.error ? "✗" : "✓";
		lines.push(`  ${mark} ${step.type} (${step.nodeId})`);
		if (step.error) lines.push(`      ${step.error}`);
	}
	if (report.runDir) lines.push(`  runDir: ${report.runDir}`);
	return lines.join("\n");
}

export async function resolveRunLogger(options: {
	workspaceRoot: string;
	manifest?: WorkspaceV1 | null;
	flow: FlowV1;
	env?: string;
	secrets?: Record<string, unknown>;
	/** Explicit CLI path; empty string disables; undefined uses workspace setting. */
	runsDirFlag?: string;
	forceEnable?: boolean;
}): Promise<RunFileLogger | undefined> {
	const runs = options.manifest?.runs;
	const flag = options.runsDirFlag;
	let enabled = Boolean(runs?.enabled) || options.forceEnable === true;
	let relativeDir = runs?.dir ?? "runs";

	if (flag === "") return undefined;
	if (flag !== undefined) {
		enabled = true;
		relativeDir = flag;
	}
	if (!enabled) return undefined;

	const runsRoot = resolve(options.workspaceRoot, relativeDir);
	const runDir = join(runsRoot, options.flow.id, createRunDirName());
	await mkdir(runDir, { recursive: true });
	const logger = new RunFileLogger({
		runDir,
		secretValues: collectSecretValues(options.secrets),
		meta: {
			flowId: options.flow.id,
			flowName: options.flow.name,
			env: options.env,
			startedAt: new Date().toISOString(),
			status: "running",
		},
	});
	await logger.init();
	return logger;
}

export async function executeFlowWithLogging(
	flow: FlowV1,
	executeOpts: Parameters<typeof executeFlow>[1],
	logger: RunFileLogger | undefined,
): Promise<{ result?: ExecuteFlowResult; report: RunReport }> {
	try {
		const result = await executeFlow(flow, {
			...executeOpts,
			runLogger: logger,
		});
		const report: RunReport = {
			ok: true,
			flowId: flow.id,
			flowName: flow.name,
			runDir: result.runDir ?? logger?.runDir,
			steps: result.steps,
			output: result.output,
		};
		return { result, report };
	} catch (error) {
		if (error instanceof FlowCancelledError) {
			const report: RunReport = {
				ok: false,
				cancelled: true,
				flowId: flow.id,
				flowName: flow.name,
				error: error.message,
				runDir: error.partial.runDir ?? logger?.runDir,
				steps: error.partial.steps,
			};
			return { report };
		}
		if (error instanceof FlowExecutionError) {
			const report: RunReport = {
				ok: false,
				flowId: flow.id,
				flowName: flow.name,
				failedNodeId: error.failedNodeId,
				failedNodeType: error.failedNodeType,
				error: error.message,
				runDir: error.partial.runDir ?? logger?.runDir,
				steps: error.partial.steps,
			};
			return { report };
		}
		throw error;
	}
}

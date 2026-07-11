import type { ExecuteFlowResult } from "@quester/engine";

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
	return (
		<aside className="flex w-72 shrink-0 flex-col border-l bg-gray-50">
			<div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
				Run
			</div>
			<div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium text-gray-700">Environment</span>
					<select
						value={selectedEnv}
						onChange={(e) => onEnvChange(e.target.value)}
						className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
					>
						{envs.length === 0 ? (
							<option value="local">local</option>
						) : (
							envs.map((env) => (
								<option key={env} value={env}>
									{env}
								</option>
							))
						)}
					</select>
				</label>

				<label className="flex flex-1 flex-col gap-1 text-sm">
					<span className="font-medium text-gray-700">Input (JSON)</span>
					<textarea
						value={inputJson}
						onChange={(e) => onInputChange(e.target.value)}
						className="min-h-28 flex-1 resize-none rounded border border-gray-300 bg-white p-2 font-mono text-xs"
						spellCheck={false}
					/>
					{inputError ? (
						<span className="text-xs text-red-600">{inputError}</span>
					) : null}
				</label>

				<button
					type="button"
					onClick={onRun}
					disabled={isRunning || !selectedFlowId}
					className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isRunning ? "Running…" : "Run"}
				</button>

				{runError ? (
					<div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
						{runError}
					</div>
				) : null}

				{runResult ? (
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-1 text-sm">
							<span className="font-medium text-gray-700">Output</span>
							<pre className="max-h-48 overflow-auto rounded border border-gray-200 bg-white p-2 font-mono text-xs">
								{JSON.stringify(runResult.output, null, 2)}
							</pre>
						</div>
						<details className="text-sm">
							<summary className="cursor-pointer font-medium text-gray-700">
								Node outputs
							</summary>
							<pre className="mt-1 max-h-40 overflow-auto rounded border border-gray-200 bg-white p-2 font-mono text-xs">
								{JSON.stringify(runResult.nodeOutputs, null, 2)}
							</pre>
						</details>
					</div>
				) : null}
			</div>
		</aside>
	);
}

export { DEFAULT_INPUT };

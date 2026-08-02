import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type RunStepLog = {
	seq: number;
	nodeId: string;
	type: string;
	input: unknown;
	processedInput: unknown;
	output: unknown;
	error?: string | null;
};

export type RunMeta = {
	flowId: string;
	flowName?: string;
	env?: string;
	startedAt: string;
	finishedAt?: string;
	status: "running" | "success" | "failed" | "cancelled";
	failedNodeId?: string;
	error?: string;
};

export type RunFileLoggerOptions = {
	/** Absolute path to this run's directory. */
	runDir: string;
	/** Secret string values to redact from written JSON. */
	secretValues?: string[];
};

const AUTH_HEADER = /^authorization$/i;

function filesystemTimestamp(d = new Date()): string {
	return d
		.toISOString()
		.replace(/\.\d{3}Z$/, "Z")
		.replace(/:/g, "-");
}

export function createRunDirName(now = new Date()): string {
	return filesystemTimestamp(now);
}

/** Deep-clone JSON with secret values and Authorization headers redacted. */
export function redactForRunLog(
	value: unknown,
	secretValues: string[] = [],
): unknown {
	const secrets = secretValues.filter((s) => s.length > 0);
	const scrubString = (s: string): string => {
		let out = s;
		for (const secret of secrets) {
			if (secret && out.includes(secret)) {
				out = out.split(secret).join("***");
			}
		}
		return out;
	};

	const walk = (v: unknown, key?: string): unknown => {
		if (typeof v === "string") {
			if (key && AUTH_HEADER.test(key)) return "***";
			return scrubString(v);
		}
		if (Array.isArray(v)) return v.map((item) => walk(item));
		if (v && typeof v === "object") {
			const obj = v as Record<string, unknown>;
			const out: Record<string, unknown> = {};
			for (const [k, child] of Object.entries(obj)) {
				out[k] = walk(child, k);
			}
			return out;
		}
		return v;
	};

	return walk(value);
}

export function resolveTemplateDeep(
	value: unknown,
	resolveTemplate: (template: string) => string,
): unknown {
	if (typeof value === "string") {
		if (!value.includes("{{")) return value;
		return resolveTemplate(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => resolveTemplateDeep(item, resolveTemplate));
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, child] of Object.entries(value as Record<string, unknown>)) {
			out[k] = resolveTemplateDeep(child, resolveTemplate);
		}
		return out;
	}
	return value;
}

export class RunFileLogger {
	readonly runDir: string;
	#secretValues: string[];
	#seq = 0;
	#meta: RunMeta;

	constructor(options: RunFileLoggerOptions & { meta: RunMeta }) {
		this.runDir = options.runDir;
		this.#secretValues = options.secretValues ?? [];
		this.#meta = options.meta;
	}

	async init(): Promise<void> {
		await mkdir(this.runDir, { recursive: true });
		await this.#writeMeta();
	}

	async writeStep(
		step: Omit<RunStepLog, "seq"> & { seq?: number },
	): Promise<RunStepLog> {
		this.#seq += 1;
		const seq = step.seq ?? this.#seq;
		const record: RunStepLog = {
			seq,
			nodeId: step.nodeId,
			type: step.type,
			input: redactForRunLog(step.input, this.#secretValues),
			processedInput: redactForRunLog(step.processedInput, this.#secretValues),
			output: redactForRunLog(step.output, this.#secretValues),
			error: step.error ?? null,
		};
		const name = `${String(seq).padStart(3, "0")}-${sanitizeNodeId(step.nodeId)}.json`;
		await writeFile(
			join(this.runDir, name),
			`${JSON.stringify(record, null, 2)}\n`,
			"utf8",
		);
		return record;
	}

	async finish(
		patch: Pick<RunMeta, "status" | "failedNodeId" | "error">,
	): Promise<void> {
		this.#meta = {
			...this.#meta,
			...patch,
			finishedAt: new Date().toISOString(),
		};
		await this.#writeMeta();
	}

	async #writeMeta(): Promise<void> {
		await writeFile(
			join(this.runDir, "meta.json"),
			`${JSON.stringify(redactForRunLog(this.#meta, this.#secretValues), null, 2)}\n`,
			"utf8",
		);
	}
}

function sanitizeNodeId(nodeId: string): string {
	return nodeId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "node";
}

export function collectSecretValues(
	secrets: Record<string, unknown> | undefined,
): string[] {
	if (!secrets) return [];
	const out: string[] = [];
	for (const value of Object.values(secrets)) {
		if (typeof value === "string" && value.length > 0) out.push(value);
		else if (typeof value === "number" || typeof value === "boolean") {
			out.push(String(value));
		}
	}
	return out;
}

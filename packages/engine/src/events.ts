export type EngineEventMap = {
	"node:before": { nodeId: string; type: string; input: unknown };
	"node:after": {
		nodeId: string;
		type: string;
		input: unknown;
		output: unknown;
	};
	"node:error": {
		nodeId: string;
		type: string;
		input: unknown;
		error: unknown;
	};
	"flow:complete": { output: unknown };
};

type Handler<K extends keyof EngineEventMap> = (
	payload: EngineEventMap[K],
) => void;

export class EngineEventEmitter {
	#handlers = new Map<string, Set<Handler<never>>>();

	on<K extends keyof EngineEventMap>(event: K, handler: Handler<K>): void {
		const set = this.#handlers.get(event) ?? new Set();
		set.add(handler as Handler<never>);
		this.#handlers.set(event, set);
	}

	emit<K extends keyof EngineEventMap>(
		event: K,
		payload: EngineEventMap[K],
	): void {
		for (const handler of this.#handlers.get(event) ?? []) {
			(handler as Handler<K>)(payload);
		}
	}
}

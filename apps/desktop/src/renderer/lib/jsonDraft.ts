export type JsonDraftState = {
	text: string;
	error: string | null;
	/** Last successfully parsed value. */
	committed: unknown;
};

export function createJsonDraft(value: unknown): JsonDraftState {
	return {
		text: JSON.stringify(value, null, 2),
		error: null,
		committed: value,
	};
}

/**
 * Update draft text. Commits only when JSON parses successfully.
 * Invalid intermediate text is kept so controlled inputs stay editable.
 */
export function updateJsonDraft(
	state: JsonDraftState,
	text: string,
): JsonDraftState {
	try {
		const parsed: unknown = JSON.parse(text);
		return { text, error: null, committed: parsed };
	} catch (err) {
		return {
			text,
			error: err instanceof Error ? err.message : "Invalid JSON",
			committed: state.committed,
		};
	}
}

export function jsonDraftDidCommit(
	prev: JsonDraftState,
	next: JsonDraftState,
): boolean {
	return next.error === null && !Object.is(prev.committed, next.committed);
}

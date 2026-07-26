export type NamePromptOptions = {
	title: string;
	label?: string;
	description?: string;
	defaultValue?: string;
	confirmLabel?: string;
	placeholder?: string;
};

export type NamePromptRequest = NamePromptOptions & {
	resolve: (value: string | null) => void;
};

let current: NamePromptRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function getNamePromptRequest(): NamePromptRequest | null {
	return current;
}

export function subscribeNamePrompt(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Opens the shared name dialog; resolves trimmed name or `null` if cancelled. */
export function promptName(options: NamePromptOptions): Promise<string | null> {
	return new Promise((resolve) => {
		if (current) {
			current.resolve(null);
		}
		current = { ...options, resolve };
		emit();
	});
}

export function resolveNamePrompt(value: string | null) {
	if (!current) return;
	const { resolve } = current;
	current = null;
	emit();
	resolve(value === null ? null : value.trim() || null);
}

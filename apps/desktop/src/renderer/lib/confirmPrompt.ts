export type ConfirmPromptOptions = {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** When true, confirm button uses destructive styling. */
	destructive?: boolean;
};

export type ConfirmPromptRequest = ConfirmPromptOptions & {
	resolve: (value: boolean) => void;
};

let current: ConfirmPromptRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function getConfirmPromptRequest(): ConfirmPromptRequest | null {
	return current;
}

export function subscribeConfirmPrompt(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Opens the shared confirm dialog; resolves `true` if confirmed. */
export function promptConfirm(options: ConfirmPromptOptions): Promise<boolean> {
	return new Promise((resolve) => {
		if (current) {
			current.resolve(false);
		}
		current = { ...options, resolve };
		emit();
	});
}

export function resolveConfirmPrompt(value: boolean) {
	if (!current) return;
	const { resolve } = current;
	current = null;
	emit();
	resolve(value);
}

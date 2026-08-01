/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_QUESTER_API_URL?: string;
	readonly VITE_QUESTER_MODE?: "web" | "desktop";
	readonly VITE_QUESTER_CLIENT?: "http" | "mock";
	readonly VITE_QUESTER_USE_MOCK?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

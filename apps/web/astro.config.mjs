import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const base = process.env.BASE_PATH ?? "/quester-studio/";

export default defineConfig({
	site: "https://9paradox.com",
	base,
	vite: {
		plugins: [tailwindcss()],
	},
	markdown: {
		shikiConfig: {
			// Product tokens via CSS — see global.css --shiki-* (match desktop JsonViewer)
			theme: "css-variables",
		},
	},
	// Old Starlight /cli paths → unified docs
	redirects: {
		"/cli": "/docs/getting-started/",
		"/cli/getting-started": "/docs/getting-started/",
		"/cli/try": "/docs/try/",
		"/docs/nodes/basicAuth": "/docs/nodes/basic-auth/",
		"/docs/nodes/apiKey": "/docs/nodes/api-key/",
	},
});

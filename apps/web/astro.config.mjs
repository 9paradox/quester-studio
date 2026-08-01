import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const base = process.env.BASE_PATH ?? "/quester-studio/";

export default defineConfig({
	site: "https://9paradox.com",
	base,
	vite: {
		plugins: [tailwindcss()],
	},
	// Old Starlight /cli paths → unified docs
	redirects: {
		"/cli": "/docs/getting-started/",
		"/cli/getting-started": "/docs/getting-started/",
		"/cli/try": "/docs/try/",
	},
});

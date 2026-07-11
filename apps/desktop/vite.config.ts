import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type PluginOption, defineConfig } from "vite";

export default defineConfig({
	base: "./",
	root: resolve(__dirname, "src/renderer"),
	// Both plugins return Plugin[]; spread into one list. Cast aligns types when Bun
	// installs multiple hashed copies of the same vite version (astro vs desktop peers).
	plugins: [...react(), ...tailwindcss()] as PluginOption[],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src/renderer"),
		},
	},
	server: {
		host: "127.0.0.1",
		port: 5173,
		strictPort: true,
	},
	build: {
		outDir: resolve(__dirname, "dist/renderer"),
		emptyOutDir: true,
	},
});

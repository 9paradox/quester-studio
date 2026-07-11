import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	root: resolve(__dirname, "src/renderer"),
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src/renderer"),
		},
	},
	server: {
		port: 5173,
	},
	build: {
		outDir: resolve(__dirname, "dist/renderer"),
		emptyOutDir: true,
	},
});

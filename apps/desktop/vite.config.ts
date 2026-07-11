import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "./",
	root: resolve(__dirname, "src/renderer"),
	plugins: [react()],
	server: {
		port: 5173,
	},
	build: {
		outDir: resolve(__dirname, "dist/renderer"),
		emptyOutDir: true,
	},
});

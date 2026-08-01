import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, type PluginOption, defineConfig, loadEnv } from "vite";

function webIndexPlugin(): Plugin {
	return {
		name: "quester-web-index",
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				if (req.url === "/" || req.url?.startsWith("/index.html")) {
					req.url = "/index.web.html";
				}
				next();
			});
		},
	};
}

/** Vite SPA against @quester-studio/api — or in-memory mock when mode=mock. */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, resolve(__dirname), ["VITE_"]);
	const useMock =
		mode === "mock" ||
		env.VITE_QUESTER_CLIENT === "mock" ||
		env.VITE_QUESTER_USE_MOCK === "1" ||
		env.VITE_QUESTER_USE_MOCK === "true";

	return {
		base: "/",
		root: resolve(__dirname, "src/renderer"),
		envDir: resolve(__dirname),
		plugins: [webIndexPlugin(), ...react(), ...tailwindcss()] as PluginOption[],
		resolve: {
			alias: {
				"@": resolve(__dirname, "src/renderer"),
				"electrobun/view": resolve(
					__dirname,
					"src/renderer/lib/electrobun-web-stub.ts",
				),
			},
		},
		define: {
			"import.meta.env.VITE_QUESTER_MODE": JSON.stringify("web"),
			"import.meta.env.VITE_QUESTER_CLIENT": JSON.stringify(
				useMock ? "mock" : "http",
			),
			"import.meta.env.VITE_QUESTER_USE_MOCK": JSON.stringify(
				useMock ? "1" : "",
			),
			"import.meta.env.VITE_QUESTER_API_URL": JSON.stringify(
				env.VITE_QUESTER_API_URL ||
					process.env.VITE_QUESTER_API_URL ||
					"http://127.0.0.1:8787",
			),
		},
		envPrefix: ["VITE_"],
		server: {
			host: "127.0.0.1",
			port: 5173,
			strictPort: true,
			fs: {
				allow: [resolve(__dirname), resolve(__dirname, "../..")],
			},
		},
		build: {
			outDir: resolve(__dirname, "dist/renderer-web"),
			emptyOutDir: true,
			rollupOptions: {
				input: resolve(__dirname, "src/renderer/index.web.html"),
			},
		},
	};
});

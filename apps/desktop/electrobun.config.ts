import type { ElectrobunConfig } from "electrobun/bun";

export default {
	app: {
		name: "Quester",
		identifier: "dev.quester.app",
		version: "0.1.0",
	},
	build: {
		useAsar: true,
		bun: {
			entrypoint: "src/main/index.ts",
			external: [],
		},
		views: {},
		copy: {
			"dist/renderer/index.html": "views/mainview/index.html",
			"dist/renderer/assets/": "views/mainview/assets/",
		},
		watchIgnore: ["dist/**"],
		mac: {
			codesign: false,
			notarize: false,
			bundleCEF: false,
			entitlements: {},
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
	release: {
		baseUrl: "",
	},
} satisfies ElectrobunConfig;

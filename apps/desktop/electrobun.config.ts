import type { ElectrobunConfig } from "electrobun/bun";

export default {
	app: {
		name: "Quester",
		identifier: "com.9paradox.quester",
		version: "0.6.0",
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
			"assets/quester-logo-32.png": "views/mainview/quester-logo-32.png",
			"assets/icon.ico": "Resources/app.ico",
			"bundled/sample-workspace/": "Resources/sample-workspace/",
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
			icon: "assets/quester-logo.png",
		},
		win: {
			bundleCEF: false,
			icon: "assets/icon.ico",
		},
	},
	release: {
		baseUrl: "",
	},
} satisfies ElectrobunConfig;

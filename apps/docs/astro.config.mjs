import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
	base,
	integrations: [
		starlight({
			title: "Quester Docs",
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/9paradox/quester-studio",
				},
			],
			sidebar: [
				{
					label: "Start",
					items: [
						"getting-started",
						"contributing",
						"workspace-secrets",
						"roadmap",
					],
				},
			],
		}),
	],
});

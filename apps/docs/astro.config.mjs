import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
	site: "https://9paradox.com",
	base,
	integrations: [
		starlight({
			title: "Quester Studio CLI",
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/9paradox/quester-studio",
				},
			],
			customCss: ["./src/styles/diagrams.css"],
			sidebar: [
				{
					label: "Start",
					items: [
						"try",
						"getting-started",
						"concepts",
						"contributing",
						"roadmap",
					],
				},
				{
					label: "Workspace",
					items: ["workspace", "workspace-secrets", "collections", "templates"],
				},
				{
					label: "Nodes",
					autogenerate: { directory: "nodes" },
				},
			],
		}),
	],
});

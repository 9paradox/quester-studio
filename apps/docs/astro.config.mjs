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
			sidebar: [
				{
					label: "Start",
					items: ["try", "getting-started", "contributing", "roadmap"],
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

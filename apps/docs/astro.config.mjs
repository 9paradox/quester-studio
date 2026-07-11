import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Quester Docs",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/9paradox/quester-studio" }],
    }),
  ],
});

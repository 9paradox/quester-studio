import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";

plugin({
	name: "css-as-empty-module",
	setup(build) {
		build.onLoad({ filter: /\.css$/ }, () => ({
			contents: "export default {};",
			loader: "js",
		}));
	},
});

GlobalRegistrator.register();

// Base UI / ScrollArea expect Web Animations API; Happy DOM lacks it.
if (typeof Element !== "undefined" && !Element.prototype.getAnimations) {
	Element.prototype.getAnimations = () => [];
}
if (typeof Document !== "undefined" && !Document.prototype.getAnimations) {
	Document.prototype.getAnimations = () => [];
}

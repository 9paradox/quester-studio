/**
 * Inject standardized port diagrams into node doc pages.
 * Run: bun apps/web/scripts/inject-node-diagrams.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE_PORTS, portSvg } from "./diagram-kit.ts";

const nodesDir = join(import.meta.dir, "../src/content/docs/nodes");
const MARK_START = "<!-- qs-ports:start -->";
const MARK_END = "<!-- qs-ports:end -->";

function stripOldPorts(body: string): string {
	return body.replace(
		new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`, "m"),
		"",
	);
}

function scrubPreviousWording(body: string): string {
	return body
		.replace(/qs-callout-mistakes/g, "qs-callout qs-callout-warn")
		.replace(
			/In a \*\*templated\*\* field on another node you may write `\{\{previous\.body\.id\}\}`\. /g,
			"",
		)
		.replace(/`\{\{previous\.[^`]+\}`/g, "`{{nodes.<id>…}}`")
		.replace(/\{\{previous\.\*?\}/g, "{{nodes.<id>}}")
		.replace(/ — not `\{\{previous…\}\}`/g, "")
		.replace(/not `\{\{previous…\}\}`\.?/g, "");
}

for (const name of readdirSync(nodesDir)) {
	if (!name.endsWith(".md")) continue;
	const type = name.replace(/\.md$/, "");
	if (!(type in NODE_PORTS)) {
		console.log("skip", type);
		continue;
	}

	const file = join(nodesDir, name);
	const cleaned = scrubPreviousWording(
		stripOldPorts(readFileSync(file, "utf8")),
	);
	const heading = cleaned.search(/\r?\n## /);
	if (heading === -1) {
		console.log("no-heading", type);
		continue;
	}
	const block = `${MARK_START}\n${portSvg(type, type)}\n${MARK_END}\n\n`;
	const next = `${cleaned.slice(0, heading)}\n\n${block}${cleaned.slice(heading).replace(/^\r?\n/, "")}`;
	writeFileSync(file, next);
	console.log("updated", type);
}

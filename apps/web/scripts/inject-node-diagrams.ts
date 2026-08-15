/**
 * Inject standardized port / frame diagrams into node doc pages.
 * Run: bun apps/web/scripts/inject-node-diagrams.ts
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NODE_PORTS, frameSvg, portSvg } from "./diagram-kit.ts";

const here = dirname(fileURLToPath(import.meta.url));
const nodesDir = join(here, "../src/content/docs/nodes");
const MARK_PORTS_START = "<!-- qs-ports:start -->";
const MARK_PORTS_END = "<!-- qs-ports:end -->";
const MARK_FRAME_START = "<!-- qs-frame:start -->";
const MARK_FRAME_END = "<!-- qs-frame:end -->";

const FRAMED = new Set(["try", "foreach"]);

function stripBlock(body: string, start: string, end: string): string {
	return body.replace(new RegExp(`${start}[\\s\\S]*?${end}\\n?`, "m"), "");
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
		stripBlock(
			stripBlock(readFileSync(file, "utf8"), MARK_PORTS_START, MARK_PORTS_END),
			MARK_FRAME_START,
			MARK_FRAME_END,
		),
	);

	const heading = cleaned.search(/\r?\n## /);
	if (heading === -1) {
		console.log("no-heading", type);
		continue;
	}

	const portBlock = FRAMED.has(type)
		? ""
		: `${MARK_PORTS_START}\n${portSvg(type, type)}\n${MARK_PORTS_END}\n\n`;
	const frameBlock = FRAMED.has(type)
		? `${MARK_FRAME_START}\n${frameSvg(type as "try" | "foreach", type)}\n${MARK_FRAME_END}\n\n`
		: "";

	const next = `${cleaned.slice(0, heading)}\n\n${portBlock}${frameBlock}${cleaned.slice(heading).replace(/^\r?\n/, "")}`;
	writeFileSync(file, next);
	console.log("updated", type);
}

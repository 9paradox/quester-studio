import { CodeEditor } from "@/components/CodeEditor.js";
import { JsonPane } from "@/components/JsonPane.js";
import {
	ErrorAlert,
	HeadersTable,
	MetaChip,
	formatByteSize,
	statusVariant,
} from "@/components/response/shared.js";
import { isHttpOutput } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { ResponseViewerSnapshot } from "@/lib/editorTabs.js";
import { formatResponseRawText } from "@/lib/formatResponseRaw.js";
import { useMemo } from "react";

type ResponseViewerPageProps = {
	snapshot: ResponseViewerSnapshot;
};

/** Full-bleed frozen response viewer (Body / Headers / Raw). */
export function ResponseViewerPage({ snapshot }: ResponseViewerPageProps) {
	const http = isHttpOutput(snapshot.output) ? snapshot.output : null;
	const raw = useMemo(
		() =>
			formatResponseRawText(
				http?.body ?? (http ? undefined : snapshot.output),
				http?.text,
			),
		[http, snapshot.output],
	);

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-medium">{snapshot.title}</h1>
					{snapshot.subtitle ? (
						<p className="truncate font-mono text-2xs text-muted-foreground">
							{snapshot.subtitle}
						</p>
					) : null}
				</div>
				<Badge variant="outline">{snapshot.source}</Badge>
				{http?.status !== undefined ? (
					<Badge variant={statusVariant(http.status)}>
						{http.status}
						{http.statusText ? ` ${http.statusText}` : ""}
					</Badge>
				) : null}
				{http?.timing ? (
					<MetaChip label="Time" value={`${http.timing.durationMs} ms`} />
				) : null}
				{http?.size !== undefined ? (
					<MetaChip label="Size" value={formatByteSize(http.size)} />
				) : null}
			</div>

			<div className="flex min-h-0 flex-1 flex-col p-4">
				{snapshot.error ? (
					<div className="mb-3 shrink-0">
						<ErrorAlert title="Request failed" message={snapshot.error} />
					</div>
				) : null}

				{http && http.status !== undefined ? (
					<Tabs
						defaultValue="body"
						className="flex min-h-0 flex-1 flex-col gap-2"
					>
						<TabsList
							variant="line"
							className="h-8 w-fit shrink-0 justify-start"
						>
							<TabsTrigger value="body" className="text-xs">
								Body
							</TabsTrigger>
							<TabsTrigger value="headers" className="text-xs">
								Headers
							</TabsTrigger>
							<TabsTrigger value="raw" className="text-xs">
								Raw
							</TabsTrigger>
						</TabsList>
						<TabsContent
							value="body"
							className="mt-0 min-h-0 flex-1 overflow-auto"
						>
							<JsonPane
								value={http.body}
								defaultExpandedDepth={2}
								showRaw={false}
								pathCopyNodeId={snapshot.pathCopyNodeId}
								pathPrefix="body"
								className="min-h-0"
							/>
						</TabsContent>
						<TabsContent
							value="headers"
							className="mt-0 min-h-0 flex-1 overflow-auto"
						>
							<HeadersTable headers={http.headers ?? {}} />
						</TabsContent>
						<TabsContent
							value="raw"
							className="mt-0 flex min-h-0 flex-1 flex-col"
						>
							<CodeEditor
								value={raw}
								readOnly
								language="json"
								variant="document"
								completionMode="none"
								lint={false}
								minHeight="100%"
								className="min-h-0 flex-1 overflow-auto"
								ariaLabel="Response raw body"
							/>
						</TabsContent>
					</Tabs>
				) : !snapshot.error ? (
					<div className="min-h-0 flex-1 overflow-auto">
						<JsonPane
							value={snapshot.output}
							defaultExpandedDepth={2}
							pathCopyNodeId={snapshot.pathCopyNodeId}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}

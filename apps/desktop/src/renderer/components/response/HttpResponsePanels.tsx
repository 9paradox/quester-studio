import { JsonPane } from "@/components/JsonPane.js";
import {
	ErrorAlert,
	HeadersTable,
	MetaChip,
	formatByteSize,
	statusVariant,
} from "@/components/response/shared.js";
import type {
	HttpOutputShape,
	HttpRequestSnapshot,
} from "@/components/response/types.js";
import { isHttpOutput } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";

export function HttpRequestPanel({
	request,
	upstreamInput,
}: {
	request: HttpRequestSnapshot | undefined;
	upstreamInput: unknown;
}) {
	if (!request) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					Upstream input (previous node)
				</p>
				<JsonPane value={upstreamInput} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{request.method}</Badge>
				<code className="min-w-0 flex-1 break-all font-mono text-[11px]">
					{request.url}
				</code>
			</div>
			<Tabs defaultValue="headers">
				<TabsList variant="line" className="h-8 w-full justify-start">
					<TabsTrigger value="headers" className="text-xs">
						Headers
					</TabsTrigger>
					<TabsTrigger value="body" className="text-xs">
						Body
					</TabsTrigger>
					<TabsTrigger value="upstream" className="text-xs">
						Upstream
					</TabsTrigger>
				</TabsList>
				<TabsContent value="headers" className="mt-2">
					<HeadersTable headers={request.headers} />
				</TabsContent>
				<TabsContent value="body" className="mt-2">
					{request.body !== undefined ? (
						<JsonPane value={request.body} />
					) : (
						<p className="text-xs text-muted-foreground italic">No body</p>
					)}
				</TabsContent>
				<TabsContent value="upstream" className="mt-2">
					<JsonPane value={upstreamInput} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export function HttpResponsePanel({
	output,
	error,
}: {
	output: unknown;
	error?: string;
}) {
	const http: HttpOutputShape | null = isHttpOutput(output) ? output : null;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-2">
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

			{error ? <ErrorAlert title="Request failed" message={error} /> : null}

			{http && http.status !== undefined ? (
				<Tabs defaultValue="body">
					<TabsList variant="line" className="h-8 w-full justify-start">
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
					<TabsContent value="body" className="mt-2">
						<JsonPane
							value={http.body}
							defaultExpandedDepth={4}
							showRaw={false}
						/>
					</TabsContent>
					<TabsContent value="headers" className="mt-2">
						<HeadersTable headers={http.headers ?? {}} />
					</TabsContent>
					<TabsContent value="raw" className="mt-2">
						<pre className="max-h-80 overflow-auto rounded-md border bg-muted/20 p-2.5 font-mono text-[11px] leading-5 break-all whitespace-pre-wrap">
							{http.text ?? ""}
						</pre>
					</TabsContent>
				</Tabs>
			) : !error ? (
				<JsonPane value={output} />
			) : null}
		</div>
	);
}

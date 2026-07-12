import { HeadersEditor } from "@/components/HeadersEditor.js";
import { JsonViewer } from "@/components/JsonViewer.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import { Textarea } from "@/components/ui/textarea.js";
import { cn } from "@/lib/utils.js";
import type { RequestV1 } from "@quester/schema";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExecuteRequestRpcResult } from "../../shared/rpc.js";
import { ResizeGutter, clamp } from "./ResizeGutter.js";

const METHODS = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
] as const;

const PANE_PCT_KEY = "quester.requestPanePct";
const DEFAULT_PANE_PCT = 50;
const STACK_BREAKPOINT = 720;

type HttpOutputShape = {
	status?: number;
	statusText?: string;
	headers?: Record<string, string>;
	body?: unknown;
	text?: string;
	timing?: { durationMs: number };
	size?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asHttpOutput(value: unknown): HttpOutputShape | null {
	return isRecord(value) && ("status" in value || "request" in value)
		? (value as HttpOutputShape)
		: null;
}

function readPanePct(): number {
	try {
		const raw = localStorage.getItem(PANE_PCT_KEY);
		if (raw == null) return DEFAULT_PANE_PCT;
		const value = Number(raw);
		if (Number.isFinite(value)) return clamp(value, 20, 80);
	} catch {
		/* ignore */
	}
	return DEFAULT_PANE_PCT;
}

type RequestEditorProps = {
	request: RequestV1;
	envs: string[];
	selectedEnv: string;
	onEnvChange: (env: string) => void;
	onChange: (request: RequestV1) => void;
	onSend: () => void;
	isSending: boolean;
	result: ExecuteRequestRpcResult | null;
	error: string | null;
};

export function RequestEditor({
	request,
	envs,
	selectedEnv,
	onEnvChange,
	onChange,
	onSend,
	isSending,
	result,
	error,
}: RequestEditorProps) {
	const http = asHttpOutput(result?.httpOutput);
	const bodyText =
		typeof request.body === "string"
			? request.body
			: request.body !== undefined
				? JSON.stringify(request.body, null, 2)
				: "";

	const responseBody =
		http?.body !== undefined
			? http.body
			: http?.text !== undefined
				? http.text
				: null;

	const containerRef = useRef<HTMLDivElement>(null);
	const [requestPct, setRequestPct] = useState(readPanePct);
	const [stacked, setStacked] = useState(false);

	useEffect(() => {
		const el = containerRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width ?? el.clientWidth;
			setStacked(width < STACK_BREAKPOINT);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(PANE_PCT_KEY, String(requestPct));
		} catch {
			/* ignore */
		}
	}, [requestPct]);

	const onResizePane = useCallback(
		(delta: number) => {
			const el = containerRef.current;
			if (!el) return;
			const total = stacked ? el.clientHeight : el.clientWidth;
			if (total <= 0) return;
			// Vertical gutter: drag right grows request. Horizontal gutter reports
			// inverted Y delta, so drag down should grow the top (request) pane.
			const signed = stacked ? -delta : delta;
			setRequestPct((pct) => clamp(pct + (signed / total) * 100, 20, 80));
		},
		[stacked],
	);

	return (
		<div className="flex h-full min-h-0 flex-col bg-background">
			<div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
				<Select
					value={request.method}
					onValueChange={(v) => {
						if (v && METHODS.includes(v as (typeof METHODS)[number])) {
							onChange({
								...request,
								method: v as RequestV1["method"],
							});
						}
					}}
				>
					<SelectTrigger className="h-7 w-[100px] shrink-0">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{METHODS.map((m) => (
							<SelectItem key={m} value={m}>
								{m}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input
					value={request.url}
					onChange={(e) => onChange({ ...request, url: e.target.value })}
					placeholder="https://…"
					className="h-7 min-w-0 flex-1 font-mono text-xs"
				/>
				{envs.length > 0 ? (
					<Select
						value={selectedEnv}
						onValueChange={(v) => v && onEnvChange(v)}
					>
						<SelectTrigger className="h-7 w-[110px] shrink-0">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{envs.map((env) => (
								<SelectItem key={env} value={env}>
									{env}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				<Button
					type="button"
					size="sm"
					className="h-7 shrink-0 gap-1 px-2.5"
					onClick={onSend}
					disabled={isSending || !request.url.trim()}
				>
					<IconPlayerPlay className="size-3.5" data-icon="inline-start" />
					{isSending ? "Sending…" : "Send"}
				</Button>
			</div>

			<div
				ref={containerRef}
				className={cn("flex min-h-0 flex-1", stacked ? "flex-col" : "flex-row")}
			>
				<div
					className="flex min-h-0 min-w-0 flex-col overflow-hidden"
					style={{
						flex: `0 0 ${requestPct}%`,
					}}
				>
					<Tabs defaultValue="headers" className="flex min-h-0 flex-1 flex-col">
						<TabsList className="mx-3 mt-2 w-fit">
							<TabsTrigger value="headers">Headers</TabsTrigger>
							<TabsTrigger value="body">Body</TabsTrigger>
						</TabsList>
						<TabsContent
							value="headers"
							className="min-h-0 flex-1 overflow-auto px-3 pb-3"
						>
							<HeadersEditor
								headers={request.headers}
								onChange={(headers) => onChange({ ...request, headers })}
							/>
						</TabsContent>
						<TabsContent
							value="body"
							className="min-h-0 flex-1 overflow-auto px-3 pb-3"
						>
							<Textarea
								value={bodyText}
								onChange={(e) => {
									const raw = e.target.value;
									if (!raw.trim()) {
										const { body: _b, ...rest } = request;
										onChange(rest as RequestV1);
										return;
									}
									try {
										onChange({
											...request,
											body: JSON.parse(raw) as Record<string, unknown>,
										});
									} catch {
										onChange({ ...request, body: raw });
									}
								}}
								placeholder='{"key": "value"} or raw string'
								className="min-h-[200px] font-mono text-xs"
							/>
						</TabsContent>
					</Tabs>
				</div>

				<ResizeGutter
					orientation={stacked ? "horizontal" : "vertical"}
					onResize={onResizePane}
				/>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
						<span className="text-xs font-medium text-muted-foreground">
							Response
						</span>
						{http?.status !== undefined ? (
							<Badge variant="secondary">
								{http.status} {http.statusText ?? ""}
							</Badge>
						) : null}
						{http?.timing?.durationMs !== undefined ? (
							<span className="text-xs text-muted-foreground">
								{http.timing.durationMs} ms
							</span>
						) : null}
					</div>
					<ScrollArea className="min-h-0 flex-1">
						<div className="p-3">
							{error ? (
								<pre className="whitespace-pre-wrap text-xs text-destructive">
									{error}
								</pre>
							) : null}
							{!error && !http && !result ? (
								<p className="text-xs text-muted-foreground">
									Send a request to see the response
								</p>
							) : null}
							{http ? (
								<div className="flex flex-col gap-3">
									{http.headers ? (
										<div>
											<div className="mb-1 text-xs font-medium text-muted-foreground">
												Headers
											</div>
											<pre className="overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-[11px]">
												{Object.entries(http.headers)
													.map(([k, v]) => `${k}: ${v}`)
													.join("\n")}
											</pre>
										</div>
									) : null}
									<div>
										<div className="mb-1 text-xs font-medium text-muted-foreground">
											Body
										</div>
										<JsonViewer value={responseBody} defaultExpandedDepth={2} />
									</div>
								</div>
							) : null}
						</div>
					</ScrollArea>
				</div>
			</div>
		</div>
	);
}

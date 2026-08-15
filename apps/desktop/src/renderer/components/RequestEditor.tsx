import { CodeEditor } from "@/components/CodeEditor.js";
import { HeadersEditor } from "@/components/HeadersEditor.js";
import { TemplateField } from "@/components/TemplateField.js";
import { HttpResponsePanel } from "@/components/response/HttpResponsePanels.js";
import { Button } from "@/components/ui/button.js";
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
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import type { RequestV1 } from "@quester-studio/schema";
import { IconExternalLink, IconPlayerPlay } from "@tabler/icons-react";
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
	requestPath?: string;
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
	requestPath,
	envs,
	selectedEnv,
	onEnvChange,
	onChange,
	onSend,
	isSending,
	result,
	error,
}: RequestEditorProps) {
	const openResponseViewerTab = useQuesterStore((s) => s.openResponseViewerTab);
	const bodyText =
		typeof request.body === "string"
			? request.body
			: request.body !== undefined
				? JSON.stringify(request.body, null, 2)
				: "";

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

	const setBody = (raw: string) => {
		if (!raw.trim()) {
			const { body: _b, ...rest } = request;
			onChange(rest as RequestV1);
			return;
		}
		// Keep as string while editing — avoid JSON.parse on every keystroke.
		onChange({ ...request, body: raw });
	};

	const openInTab = () => {
		if (!result && !error) return;
		openResponseViewerTab(
			{
				source: "collection",
				title: `${request.name} response`,
				subtitle: requestPath ?? request.name,
				error,
				output: result?.httpOutput ?? null,
			},
			`collection:${requestPath ?? request.name}`,
		);
	};

	const hasResponse = Boolean(error || result);

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
					<SelectTrigger
						className="h-7 w-[100px] shrink-0"
						aria-label="HTTP method"
					>
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
				<TemplateField
					value={request.url}
					onChange={(url) => onChange({ ...request, url })}
					placeholder="https://… or {{env.API_BASE}}/…"
					className="h-7 min-w-0 flex-1"
					ariaLabel="Request URL"
				/>
				{envs.length > 0 ? (
					<Select
						value={selectedEnv}
						onValueChange={(v) => v && onEnvChange(v)}
					>
						<SelectTrigger
							className="h-7 w-[110px] shrink-0"
							aria-label="Environment"
						>
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
							<CodeEditor
								value={bodyText}
								onChange={setBody}
								language="json"
								variant="document"
								formatOnBlur
								completionMode="template"
								minHeight="12rem"
								placeholder='{"key": "value"} or raw string'
								ariaLabel="Request body"
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
						<div className="flex-1" />
						{hasResponse ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 gap-1.5 px-2 text-xs"
								onClick={openInTab}
							>
								<IconExternalLink className="size-3.5" />
								Open in tab
							</Button>
						) : null}
					</div>
					<div className="min-h-0 flex-1 overflow-auto p-3">
						{!error && !result ? (
							<p className="text-xs text-muted-foreground">
								Send a request to see the response
							</p>
						) : (
							<HttpResponsePanel
								output={result?.httpOutput}
								error={error ?? undefined}
								defaultExpandedDepth={2}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

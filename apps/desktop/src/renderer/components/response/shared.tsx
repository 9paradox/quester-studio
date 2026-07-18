import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.js";
import { IconAlertTriangle } from "@tabler/icons-react";

export function HeadersTable({ headers }: { headers: Record<string, string> }) {
	const entries = Object.entries(headers);
	if (entries.length === 0) {
		return <p className="text-xs text-muted-foreground italic">No headers</p>;
	}
	return (
		<div className="overflow-hidden rounded-md border">
			<table className="w-full text-left text-[11px]">
				<thead className="border-b bg-muted/40 text-muted-foreground">
					<tr>
						<th className="px-2 py-1.5 font-medium">Header</th>
						<th className="px-2 py-1.5 font-medium">Value</th>
					</tr>
				</thead>
				<tbody>
					{entries.map(([key, value]) => (
						<tr key={key} className="border-b border-border/60 last:border-0">
							<td className="break-all px-2 py-1.5 align-top font-mono font-medium">
								{key}
							</td>
							<td className="break-all px-2 py-1.5 align-top font-mono text-muted-foreground">
								{value}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function MetaChip({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1">
			<span className="text-[10px] tracking-wide text-muted-foreground uppercase">
				{label}
			</span>
			<span className="font-mono text-[11px] font-medium">{value}</span>
		</div>
	);
}

export function ErrorAlert({
	title = "Error",
	message,
}: {
	title?: string;
	message: string;
}) {
	return (
		<Alert variant="destructive">
			<IconAlertTriangle />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

export function formatByteSize(size: number): string {
	return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
}

export function statusVariant(
	status: number | undefined,
): "default" | "secondary" | "destructive" | "outline" {
	if (status === undefined) return "outline";
	if (status >= 200 && status < 300) return "secondary";
	if (status >= 400) return "destructive";
	return "outline";
}

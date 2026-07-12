import { Button } from "@/components/ui/button.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { IconDeviceFloppy, IconPlayerPlay } from "@tabler/icons-react";

type CanvasControlsProps = {
	envs: string[];
	selectedEnv: string;
	onEnvChange: (env: string) => void;
	isRunning: boolean;
	canRun: boolean;
	onRun: () => void;
	canSave: boolean;
	onSave: () => void;
};

export function CanvasControls({
	envs,
	selectedEnv,
	onEnvChange,
	isRunning,
	canRun,
	onRun,
	canSave,
	onSave,
}: CanvasControlsProps) {
	const envOptions = envs.length === 0 ? ["local"] : envs;

	return (
		<div className="pointer-events-none absolute right-3 top-3 z-10">
			<div className="pointer-events-auto flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] leading-none text-muted-foreground">
						Environment
					</span>
					<Select
						value={selectedEnv}
						onValueChange={(v) => v && onEnvChange(v)}
					>
						<SelectTrigger className="h-7 w-[100px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{envOptions.map((env) => (
								<SelectItem key={env} value={env}>
									{env}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{canSave ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3 h-7"
						onClick={onSave}
					>
						<IconDeviceFloppy data-icon="inline-start" />
						Save
					</Button>
				) : null}
				<Button
					type="button"
					size="sm"
					className="mt-3 h-7"
					onClick={onRun}
					disabled={isRunning || !canRun}
				>
					<IconPlayerPlay data-icon="inline-start" />
					{isRunning ? "Running…" : "Run"}
				</Button>
			</div>
		</div>
	);
}

import { Button } from "@/components/ui/button.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import {
	IconDeviceFloppy,
	IconPlayerPlay,
	IconPlayerStop,
} from "@tabler/icons-react";

type CanvasControlsProps = {
	envs: string[];
	selectedEnv: string;
	onEnvChange: (env: string) => void;
	isRunning: boolean;
	canRun: boolean;
	onRun: () => void;
	onStop: () => void;
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
	onStop,
	canSave,
	onSave,
}: CanvasControlsProps) {
	const envOptions = envs.length === 0 ? ["local"] : envs;

	return (
		<div className="pointer-events-none absolute right-3 top-3 z-10">
			<div className="pointer-events-auto flex items-end gap-2 rounded-md border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
				<div className="flex flex-col gap-0.5">
					<span
						id="canvas-env-label"
						className="text-3xs leading-none text-muted-foreground"
					>
						Environment
					</span>
					<Select
						value={selectedEnv}
						onValueChange={(v) => v && onEnvChange(v)}
					>
						<SelectTrigger
							className="h-7 w-[100px] text-xs"
							aria-labelledby="canvas-env-label"
						>
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
						className="h-7"
						onClick={onSave}
					>
						<IconDeviceFloppy data-icon="inline-start" />
						Save
					</Button>
				) : null}
				{isRunning ? (
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="h-7"
						onClick={onStop}
					>
						<IconPlayerStop data-icon="inline-start" />
						Stop
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						className="h-7"
						onClick={onRun}
						disabled={!canRun}
					>
						<IconPlayerPlay data-icon="inline-start" />
						Run
					</Button>
				)}
			</div>
		</div>
	);
}

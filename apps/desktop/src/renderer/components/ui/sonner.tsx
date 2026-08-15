import {
	IconAlertOctagon,
	IconAlertTriangle,
	IconCircleCheck,
	IconInfoCircle,
	IconLoader,
} from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function resolvedTheme(): ToasterProps["theme"] {
	if (typeof document === "undefined") return "system";
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function Toaster({ ...props }: ToasterProps) {
	return (
		<Sonner
			theme={resolvedTheme()}
			className="toaster group"
			icons={{
				success: <IconCircleCheck className="size-4" />,
				info: <IconInfoCircle className="size-4" />,
				warning: <IconAlertTriangle className="size-4" />,
				error: <IconAlertOctagon className="size-4" />,
				loading: (
					<IconLoader className="size-4 animate-spin motion-reduce:animate-none" />
				),
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };

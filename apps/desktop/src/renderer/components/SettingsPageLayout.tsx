import { focusRing } from "@/lib/focusRing.js";
import { cn } from "@/lib/utils.js";
import type { ReactNode } from "react";

export type SettingsCategory = {
	id: string;
	label: string;
};

type SettingsPageLayoutProps = {
	title: string;
	categories: SettingsCategory[];
	activeCategory: string;
	onCategoryChange: (id: string) => void;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	hideTitleBar?: boolean;
};

export function SettingsPageLayout({
	title,
	categories,
	activeCategory,
	onCategoryChange,
	children,
	footer,
	className,
	hideTitleBar = false,
}: SettingsPageLayoutProps) {
	return (
		<div
			className={cn(
				"flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background",
				className,
			)}
		>
			{hideTitleBar ? null : (
				<div className="flex items-center justify-between border-b border-border px-4 py-3">
					<h1 className="text-sm font-medium text-foreground">{title}</h1>
					{footer}
				</div>
			)}
			<div className="flex min-h-0 flex-1">
				<nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar p-2">
					{categories.map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => onCategoryChange(cat.id)}
							className={cn(
								focusRing,
								"rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
								activeCategory === cat.id
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
							)}
						>
							{cat.label}
						</button>
					))}
				</nav>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
			</div>
		</div>
	);
}

export function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="mb-8 flex max-w-xl flex-col gap-4">
			<h2 className="text-sm font-medium text-foreground">{title}</h2>
			{children}
		</section>
	);
}

export function SettingsField({
	label,
	htmlFor,
	description,
	children,
}: {
	label: string;
	htmlFor?: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
				{label}
			</label>
			{children}
			{description ? (
				<p className="text-xs text-muted-foreground">{description}</p>
			) : null}
		</div>
	);
}

---
name: shadcn-ui
description: >-
  Use shadcn/ui components, layouts, and preset styling in Quester Studio desktop
  UI. Use when adding or changing apps/desktop renderer UI, installing shadcn
  components, applying presets, or styling React components.
---

# shadcn/ui (Quester Desktop)

Desktop renderer at `apps/desktop` uses **shadcn/ui v4** with preset `b1D3m6L2` (style: `base-mira`, icons: Tabler, font: Geist).

## Rules

1. **Use shadcn components** — prefer `@/components/ui/*` over raw HTML + custom Tailwind.
2. **Use theme tokens** — `bg-background`, `text-foreground`, `bg-sidebar`, `text-muted-foreground`, `border-border`, etc. No hardcoded `gray-*` / `blue-*` unless required (e.g. React Flow canvas).
3. **Add via CLI** — never hand-copy component source from the web:

```bash
cd apps/desktop
npx shadcn@latest add <component> -y
```

4. **No custom UI primitives** — do not build bespoke buttons, inputs, selects, alerts, or cards when a shadcn component exists.
5. **Icons** — use `@tabler/icons-react` (preset icon library). Do not mix Lucide unless the preset changes.
6. **Layouts** — use shadcn layout patterns:
   - Side panels: `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`
   - Header: `bg-background` + `border-b` + `Separator`
   - Scrollable lists: `ScrollArea`
   - Errors: `Alert` with `variant="destructive"`
7. **Exceptions** — custom markup is allowed only for domain-specific UI (React Flow nodes/edges, canvas overlays) where no shadcn primitive fits.

## Project paths

| Item | Path |
|------|------|
| Config | `apps/desktop/components.json` |
| Components | `apps/desktop/src/renderer/components/ui/` |
| Utils | `apps/desktop/src/renderer/lib/utils.ts` (`cn()`) |
| Styles | `apps/desktop/src/renderer/styles.css` |
| Alias | `@/*` → `src/renderer/*` |

## Preset commands

```bash
# Bootstrap (first time only)
npx shadcn@latest init --preset b1D3m6L2 --no-monorepo -y -c apps/desktop

# Switch preset later (existing project)
npx shadcn@latest apply --preset <code> -c apps/desktop

# Theme/fonts only
npx shadcn@latest apply --preset <code> --only theme,font -c apps/desktop
```

## Stack notes

- **Tailwind v4** via `@tailwindcss/vite` (not PostCSS v3 pipeline)
- **Base UI** primitives (`@base-ui/react`) — shadcn v4 default for this preset
- Vite root is `src/renderer/` — aliases must point there

## Verify

```bash
bun run --filter @quester/desktop lint
bun run --filter @quester/desktop typecheck
bun run --filter @quester/desktop build
```

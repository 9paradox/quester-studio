/**
 * Focus ring for bespoke (non-shadcn) controls — canvas overlays, activity rails,
 * tab strips, resize gutters. Mirrors the `focus-visible:` treatment in
 * `components/ui/button.tsx` so keyboard focus looks identical app-wide.
 */
export const focusRing =
	"outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

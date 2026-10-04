// Mobile-first: unprefixed styles target the smallest viewport (a narrow
// phone) and `breakpoint.*` queries progressively add/override as space
// becomes available.
const BREAKPOINT_PX = {
	tablet: 768,
	desktop: 1024
};

// A landscape phone is often wider than 768px (~812px) but stays short, so
// width alone can't tell it apart from a landscape tablet/desktop. Gating
// `tablet`/`desktop` on height too keeps a short-but-wide phone on the mobile
// base styles.
const MIN_ROOMY_HEIGHT = 601;

export const breakpoint = {
	tablet: `(min-width: ${BREAKPOINT_PX.tablet}px) and (min-height: ${MIN_ROOMY_HEIGHT}px)`,
	desktop: `(min-width: ${BREAKPOINT_PX.desktop}px) and (min-height: ${MIN_ROOMY_HEIGHT}px)`,
	landscape: `(orientation: landscape)`,
	portrait: `(orientation: portrait)`
};

/** The three layouts this project tests (ANIMO.md, `playwright.config.ts`'s projects). */
export const VIEW_BREAKPOINTS = ["desktop", "mobileLandscape", "mobilePortrait"] as const;
export type ViewBreakpoint = (typeof VIEW_BREAKPOINTS)[number];

/** Which of `VIEW_BREAKPOINTS` a view falls into — the JS-side version of the `tablet`/`desktop` gate above,
 *  so canvas layout code (which can't use a CSS media query) still splits mobile landscape from desktop. */
export function viewBreakpoint(view: { width: number; height: number }): ViewBreakpoint {
	if (view.width < view.height) return "mobilePortrait";
	return view.width >= BREAKPOINT_PX.tablet && view.height >= MIN_ROOMY_HEIGHT ? "desktop" : "mobileLandscape";
}

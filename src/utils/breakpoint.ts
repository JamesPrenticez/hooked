import { useEffect, useState } from "react";

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

const TABLET = `(min-width: ${BREAKPOINT_PX.tablet}px) and (min-height: ${MIN_ROOMY_HEIGHT}px)`;
const DESKTOP = `(min-width: ${BREAKPOINT_PX.desktop}px) and (min-height: ${MIN_ROOMY_HEIGHT}px)`;

export const breakpoint = {
	tablet: TABLET,
	desktop: DESKTOP,
	landscape: `(orientation: landscape)`,
	portrait: `(orientation: portrait)`,
	// Tablet portrait keeps the phone-portrait layout.
	tabletLandscape: `${TABLET} and (orientation: landscape)`,
	// Tablet portrait picks up the desktop design.
	landscapeOrTablet: `(orientation: landscape), ${TABLET}`,
	desktopOrTabletPortrait: `${DESKTOP}, ${TABLET} and (orientation: portrait)`
};

// JS-side "is this viewport cramped" check: a plain boolean, not a CSS cascade, so it stays max-width/height based.
const MOBILE_MAX_WIDTH = `(max-width: ${BREAKPOINT_PX.tablet}px)`;
const SHORT_HEIGHT = `(max-height: ${MIN_ROOMY_HEIGHT - 1}px)`;

export const isPortrait = () => window.matchMedia(breakpoint.portrait).matches;

export const isLandscape = () => window.matchMedia(breakpoint.landscape).matches;

export type isMobileType = undefined | { landscape: boolean; portrait: boolean };

const getMobileState = (): isMobileType => {
	if (!window.matchMedia(`${MOBILE_MAX_WIDTH}, ${SHORT_HEIGHT}`).matches) return undefined;
	return { landscape: isLandscape(), portrait: isPortrait() };
};

export const useIsMobile = (): isMobileType => {
	const [state, setState] = useState<isMobileType>(getMobileState);

	useEffect(() => {
		const queries = [MOBILE_MAX_WIDTH, SHORT_HEIGHT, breakpoint.portrait].map(q => window.matchMedia(q));
		const update = () => setState(getMobileState());
		for (const q of queries) q.addEventListener("change", update);
		return () => {
			for (const q of queries) q.removeEventListener("change", update);
		};
	}, []);

	return state;
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

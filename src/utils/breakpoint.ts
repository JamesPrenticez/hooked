// Mobile-first: unprefixed styles target the smallest viewport (a narrow
// phone) and `breakpoint.*` queries progressively add/override as space
// becomes available.
const BREAKPOINT_PX = {
	tablet: "768px",
	desktop: "1024px"
};

// A landscape phone is often wider than 768px (~812px) but stays short, so
// width alone can't tell it apart from a landscape tablet/desktop. Gating
// `tablet`/`desktop` on height too keeps a short-but-wide phone on the mobile
// base styles.
const MIN_ROOMY_HEIGHT = "601px";

export const breakpoint = {
	tablet: `(min-width: ${BREAKPOINT_PX.tablet}) and (min-height: ${MIN_ROOMY_HEIGHT})`,
	desktop: `(min-width: ${BREAKPOINT_PX.desktop}) and (min-height: ${MIN_ROOMY_HEIGHT})`,
	landscape: `(orientation: landscape)`,
	portrait: `(orientation: portrait)`
};

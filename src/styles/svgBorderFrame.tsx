import styled from "styled-components";

import PanelSVG from "@assets/borders/svg-border.svg?raw";

// Accommodates the SVG not having a straight edge
export const FRAME_BLEED = "0.2rem";

export const SvgBorderFrame = styled.svg.attrs({
	viewBox: "0 0 467 506",
	preserveAspectRatio: "none",
	"aria-hidden": true,
	dangerouslySetInnerHTML: { __html: PanelSVG.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? "" }
})`
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
`;

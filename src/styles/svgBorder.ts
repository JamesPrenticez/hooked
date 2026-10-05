import { css } from "styled-components";

import PanelSVG from "@assets/borders/svg-border.svg?raw";

interface SvgBorderOptions {
	// Mirrors the border art left-to-right across a vertical axis (like
	// standing in front of a vertical mirror). panel.svg's path isn't
	// horizontally symmetric, so a plain CSS `transform: scaleX(-1)` on the
	// bordered element would also flip its children — this instead flips
	// the SVG source itself (wrapping the path in a <g> that scales/
	// translates within the same 0..467 coordinate space) before it's
	// embedded as the border-image, so only the border art mirrors.
	flipVertical?: boolean;
}

const flipPanelSvgVertical = (svg: string) =>
	svg.replace("<path", `<g transform="scale(-1,1) translate(-467,0)"><path`).replace("</svg>", "</g></svg>");

// border-image (9-slice) keeps the frame's border a constant thickness no
// matter how tall/wide the panel gets — a plain stretched background/mask
// would scale the two axes independently and blow the border out on tall
// panels (that's what made it look "fat" when auto-battle-modal's
// character-picker Panel used it as a plain full-bleed background).
export const svgBorderImage = (color: string, options?: SvgBorderOptions) => {
	const source = options?.flipVertical ? flipPanelSvgVertical(PanelSVG) : PanelSVG;
	return `url("data:image/svg+xml,${encodeURIComponent(source.replace("currentColor", color))}")`;
};

export const svgBorderStyles = (color: string = "#AB6535", options?: SvgBorderOptions) => css`
	border: 1rem solid transparent;
	border-image-source: ${svgBorderImage(color, options)};
	border-image-slice: 10 fill;
	border-image-repeat: stretch;
`;

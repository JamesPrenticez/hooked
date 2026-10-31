import { ComponentProps, useLayoutEffect } from "react";
import styled from "styled-components";

// CSS has no inset text-shadow. This renders the children twice: the visible
// copy inherits the caller's fill and outline, and an overlaid copy is run
// through an SVG inset-shadow filter — blur an offset copy of the glyph alpha,
// keep what falls OUTSIDE it, tint that, then clip the result back INSIDE the
// glyph. So every inside edge casts (the curves of an S), not just the top of
// the line box.
//
// Usage: wrap text in <InnerShadowText>. Font and colour come from the parent.
// The filter <defs> is shared by id, so it is appended to <body> once for the
// whole document instead of once per instance.

const Wrapper = styled.span`
	position: relative;
	display: inline-block;

	& > .inner-shadow {
		position: absolute;
		inset: 0;
		color: #000;
		text-shadow: none; /* text-shadow inherits; an outline would swamp the filter */
		filter: url(#inner-text-shadow);
	}
`;

const ensureFilter = () => {
	if (document.getElementById("inner-text-shadow")) return;

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "0");
	svg.setAttribute("height", "0");
	svg.setAttribute("aria-hidden", "true");
	svg.style.position = "absolute";
	svg.innerHTML = `
		<filter id="inner-text-shadow">
			<feOffset dy="3" in="SourceAlpha" />
			<feGaussianBlur stdDeviation="2" result="offset-blur" />
			<feComposite operator="out" in="SourceAlpha" in2="offset-blur" result="inverse" />
			<feFlood flood-color="rgba(0, 0, 0, 0.33)" result="color" />
			<feComposite operator="in" in="color" in2="inverse" result="shadow" />
			<feComposite operator="in" in="shadow" in2="SourceAlpha" />
		</filter>`;
	document.body.appendChild(svg);
};

export const InnerShadowText = ({ children, ...props }: ComponentProps<typeof Wrapper>) => {
	useLayoutEffect(ensureFilter, []);

	return (
		<Wrapper {...props}>
			<span className="inner-shadow" aria-hidden>
				{children}
			</span>
			{children}
		</Wrapper>
	);
};

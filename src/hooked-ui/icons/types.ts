import type { FunctionComponent, SVGProps } from "react";

/*
 * An icon is a plain <svg>, so every SVG prop passes through: size it with
 * `width`/`height`, colour it with `color` (the paths are `currentColor`).
 *
 * `title` gives the icon an accessible name — use it when the icon carries
 * meaning on its own, such as an icon-only button. Leave it off for a decorative
 * icon and pass `aria-hidden`, so a screen reader does not read it out twice
 * alongside a visible label.
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
	title?: string;
}

export type IconComponent = FunctionComponent<IconProps>;

import { type DetailsHTMLAttributes, forwardRef, type ReactNode } from "react";
import { ICONS } from "@icons";
import styled from "styled-components";

const Summary = styled.summary`
	align-items: center;
	cursor: pointer;
	display: flex;
	font-size: 1.6rem;
	justify-content: space-between;
	list-style: none;
	padding: 1.2rem 0;

	&::-webkit-details-marker {
		display: none;
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	svg {
		display: inline-flex;
		flex-shrink: 0;
		transition: transform 0.15s;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}
	}
`;

const Content = styled.div`
	padding-bottom: 1.2rem;
`;

const Details = styled.details`
	border-bottom: 1px solid var(--hooked-color-light-muted);
	color: var(--hooked-color-black);
	font-family: var(--hooked-font-primary);

	&[data-theme="dark"] {
		border-bottom-color: var(--hooked-color-dark-muted);
		color: var(--hooked-color-body);
	}

	&[open] summary svg {
		transform: rotate(180deg);
	}
`;

export interface AccordionProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "title"> {
	title: ReactNode;
	theme?: "dark" | "light";
}

/**
 * A collapsible section built on native `<details>`. Closed by default; pass
 * `open` to start expanded. Sections are independent, so any number can be
 * open at once.
 */
export const Accordion = forwardRef<HTMLDetailsElement, AccordionProps>(
	({ title, theme = "light", children, ...props }, ref) => {
		return (
			<Details ref={ref} data-theme={theme === "light" ? undefined : theme} {...props}>
				<Summary>
					{title}
					{ICONS.ChevronIcon}
				</Summary>
				<Content>{children}</Content>
			</Details>
		);
	}
);

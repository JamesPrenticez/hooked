import { type ButtonHTMLAttributes, forwardRef } from "react";
import styled from "styled-components";

const StyledButton = styled.button`
	/* primary — the default */
	align-items: center;
	background: var(--hooked-color-primary);
	border: none;
	border-radius: 0.8rem;
	color: var(--hooked-color-black);
	box-shadow: var(--hooked-button-shadow);
	cursor: pointer;
	display: inline-flex;
	flex-shrink: 0;
	font-family: var(--hooked-font-primary);
	font-size: 1.6rem;
	justify-content: center;
	padding: 1.2rem 2rem;
	transition: filter 0.15s;

	&:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	&:active:not(:disabled) {
		filter: brightness(0.9);
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		background: var(--hooked-button-disabled-bg-color);
		color: var(--hooked-color-grey);
		cursor: not-allowed;
		filter: none;
	}

	&[data-variant="secondary"] {
		background: var(--hooked-button-bg-color);
		border: 1px solid var(--hooked-border-color);
		color: var(--hooked-color-body);
	}

	&[data-variant="flat"] {
		background: var(--hooked-button-bg-color);
		border: none;
		color: var(--hooked-color-body);
		box-shadow: none;
	}

	&[data-variant="negative"] {
		background: var(--hooked-color-error-red);
		color: var(--hooked-color-white);
	}
`;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "negative" | "flat";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = "primary", ...props }, ref) => {
	return <StyledButton ref={ref} type="button" data-variant={variant === "primary" ? undefined : variant} {...props} />;
});

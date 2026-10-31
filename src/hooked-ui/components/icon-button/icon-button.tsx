import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import styled from "styled-components";

const StyledButton = styled.button`
	align-items: center;
	background: var(--hooked-button-bg-color);
	border: 1px solid transparent;
	border-radius: 0.8rem;
	color: var(--hooked-color-white);
	cursor: pointer;
	display: flex;
	flex-shrink: 0;
	font-size: 1.6rem;
	height: 4rem;
	justify-content: center;
	padding: 0;
	transition:
		background 0.15s,
		border-color 0.15s,
		color 0.15s;
	width: 4rem;

	&:hover:not(:disabled) {
		border-color: var(--hooked-color-primary);
		color: var(--hooked-color-primary);
	}

	&[aria-pressed="true"] {
		background: var(--hooked-color-white);
		color: var(--hooked-color-black);
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.3;
	}
`;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	icon: ReactNode;
	active?: boolean;
	"aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ icon, active, ...props }, ref) => {
	return (
		<StyledButton ref={ref} type="button" aria-pressed={active} {...props}>
			{icon}
		</StyledButton>
	);
});

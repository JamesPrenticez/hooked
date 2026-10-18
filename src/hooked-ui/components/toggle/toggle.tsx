import { type ButtonHTMLAttributes, forwardRef } from "react";
import styled from "styled-components";

const Thumb = styled.span`
	position: absolute;
	top: 0.2rem;
	left: 0.2rem;
	width: 2rem;
	height: 2rem;
	border-radius: 50%;
	background: var(--hooked-color-white);
	transition: left 0.18s;
	pointer-events: none;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
`;

const Track = styled.button`
	display: inline-flex;
	align-items: center;
	position: relative;
	flex-shrink: 0;
	width: 4.6rem;
	height: 2.4rem;
	padding: 0;
	border: none;
	border-radius: 1.2rem;
	background: var(--hooked-button-bg-color);
	cursor: pointer;
	transition: background 0.2s;

	&[aria-checked="true"] {
		background: var(--hooked-color-primary);
	}

	&[aria-checked="true"] ${Thumb} {
		left: 2.4rem;
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		background: var(--hooked-button-disabled-bg-color);
		cursor: not-allowed;
	}

	&:disabled ${Thumb} {
		background: var(--hooked-color-grey);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
`;

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	value: boolean;
	onValueChange: (value: boolean) => void;
	"aria-label"?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
	{ value, onValueChange, onClick, ...props },
	ref
) {
	return (
		<Track
			ref={ref}
			{...props}
			type="button"
			role="switch"
			aria-checked={value}
			onClick={event => {
				onClick?.(event);
				onValueChange(!value);
			}}
		>
			<Thumb />
		</Track>
	);
});

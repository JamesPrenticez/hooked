import { forwardRef, type InputHTMLAttributes } from "react";
import styled from "styled-components";

const Box = styled.span`
	width: 2.4rem;
	height: 2.4rem;
	border-radius: 0.4rem;
	border: 0.2rem solid var(--hooked-color-light-muted);
	box-sizing: border-box;
	display: flex;
	justify-content: center;
	align-items: center;

	svg {
		width: 1.4rem;
		height: 1.4rem;
		background: transparent;
		stroke: var(--hooked-color-black);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
		fill: none;
		pointer-events: none;
		transition:
			background 0.15s,
			border-color 0.15s;

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}
	}

	polyline {
		display: none;
	}
`;

const Input = styled.input`
	position: absolute;
	inset: 0;
	margin: 0;
	appearance: none;
	opacity: 0;
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}

	&:checked + ${Box} {
		border-color: var(--hooked-color-primary);
		background: var(--hooked-color-primary);

		polyline {
			display: block;
		}
	}

	&:focus-visible + ${Box} {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&:disabled + ${Box} svg {
		opacity: 0.3;
	}
`;

const Container = styled.label`
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	width: 2.4rem;
	height: 2.4rem;
	cursor: pointer;

	&[data-theme="dark"] ${Input}:not(:checked) + ${Box} {
		border-color: var(--hooked-color-dark-muted);
	}
`;

export interface CheckboxProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "checked" | "onChange" | "type"
> {
	value: boolean;
	onValueChange: (value: boolean) => void;
	theme?: "dark" | "light";
	"aria-label"?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
	({ value, onValueChange, theme = "light", ...props }, ref) => {
		return (
			<Container data-theme={theme === "light" ? undefined : theme}>
				<Input
					ref={ref}
					{...props}
					type="checkbox"
					checked={value}
					onChange={event => onValueChange(event.target.checked)}
				/>
				<Box>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<polyline points="4,13 9,18 20,6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Box>
			</Container>
		);
	}
);

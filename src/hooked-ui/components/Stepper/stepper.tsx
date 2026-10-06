import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import styled from "styled-components";

const Label = styled.span`
	font-size: 1.6rem;
	font-family: var(--hooked-font-primary);
	color: var(--hooked-color-grey);
	text-transform: uppercase;
	font-style: normal;
	line-height: 120%;
`;

const Value = styled.span`
	font-size: 2.8rem;
	font-family: var(--hooked-font-primary);
	font-style: normal;
	color: var(--hooked-color-white);
	line-height: 120%;
	text-transform: uppercase;
`;

const ValueBlock = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
	line-height: 150%;
	background: none;
	border: none;
	padding: 0;
	font-family: inherit;
	font-size: inherit;
	color: inherit;

	&[data-orientation="vertical"] {
		margin-right: 0.8rem;
		padding-left: 0.5rem;
		align-items: start;
	}

	&[data-orientation="horizontal"] {
		min-width: 7.2rem;
		text-align: center;
		align-items: center;

		${Label} {
			font-size: 1.2rem;
		}

		${Value} {
			font-size: 1.6rem;
		}
	}

	&:disabled {
		cursor: not-allowed;
	}

	&[data-clickable] {
		cursor: pointer;

		&:hover:not(:disabled) > * {
			opacity: 0.75;
		}
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}
`;

const Divider = styled.span`
	width: 40%;
	border-bottom: 1px solid var(--hooked-color-grey);
`;

const StepButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: 0;
	line-height: 1;

	background: transparent;
	border: none;
	color: var(--hooked-color-white);
	border-radius: 30%;
	font-family: var(--hooked-font-primary);
	cursor: pointer;

	&[data-orientation="vertical"] {
		width: 3.6rem;
		height: 3.6rem;
	}

	&[data-orientation="horizontal"] {
		background: color-mix(in srgb, var(--hooked-color-white) 10%, transparent);
		width: 3.2rem;
		height: 3.2rem;
		border-radius: 0.6rem;
		font-size: 1.6rem;
	}

	&:hover:not(:disabled) {
		border-color: var(--hooked-color-soft-accent);
		color: var(--hooked-color-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		background: var(--hooked-button-disabled-bg-color);
		border-color: var(--hooked-border-disabled-color);
		color: var(--hooked-color-grey);
		cursor: not-allowed;
	}
`;

const ButtonGroup = styled.div`
	display: flex;
	align-items: center;

	&[data-orientation="vertical"] {
		flex-direction: column;
		gap: 0.4rem;
	}
`;

const Container = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.8rem;

	background: var(--hooked-color-black);
	border-radius: 0.8rem;
	padding: 0.8rem;
	height: 100%;
	box-sizing: border-box;

	&[data-full-width] {
		width: 100%;
		flex: 1;
	}

	&[data-orientation="horizontal"] {
		border: 1px solid color-mix(in srgb, var(--hooked-color-white) 20%, transparent);
	}
`;

export interface StepperProps extends HTMLAttributes<HTMLDivElement> {
	orientation: "horizontal" | "vertical";
	label?: string;
	value: number;
	format: (value: number) => ReactNode;
	disabled: boolean;
	atMin: boolean;
	atMax: boolean;
	decLabel: string | ReactNode;
	incLabel: string | ReactNode;
	clickable: boolean;
	onIncrement: () => void;
	onDecrement: () => void;
	onValueClick: () => void;
	fullWidth?: boolean;
}

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
	(
		{
			orientation,
			label,
			value,
			format,
			disabled,
			atMin,
			atMax,
			decLabel,
			incLabel,
			clickable,
			onIncrement,
			onDecrement,
			onValueClick,
			fullWidth,
			...props
		},
		ref
	) => {
		const valueContent = (
			<>
				{label && <Label>{label}</Label>}
				<Value>{format(value)}</Value>
			</>
		);

		const valueBlock = clickable ? (
			<ValueBlock
				as="button"
				type="button"
				data-orientation={orientation}
				data-clickable=""
				disabled={disabled}
				onClick={onValueClick}
			>
				{valueContent}
			</ValueBlock>
		) : (
			<ValueBlock data-orientation={orientation}>{valueContent}</ValueBlock>
		);

		const decrementButton = (
			<StepButton type="button" data-orientation={orientation} disabled={disabled || atMin} onClick={onDecrement}>
				{decLabel}
			</StepButton>
		);

		const incrementButton = (
			<StepButton type="button" data-orientation={orientation} disabled={disabled || atMax} onClick={onIncrement}>
				{incLabel}
			</StepButton>
		);

		return (
			<Container ref={ref} data-full-width={fullWidth ? "" : undefined} data-orientation={orientation} {...props}>
				{orientation === "vertical" ? (
					<>
						{valueBlock}
						<ButtonGroup data-orientation="vertical">
							{incrementButton}
							<Divider />
							{decrementButton}
						</ButtonGroup>
					</>
				) : (
					<>
						{decrementButton}
						{valueBlock}
						{incrementButton}
					</>
				)}
			</Container>
		);
	}
);

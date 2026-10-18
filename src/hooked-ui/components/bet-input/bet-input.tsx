import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useImperativeHandle,
	useRef,
	useState
} from "react";
import { useClickOutside } from "@hooked-utils/use-click-outside";
import { ICONS } from "@icons";
import styled from "styled-components";

import { Stepper } from "../stepper/stepper";
import { StepperPopup } from "../stepper-popup/stepper-popup";

const Wrapper = styled.div`
	position: relative;
	width: 100%;
	height: 100%;

	&[data-full-width] {
		flex: 1;
		width: 100%;
	}
`;

const Chevron = styled.span`
	display: inline-flex;

	&[data-up] {
		transform: rotate(180deg);
	}
`;

export interface BetInputProps extends HTMLAttributes<HTMLDivElement> {
	orientation?: "horizontal" | "vertical";
	label?: string;
	value: number;
	increments: number[];
	onValueChange: (value: number) => void;
	format?: (value: number) => ReactNode;
	disabled?: boolean;
	decrementLabel?: string;
	incrementLabel?: string;
	close?: boolean;
	forceClose?: boolean;
	// Enables the quick-select popup, offering every value in `increments`.
	quickSelect?: boolean;
	// Renders the quick-select popup inline (inside the wrapper), animating
	// open like an accordion growing out of the input, instead of portaling it
	// to a fixed screen position.
	growFromInput?: boolean;
	// "up" (default) floats the popup above the input, out of flow. "push"
	// keeps it in normal flow, above the input, growing upward and pushing
	// the input (and everything after it) down as it opens.
	growDirection?: "up" | "push";
	// Stretches the stepper (and, in growFromInput mode, its wrapper) to fill
	// the width of its flex parent, instead of sizing to content.
	fullWidth?: boolean;
	clickOutside?: boolean;
}

export const BetInput = forwardRef<HTMLDivElement, BetInputProps>(
	(
		{
			orientation = "horizontal",
			label,
			value,
			increments,
			onValueChange,
			format = v => String(v),
			disabled = false,
			decrementLabel,
			incrementLabel,
			quickSelect = false,
			clickOutside = true,
			growFromInput = false,
			growDirection = "up",
			fullWidth = false,
			className,
			close = true,
			forceClose = false,
			...props
		},
		ref
	) => {
		const [isOpen, setIsOpen] = useState(false);
		const [anchor, setAnchor] = useState<{
			bottom: number;
			centerX: number;
		} | null>(null);

		const containerRef = useRef<HTMLDivElement>(null);
		useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

		useClickOutside(containerRef, () => {
			if (clickOutside) setIsOpen(false);
		});

		const isVertical = orientation === "vertical";
		const decLabel =
			decrementLabel ??
			(isVertical ? (
				<Chevron role="img" aria-label="reduce bet">
					{ICONS.ChevronIcon}
				</Chevron>
			) : (
				"−"
			));
		const incLabel =
			incrementLabel ??
			(isVertical ? (
				<Chevron role="img" aria-label="increase bet" data-up="">
					{ICONS.ChevronIcon}
				</Chevron>
			) : (
				"+"
			));

		const index = increments.indexOf(value);
		const atMin = index <= 0;
		const atMax = index >= increments.length - 1;
		useEffect(() => {
			if (forceClose) {
				setIsOpen(false);
			}
		}, [forceClose]);

		const handleDecrement = () => {
			const previous = increments[index - 1];
			if (index > 0 && previous !== undefined) onValueChange(previous);
		};

		const handleIncrement = () => {
			const next = increments[index + 1];
			if (index < increments.length - 1 && next !== undefined) onValueChange(next);
		};

		const handleValueClick = () => {
			if (disabled || !quickSelect) return;
			if (!growFromInput) {
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setAnchor({
					bottom: window.innerHeight - rect.top + 32,
					centerX: rect.left + rect.width / 2
				});
			}
			setIsOpen(prev => !prev);
		};

		const handleSelect = (v: number) => {
			onValueChange(v);
			setIsOpen(false);
		};

		const stepper = (
			<Stepper
				orientation={orientation}
				label={label}
				value={value}
				format={format}
				disabled={disabled}
				atMin={atMin}
				atMax={atMax}
				decLabel={decLabel}
				incLabel={incLabel}
				clickable={!disabled && quickSelect}
				onIncrement={handleIncrement}
				onDecrement={handleDecrement}
				onValueClick={handleValueClick}
				fullWidth={fullWidth}
			/>
		);

		const popup = quickSelect && (
			<StepperPopup
				label={label}
				values={increments}
				value={value}
				format={format}
				close={close}
				isOpen={isOpen}
				onValueSelect={handleSelect}
				onClose={() => setIsOpen(false)}
				growFromInput={growFromInput}
				growDirection={growDirection}
				anchor={anchor}
			/>
		);

		return (
			<Wrapper ref={containerRef} className={className} data-full-width={fullWidth ? "" : undefined} {...props}>
				{growFromInput ? (
					<>
						{popup}
						{stepper}
					</>
				) : (
					<>
						{stepper}
						{popup}
					</>
				)}
			</Wrapper>
		);
	}
);

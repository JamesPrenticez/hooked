import {
	forwardRef,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useImperativeHandle,
	useRef,
	useState
} from "react";

import styles from "./BetInput.module.css";
import { ChevronDownIcon, ChevronUpIcon } from "../../icons";
import { mergeClassNames } from "../../utils/mergeClassNames";
import { useClickOutside } from "../../utils/useClickOutside";
import { Stepper } from "../Stepper/Stepper";
import { StepperPopup } from "../StepperPopup/StepperPopup";

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

export const BetInput = forwardRef<HTMLDivElement, BetInputProps>(function BetInput(
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
) {
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
	const decLabel = decrementLabel ?? (isVertical ? <ChevronDownIcon aria-label="reduce bet" /> : "−");
	const incLabel = incrementLabel ?? (isVertical ? <ChevronUpIcon aria-label="reduce bet" /> : "+");

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
		<div
			ref={containerRef}
			className={mergeClassNames(styles.wrapper, className)}
			data-full-width={fullWidth ? "" : undefined}
			{...props}
		>
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
		</div>
	);
});

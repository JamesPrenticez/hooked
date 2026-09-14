import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import styles from "./Stepper.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

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

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(function Stepper(
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
		className,
		...props
	},
	ref
) {
	const valueContent = (
		<>
			{label && <span className={styles.label}>{label}</span>}
			<span className={styles.value}>{format(value)}</span>
		</>
	);

	const valueBlock = clickable ? (
		<button
			type="button"
			className={styles.valueBlock}
			data-orientation={orientation}
			data-clickable=""
			disabled={disabled}
			onClick={onValueClick}
		>
			{valueContent}
		</button>
	) : (
		<div className={styles.valueBlock} data-orientation={orientation}>
			{valueContent}
		</div>
	);

	const decrementButton = (
		<button
			type="button"
			className={styles.button}
			data-orientation={orientation}
			disabled={disabled || atMin}
			onClick={onDecrement}
		>
			{decLabel}
		</button>
	);

	const incrementButton = (
		<button
			type="button"
			className={styles.button}
			data-orientation={orientation}
			disabled={disabled || atMax}
			onClick={onIncrement}
		>
			{incLabel}
		</button>
	);

	return (
		<div
			ref={ref}
			className={mergeClassNames(styles.container, className)}
			data-full-width={fullWidth ? "" : undefined}
			data-orientation={orientation}
			{...props}
		>
			{orientation === "vertical" ? (
				<>
					{valueBlock}
					<div className={styles.buttonGroup} data-orientation="vertical">
						{incrementButton}
						<span className={styles.divider} />
						{decrementButton}
					</div>
				</>
			) : (
				<>
					{decrementButton}
					{valueBlock}
					{incrementButton}
				</>
			)}
		</div>
	);
});

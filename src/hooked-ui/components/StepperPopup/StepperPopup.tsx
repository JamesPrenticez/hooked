import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import styles from "./StepperPopup.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface StepperPopupProps extends HTMLAttributes<HTMLDivElement> {
	label?: string;
	values: number[];
	value: number;
	format: (value: number) => ReactNode;
	isOpen: boolean;
	onValueSelect: (value: number) => void;
	onClose: () => void;
	close?: boolean;
	growFromInput: boolean;
	growDirection: "up" | "push";
	anchor: { bottom: number; centerX: number } | null;
	portalRef?: RefObject<HTMLElement | null>;
}

export const StepperPopup = forwardRef<HTMLDivElement, StepperPopupProps>(function StepperPopup(
	{
		label,
		values,
		value,
		format,
		isOpen,
		onValueSelect,
		onClose,
		close = true,
		growFromInput,
		growDirection,
		anchor,
		className,
		portalRef,
		...props
	},
	ref
) {
	const body = (
		<>
			<div className={styles.header}>
				{label && <span className={styles.title}>{label.toUpperCase()}</span>}
				{close && (
					<button type="button" className={styles.close} onClick={onClose} aria-label="Close">
						✕
					</button>
				)}
			</div>
			<div className={styles.grid}>
				{values.map(v => (
					<button
						key={v}
						type="button"
						className={styles.option}
						aria-pressed={v === value}
						onClick={() => onValueSelect(v)}
					>
						{format(v)}
					</button>
				))}
			</div>
		</>
	);

	if (growFromInput) {
		return (
			<div
				ref={ref}
				className={mergeClassNames(styles.growTrack, className)}
				data-open={isOpen ? "" : undefined}
				data-direction={growDirection}
				{...props}
			>
				<div className={styles.growTrackInner}>
					<div
						className={mergeClassNames(styles.chrome, styles.growPopup)}
						data-direction={growDirection}
						data-ignore-click-away
					>
						{body}
					</div>
				</div>
			</div>
		);
	}

	if (!isOpen || !anchor) return null;

	return createPortal(
		<div
			ref={ref}
			className={mergeClassNames(styles.chrome, styles.popup, className)}
			style={
				{
					"--popup-bottom": `${anchor.bottom}px`,
					"--popup-left": `${anchor.centerX}px`
				} as CSSProperties
			}
			data-ignore-click-away
			{...props}
		>
			{body}
		</div>,
		portalRef?.current ?? document.body
	);
});

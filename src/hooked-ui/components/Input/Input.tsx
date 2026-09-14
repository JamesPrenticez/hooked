import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";

import styles from "./Input.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";
import { IconButton } from "../IconButton/IconButton";

type IconProps =
	| {
			/** Icon rendered in the button at the right edge of the field. */
			icon: ReactNode;
			/** Accessible name for the icon button. Required whenever `icon` is given. */
			iconLabel: string;
			/** Called when the icon button is pressed. */
			onIconClick: () => void;
	  }
	| { icon?: never; iconLabel?: never; onIconClick?: never };

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className"> & {
	/** Visible label above the field. */
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	/** Greys the field out and blocks both typing and the icon button. */
	disabled?: boolean;
	/** Text stays selectable, but cannot be edited. The icon button still works. */
	readOnly?: boolean;
	/** Merged onto the wrapper, so an instance can be sized or re-themed. */
	className?: string;
} & IconProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ label, value, onValueChange, icon, iconLabel, onIconClick, className, disabled, id, ...props },
	ref
) {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<div className={mergeClassNames(styles.wrapper, className)} data-disabled={disabled ? "" : undefined}>
			<label className={styles.label} htmlFor={inputId}>
				{label}
			</label>
			<div className={styles.field}>
				<input
					ref={ref}
					id={inputId}
					className={styles.input}
					disabled={disabled}
					value={value}
					onChange={event => onValueChange(event.target.value)}
					{...props}
				/>
				{icon && (
					<IconButton
						className={styles.iconButton}
						icon={icon}
						aria-label={iconLabel}
						disabled={disabled}
						onClick={onIconClick}
					/>
				)}
			</div>
		</div>
	);
});

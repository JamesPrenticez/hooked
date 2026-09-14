import { type ButtonHTMLAttributes, forwardRef } from "react";

import styles from "./Toggle.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	value: boolean;
	onValueChange: (value: boolean) => void;
	"aria-label"?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
	{ value, onValueChange, className, onClick, ...props },
	ref
) {
	return (
		<button
			ref={ref}
			className={mergeClassNames(styles.track, className)}
			{...props}
			type="button"
			role="switch"
			aria-checked={value}
			onClick={event => {
				onClick?.(event);
				onValueChange(!value);
			}}
		>
			<span className={styles.thumb} />
		</button>
	);
});

import { forwardRef, type InputHTMLAttributes } from "react";

import styles from "./Checkbox.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface CheckboxProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "checked" | "onChange" | "type"
> {
	value: boolean;
	onValueChange: (value: boolean) => void;
	theme?: "dark" | "light";
	"aria-label"?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ value, onValueChange, theme = "light", className, ...props },
	ref
) {
	return (
		<label className={styles.container} data-theme={theme === "light" ? undefined : theme}>
			<input
				ref={ref}
				className={mergeClassNames(styles.input, className)}
				{...props}
				type="checkbox"
				checked={value}
				onChange={event => onValueChange(event.target.checked)}
			/>
			<span className={styles.box}>
				<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<polyline points="4,13 9,18 20,6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>
		</label>
	);
});

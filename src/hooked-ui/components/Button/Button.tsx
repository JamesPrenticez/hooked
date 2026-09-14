import { type ButtonHTMLAttributes, forwardRef } from "react";

import styles from "./Button.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "negative" | "flat";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = "primary", className, ...props },
	ref
) {
	return (
		<button
			ref={ref}
			className={mergeClassNames(styles.button, className)}
			type="button"
			data-variant={variant === "primary" ? undefined : variant}
			{...props}
		/>
	);
});

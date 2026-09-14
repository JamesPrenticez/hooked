import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

import styles from "./IconButton.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	icon: ReactNode;
	active?: boolean;
	"aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ icon, active, className, ...props },
	ref
) {
	return (
		<button
			ref={ref}
			className={mergeClassNames(styles.button, className)}
			type="button"
			aria-pressed={active}
			{...props}
		>
			{icon}
		</button>
	);
});

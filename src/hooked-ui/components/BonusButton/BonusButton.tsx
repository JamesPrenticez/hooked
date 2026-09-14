import { type ButtonHTMLAttributes, forwardRef } from "react";

import styles from "./BonusButton.module.css";
import { LogoIcon } from "../../icons";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface BonusButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label?: string;
}

export const BonusButton = forwardRef<HTMLButtonElement, BonusButtonProps>(function BonusButton(
	{ label, className, children, ...props },
	ref
) {
	return (
		<button
			ref={ref}
			className={mergeClassNames(styles.container, className)}
			type="button"
			aria-label={label}
			{...props}
		>
			<span className={styles.iconGroup}>
				<span className={styles.iconWrapper}>
					{!children && <LogoIcon aria-hidden="true" />}
					{children}
				</span>
				{label && <span className={styles.textLabel}>{label}</span>}
			</span>
		</button>
	);
});

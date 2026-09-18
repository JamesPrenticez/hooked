import { type DetailsHTMLAttributes, forwardRef, type ReactNode } from "react";

import styles from "./Accordion.module.css";
import { ChevronDownIcon } from "../../icons";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface AccordionProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "title"> {
	title: ReactNode;
	theme?: "dark" | "light";
}

/**
 * A collapsible section built on native `<details>`. Closed by default; pass
 * `open` to start expanded. Sections are independent, so any number can be
 * open at once.
 */
export const Accordion = forwardRef<HTMLDetailsElement, AccordionProps>(function Accordion(
	{ title, theme = "light", className, children, ...props },
	ref
) {
	return (
		<details
			ref={ref}
			className={mergeClassNames(styles.accordion, className)}
			data-theme={theme === "light" ? undefined : theme}
			{...props}
		>
			<summary className={styles.summary}>
				{title}
				<ChevronDownIcon className={styles.chevron} width="1.4rem" aria-hidden="true" focusable="false" />
			</summary>
			<div className={styles.content}>{children}</div>
		</details>
	);
});

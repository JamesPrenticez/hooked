import { forwardRef, type HTMLAttributes, useId } from "react";

import styles from "./IncrementSelector.module.css";
import { mergeClassNames } from "../../utils/mergeClassNames";

export interface IncrementSelectorProps extends HTMLAttributes<HTMLDivElement> {
	options: readonly number[];
	value: number;
	onValueChange: (value: number) => void;
	"aria-label"?: string;
	name?: string;
}

export const IncrementSelector = forwardRef<HTMLDivElement, IncrementSelectorProps>(function IncrementSelector(
	{ options, value, onValueChange, name, className, ...props },
	ref
) {
	const generatedName = useId();
	const groupName = name ?? generatedName;

	return (
		<div ref={ref} role="radiogroup" className={mergeClassNames(styles.container, className)} {...props}>
			{options.map(option => (
				<label key={option} className={styles.option}>
					<input
						className={styles.input}
						type="radio"
						name={groupName}
						value={option}
						checked={option === value}
						onChange={() => onValueChange(option)}
					/>
					<span>{option}</span>
				</label>
			))}
		</div>
	);
});

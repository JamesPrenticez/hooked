import { forwardRef, type HTMLAttributes, useId } from "react";
import styled from "styled-components";

const Label = styled.span`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 0.2rem 1.5rem;
	border-radius: 1.4rem;
	white-space: nowrap;

	color: var(--hooked-color-grey);
	font-family: var(--hooked-font-primary);
	font-size: 1.5rem;
	font-weight: 400;
	line-height: normal;
`;

const Input = styled.input`
	position: absolute;
	inset: 0;
	margin: 0;
	appearance: none;
	opacity: 0;
	cursor: pointer;

	&:checked + ${Label} {
		background: var(--hooked-color-primary);
		color: var(--hooked-color-black);
	}

	&:focus-visible + ${Label} {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: -2px;
	}
`;

const Option = styled.label`
	position: relative;
	display: flex;
	cursor: pointer;
	min-width: 0; /* allow shrinking on small screens */
`;

const Container = styled.div`
	display: grid;
	grid-auto-flow: column;
	grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
	border-radius: 10rem;
	border: 1px solid var(--hooked-color-primary);
	background: var(--hooked-color-black);

	min-height: 2.4rem;
	min-width: fit-content;
	pointer-events: auto;
	overflow: hidden;
`;

export interface IncrementSelectorProps extends HTMLAttributes<HTMLDivElement> {
	options: readonly number[];
	value: number;
	onValueChange: (value: number) => void;
	"aria-label"?: string;
	name?: string;
}

export const IncrementSelector = forwardRef<HTMLDivElement, IncrementSelectorProps>(
	({ options, value, onValueChange, name, ...props }, ref) => {
		const generatedName = useId();
		const groupName = name ?? generatedName;

		return (
			<Container ref={ref} role="radiogroup" {...props}>
				{options.map(option => (
					<Option key={option}>
						<Input
							type="radio"
							name={groupName}
							value={option}
							checked={option === value}
							onChange={() => onValueChange(option)}
						/>
						<Label>{option}</Label>
					</Option>
				))}
			</Container>
		);
	}
);

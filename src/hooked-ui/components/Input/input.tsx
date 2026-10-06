import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";
import styled from "styled-components";

import { IconButton } from "../IconButton/icon-button";

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;

	&[data-disabled] {
		opacity: 0.4;
	}
`;

const Label = styled.label`
	color: var(--hooked-color-primary);
	font-family: var(--hooked-font-primary);
	font-size: 1.2rem;
	font-style: normal;
	font-weight: 400;
	line-height: 120%;
	margin-bottom: 0.6rem;
	text-align: left;
`;

const Field = styled.div`
	align-items: center;
	background: var(--hooked-input-bg-color);
	border: 1px solid var(--hooked-input-border-color);
	border-radius: 0.8rem;
	display: flex;
	gap: 0.8rem;
	padding-right: 0.8rem;
	width: 100%;

	&:focus-within {
		border-color: var(--hooked-color-primary);
	}
`;

const StyledInput = styled.input`
	background: none;
	border: none;
	color: var(--hooked-color-white);
	flex: 1;
	font-family: var(--hooked-font-primary);
	font-size: 1.6rem;
	font-weight: 400;
	line-height: 120%;
	min-width: 0;
	padding: 1.4rem 0.8rem;
	text-shadow: var(--hooked-input-text-shadow);

	&:focus {
		outline: none;
	}

	&:disabled {
		cursor: not-allowed;
	}
`;

const FieldIconButton = styled(IconButton)`
	&& {
		aspect-ratio: 1 / 1;
		background: var(--hooked-input-icon-bg-color);
		backdrop-filter: blur(4px);
		border: none;
		border-radius: 0.8rem;
		height: 3.2rem;
		width: 3.2rem;
	}

	& > svg {
		height: 1.8rem;
		padding: 0.15rem;
		width: 1.8rem;
	}
`;

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
	/** Applied to the wrapper, so an instance can be sized or re-themed. */
	className?: string;
} & IconProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, value, onValueChange, icon, iconLabel, onIconClick, className, disabled, id, ...props }, ref) => {
		const generatedId = useId();
		const inputId = id ?? generatedId;

		return (
			<Wrapper className={className} data-disabled={disabled ? "" : undefined}>
				<Label htmlFor={inputId}>{label}</Label>
				<Field>
					<StyledInput
						ref={ref}
						id={inputId}
						disabled={disabled}
						value={value}
						onChange={event => onValueChange(event.target.value)}
						{...props}
					/>
					{icon && <FieldIconButton icon={icon} aria-label={iconLabel} disabled={disabled} onClick={onIconClick} />}
				</Field>
			</Wrapper>
		);
	}
);

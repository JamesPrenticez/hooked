import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const Chrome = styled.div`
	backdrop-filter: blur(0.5rem);
	background: var(--hooked-black-transparent);
	border-radius: 0.8rem;
	border: 1px solid color-mix(in srgb, var(--hooked-color-white) 30%, transparent);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 1.2rem;
	padding: 1.6rem;
	max-width: 38rem;
	width: 100%;
`;

const Popup = styled(Chrome)`
	position: fixed;
	bottom: var(--popup-bottom);
	left: var(--popup-left);
	transform: translateX(-50%);
	z-index: 9999;
`;

const GrowPopup = styled(Chrome)`
	width: 100%;
	max-width: 100%;
`;

const GrowTrackInner = styled.div`
	overflow: hidden;
	min-height: 0;
`;

const GrowTrack = styled.div`
	display: grid;
	grid-template-rows: 0fr;
	margin-bottom: 0;
	transition:
		grid-template-rows 0.25s ease,
		margin-bottom 0.25s ease;

	&[data-open] {
		grid-template-rows: 1fr;
		margin-bottom: 0.8rem;
	}

	&[data-direction="up"] {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
	}

	&[data-direction="push"] {
		position: relative;
		width: 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
`;

const Title = styled.span`
	font-size: 1.8rem;
	font-family: var(--hooked-font-primary);
	color: var(--hooked-color-white);
	letter-spacing: 0.02em;
`;

const CloseButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 2.4rem;
	min-height: 2.4rem;
	padding: 0;

	background: none;
	border: none;
	color: var(--hooked-color-white);
	font-size: 2.4rem;
	line-height: 1;
	cursor: pointer;
	opacity: 0.6;

	&:hover {
		opacity: 1;
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
		opacity: 1;
	}
`;

const Grid = styled.div`
	display: flex;
	justify-content: space-around;
	flex-wrap: wrap;
	width: 100%;
	gap: 0.6rem;
	padding-right: 1rem;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--hooked-color-body-secondary) transparent;

	&::-webkit-scrollbar {
		width: 0.2rem;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--hooked-color-body-secondary);
	}
`;

const Option = styled.button`
	align-items: center;
	background: var(--hooked-color-black);
	border-radius: 0.6rem;
	border: none;
	color: var(--hooked-color-white);
	cursor: pointer;
	display: flex;
	font-family: var(--hooked-font-primary);
	font-size: 1.3rem;
	justify-content: center;
	padding: 1rem 0.4rem;
	width: 7.7rem;

	&:hover:not([aria-pressed="true"]) {
		background: var(--hooked-color-soft-accent);
	}

	&:focus-visible {
		outline: 2px solid var(--hooked-color-primary);
		outline-offset: 2px;
	}

	&[aria-pressed="true"] {
		background: var(--hooked-color-primary);
		color: var(--hooked-color-black);
	}
`;

export interface StepperPopupProps extends HTMLAttributes<HTMLDivElement> {
	label?: string;
	values: number[];
	value: number;
	format: (value: number) => ReactNode;
	isOpen: boolean;
	onValueSelect: (value: number) => void;
	onClose: () => void;
	close?: boolean;
	growFromInput: boolean;
	growDirection: "up" | "push";
	anchor: { bottom: number; centerX: number } | null;
	portalRef?: RefObject<HTMLElement | null>;
}

export const StepperPopup = forwardRef<HTMLDivElement, StepperPopupProps>(
	(
		{
			label,
			values,
			value,
			format,
			isOpen,
			onValueSelect,
			onClose,
			close = true,
			growFromInput,
			growDirection,
			anchor,
			className,
			portalRef,
			...props
		},
		ref
	) => {
		const body = (
			<>
				<Header>
					{label && <Title>{label.toUpperCase()}</Title>}
					{close && (
						<CloseButton type="button" onClick={onClose} aria-label="Close">
							✕
						</CloseButton>
					)}
				</Header>
				<Grid>
					{values.map(v => (
						<Option key={v} type="button" aria-pressed={v === value} onClick={() => onValueSelect(v)}>
							{format(v)}
						</Option>
					))}
				</Grid>
			</>
		);

		if (growFromInput) {
			return (
				<GrowTrack
					ref={ref}
					className={className}
					data-open={isOpen ? "" : undefined}
					data-direction={growDirection}
					{...props}
				>
					<GrowTrackInner>
						<GrowPopup data-direction={growDirection} data-ignore-click-away>
							{body}
						</GrowPopup>
					</GrowTrackInner>
				</GrowTrack>
			);
		}

		if (!isOpen || !anchor) return null;

		return createPortal(
			<Popup
				ref={ref}
				className={className}
				style={
					{
						"--popup-bottom": `${anchor.bottom}px`,
						"--popup-left": `${anchor.centerX}px`
					} as CSSProperties
				}
				data-ignore-click-away
				{...props}
			>
				{body}
			</Popup>,
			portalRef?.current ?? document.body
		);
	}
);

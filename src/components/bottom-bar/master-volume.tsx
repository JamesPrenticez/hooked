import { useEffect, useRef } from "react";
import { useClickOutside } from "@hooked-utils/use-click-outside";
import styled from "styled-components";

import { ICONS } from "@hooked-ui";
import { useAudioStore } from "@stores/audioStore";
import { breakpoint } from "@utils/breakpoint";

const CLOSE_AFTER_MS = 3000;

const Panel = styled.div`
	pointer-events: auto;
	position: absolute;
	/* Phones: above the floating button row. */
	bottom: calc(100% + 5.2rem + var(--spacing-sm) * 2);
	left: var(--spacing-sm);
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md);
	background: color-mix(in srgb, var(--color-black) 72%, transparent);
	border-radius: var(--border-radius-md);
	color: var(--color-white);

	@media ${breakpoint.landscape} {
		bottom: calc(100% + var(--spacing-xs));
		left: 0;
	}

	@media ${breakpoint.tablet} {
		left: 0;
	}

	svg {
		width: 2.4rem;
		height: 2.4rem;
		flex-shrink: 0;
		fill: currentColor;
	}
`;

const Slider = styled.input`
	appearance: none;
	width: 16rem;
	height: 1.4rem;
	margin: 0;
	background: transparent;
	cursor: pointer;

	&::-webkit-slider-runnable-track {
		height: 0.4rem;
		border-radius: 0.2rem;
		background: linear-gradient(
			to right,
			var(--color-primary) var(--fill),
			color-mix(in srgb, var(--color-white) 18%, transparent) var(--fill)
		);
	}
	&::-moz-range-track {
		height: 0.4rem;
		border-radius: 0.2rem;
		background: color-mix(in srgb, var(--color-white) 18%, transparent);
	}
	&::-moz-range-progress {
		height: 0.4rem;
		border-radius: 0.2rem;
		background: var(--color-primary);
	}
	&::-webkit-slider-thumb {
		appearance: none;
		width: 1.4rem;
		height: 1.4rem;
		margin-top: -0.5rem;
		border: none;
		border-radius: 50%;
		background: var(--color-white);
	}
	&::-moz-range-thumb {
		width: 1.4rem;
		height: 1.4rem;
		border: none;
		border-radius: 50%;
		background: var(--color-white);
	}
`;

/** The master-volume popover above the audio button. Closes after 3s untouched, or on a click elsewhere. */
export const MasterVolume = ({ onClose }: { onClose: () => void }) => {
	const muted = useAudioStore(s => s.muted);
	const volume = useAudioStore(s => s.masterVolume);
	const setVolume = useAudioStore(s => s.setMasterVolume);
	const panel = useRef<HTMLDivElement>(null);
	const timer = useRef<number | undefined>(undefined);

	const stopTimer = () => window.clearTimeout(timer.current);
	const startTimer = () => {
		stopTimer();
		timer.current = window.setTimeout(onClose, CLOSE_AFTER_MS);
	};

	// Auto-closes even if the pointer never enters it.
	useEffect(() => {
		startTimer();
		return stopTimer;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	useClickOutside(panel, onClose);

	return (
		<Panel
			ref={panel}
			onMouseEnter={stopTimer}
			onMouseLeave={startTimer}
			onTouchStart={stopTimer}
			onTouchEnd={startTimer}
		>
			{muted ? ICONS.AudioOffIcon : ICONS.AudioIcon}
			<Slider
				type="range"
				min={0}
				max={1}
				step={0.01}
				value={volume}
				aria-label="Master volume"
				style={{ ["--fill" as string]: `${Math.round(volume * 100)}%` }}
				onChange={e => setVolume(Number(e.target.value))}
			/>
		</Panel>
	);
};

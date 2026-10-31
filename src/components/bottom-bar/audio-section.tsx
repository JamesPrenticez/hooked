import { ICONS } from "@hooked-ui";
import { useAudioStore } from "@stores/audioStore";

import { SideTrigger } from "./side-trigger";

/** Mutes and unmutes all game audio, and shows the volume slider. */
export const AudioSection = ({ onOpenVolume }: { onOpenVolume: () => void }) => {
	const muted = useAudioStore(s => s.muted);
	const toggleMuted = useAudioStore(s => s.toggleMuted);

	return (
		<SideTrigger
			$slot={1}
			data-ignore-click-away
			onClick={() => {
				toggleMuted();
				onOpenVolume();
			}}
			active={muted}
			aria-label={muted ? "Unmute" : "Mute"}
			title={muted ? "Unmute" : "Mute"}
			icon={muted ? ICONS.AudioOffIcon : ICONS.AudioIcon}
		/>
	);
};

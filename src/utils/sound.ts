import { Howl, Howler } from "howler";

import attack from "@assets/audio/attack.mp3";
import beachway from "@assets/audio/beachway.mp3";
import cast from "@assets/audio/cast.mp3";
import fail from "@assets/audio/fail.mp3";
import sinkingThings from "@assets/audio/sinking-things.mp3";
import splash from "@assets/audio/splash.mp3";
import win from "@assets/audio/win.mp3";

export const MUSIC = { beachway, sinkingThings };
export const SFX = { attack, cast, fail, splash, win };

const howls = new Map<string, Howl>();
let track: Howl | undefined;

function howl(src: string, loop = false): Howl {
	let h = howls.get(src);
	if (!h) {
		h = new Howl({ src: [src], loop });
		howls.set(src, h);
	}
	return h;
}

export function setMasterVolume(value: number) {
	Howler.volume(value);
}

/** Howler queues a play() made before the browser's first-tap audio unlock, so no retry is needed here. */
export function setMuted(value: boolean) {
	Howler.mute(value);
}

const FADE_MS = 1500;

/** Crossfades the looping music to `src` (none = fade to silence); a no-op if it's already the track. */
export function playMusic(src?: string) {
	const next = src ? howl(src, true) : undefined;
	if (track === next) return;
	const prev = track;
	track = next;
	if (prev) {
		prev.fade(prev.volume(), 0, FADE_MS);
		prev.once("fade", () => track !== prev && prev.stop());
	}
	if (next) {
		if (!next.playing()) {
			next.volume(0);
			next.play();
		}
		next.fade(next.volume(), 1, FADE_MS);
	}
}

export function playSfx(src: string) {
	howl(src).stop().play();
}

export function stopSfx(src: string) {
	howls.get(src)?.stop();
}

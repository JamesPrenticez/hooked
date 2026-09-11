/**
 * Time-of-day ambience for the harbour hub. The background strip
 * (`bg-desktop` / `bg-mobile`) is painted at bright midday; everything that
 * makes it read as dawn / dusk / night is code, driven by one normalised
 * clock value and cycled by `useDayNightClock`.
 *
 * `t` is time of day in `[0, 1)`: `0` = midnight, `0.25` sunrise, `0.5`
 * noon, `0.75` sunset. Values outside the range wrap.
 */

export interface Celestial {
	/** Position across the viewport, `0`..`1` left→right / top→down. */
	x: number;
	y: number;
	color: number;
	/** `0` at the horizon, `1` at the peak — glow strength, and below ~0 the
	 *  disc is under the horizon and not drawn. */
	intensity: number;
	isMoon: boolean;
}

export interface Ambience {
	/** Vertical sky gradient behind the strip. */
	skyTop: number;
	skyHorizon: number;
	/** Multiply tint for the strip — `0xffffff` at noon (no change). */
	bgTint: number;
	/** Building-window light strength, `0` (off, daylight) .. `1` (fully lit) —
	 *  drives the lit-windows overlay's alpha. */
	windowGlow: number;
	celestial: Celestial;
}

interface Keyframe {
	at: number;
	skyTop: number;
	skyHorizon: number;
	bgTint: number;
	windowGlow: number;
}

// Sorted by `at`. The last frame wraps back to the first across midnight.
const KEYFRAMES: Keyframe[] = [
	{ at: 0.0, skyTop: 0x05070f, skyHorizon: 0x0b1224, bgTint: 0x2a3550, windowGlow: 1 }, // midnight
	{ at: 0.22, skyTop: 0x0b1428, skyHorizon: 0x2b3450, bgTint: 0x53617f, windowGlow: 0.9 }, // pre-dawn
	{ at: 0.28, skyTop: 0x394d78, skyHorizon: 0xe6a86a, bgTint: 0xd98f5c, windowGlow: 0.15 }, // sunrise
	{ at: 0.34, skyTop: 0x4a7bb5, skyHorizon: 0xc3dbee, bgTint: 0xf2ddc4, windowGlow: 0 }, // morning
	{ at: 0.5, skyTop: 0x3172c2, skyHorizon: 0xa9d3f0, bgTint: 0xffffff, windowGlow: 0 }, // noon
	{ at: 0.66, skyTop: 0x3d72ad, skyHorizon: 0xd2e2ef, bgTint: 0xf6e6cf, windowGlow: 0 }, // afternoon
	{ at: 0.72, skyTop: 0x35406a, skyHorizon: 0xef8a4c, bgTint: 0xdd7f42, windowGlow: 0.2 }, // sunset
	{ at: 0.8, skyTop: 0x1b2540, skyHorizon: 0x46375f, bgTint: 0x5a4a70, windowGlow: 0.8 }, // dusk
	{ at: 0.88, skyTop: 0x080c1a, skyHorizon: 0x141a30, bgTint: 0x2f3a58, windowGlow: 1 } // night
];

/** Linear blend of two `0xRRGGBB` colours in RGB space. */
function mix(a: number, b: number, u: number): number {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const r = Math.round(ar + (((b >> 16) & 0xff) - ar) * u);
	const g = Math.round(ag + (((b >> 8) & 0xff) - ag) * u);
	const bl = Math.round(ab + ((b & 0xff) - ab) * u);
	return (r << 16) | (g << 8) | bl;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Screen fraction the body sits at when rising / setting — the scene
 *  horizon, so it tracks along the water rather than climbing out from
 *  behind it. */
const HORIZON_Y = 0.5;
/** Peak height above the horizon, as a fraction of viewport height, scaled
 *  by aspect and clamped. Wide viewports get a tall arc; portrait ones a
 *  shallow one, so the on-screen slope stays roughly constant. */
const LIFT_PER_ASPECT = 0.42;
const LIFT_MIN = 0.26;
const LIFT_MAX = 0.46;

function celestialAt(time: number, aspect: number): Celestial {
	const isDay = time >= 0.25 && time < 0.75;
	// 0 at rise, 1 at set — sun over [0.25, 0.75), moon over the night half.
	const frac = isDay ? (time - 0.25) / 0.5 : ((time + 0.25) % 1) / 0.5;
	// Flatter than a pure sine: lifts off the horizon quickly, then travels
	// across the sky near the top instead of spiking to a point.
	const arc = Math.sin(frac * Math.PI) ** 0.7; // 0 at horizon, 1 at zenith
	const lift = Math.min(LIFT_MAX, Math.max(LIFT_MIN, LIFT_PER_ASPECT * aspect));

	return {
		x: frac,
		y: HORIZON_Y - lift * arc,
		// warm at the horizon, white-hot at the zenith; the moon stays cool.
		color: isDay ? mix(0xffb066, 0xfff6e2, arc) : 0xd7e2f2,
		intensity: Math.max(0, arc),
		isMoon: !isDay
	};
}

export function computeAmbience(t: number, view?: { width: number; height: number }): Ambience {
	const time = ((t % 1) + 1) % 1;
	const aspect = view ? view.width / view.height : 16 / 9;

	let lo = KEYFRAMES[KEYFRAMES.length - 1];
	let hi = KEYFRAMES[0];
	for (let i = 0; i < KEYFRAMES.length; i++) {
		if (KEYFRAMES[i].at <= time) {
			lo = KEYFRAMES[i];
			hi = KEYFRAMES[i + 1] ?? KEYFRAMES[0];
		}
	}

	let span = hi.at - lo.at;
	if (span <= 0) span += 1; // wrap: night → midnight
	let into = time - lo.at;
	if (into < 0) into += 1;
	const u = into / span;

	return {
		skyTop: mix(lo.skyTop, hi.skyTop, u),
		skyHorizon: mix(lo.skyHorizon, hi.skyHorizon, u),
		bgTint: mix(lo.bgTint, hi.bgTint, u),
		windowGlow: lerp(lo.windowGlow, hi.windowGlow, u),
		celestial: celestialAt(time, aspect)
	};
}

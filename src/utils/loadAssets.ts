import { Assets, type Texture } from "pixi.js";

import { DOM_IMAGE_URLS, FONTS, PIXI_ASSETS } from "@constants/manifest";

import { preloadImages } from "./preloadImages";
import { preloadSounds, SOUND_COUNT } from "./sound";

Assets.loader.loadOptions = { ...Assets.loader.loadOptions, strategy: "retry", retryCount: 3, retryDelay: 500 };

/**
 * Loads everything the game draws or plays — Pixi textures, DOM images, sounds, fonts — so nothing fetches
 * the first time it shows. Reports 0–1 progress, each kind weighted by its asset count.
 */
export async function loadBootAssets(onProgress: (progress: number) => void) {
	const parts: { weight: number; run: (report: (fraction: number) => void) => Promise<unknown> }[] = [
		{ weight: PIXI_ASSETS.length, run: report => Assets.load(PIXI_ASSETS, report) },
		{ weight: DOM_IMAGE_URLS.length, run: report => preloadImages(DOM_IMAGE_URLS, report) },
		{ weight: SOUND_COUNT, run: preloadSounds }
	];
	const total = parts.reduce((sum, { weight }) => sum + weight, 0);
	const fractions = parts.map(() => 0);

	await Promise.all([
		...parts.map(({ run }, i) =>
			run(fraction => {
				fractions[i] = fraction;
				onProgress(parts.reduce((sum, { weight }, j) => sum + weight * fractions[j], 0) / total);
			})
		),
		...FONTS.map(font => document.fonts.load(font).catch(() => undefined))
	]);
}

/** The textures for `urls` if the boot load already cached them all — lets a scene draw on its first render. */
export function cachedTextures(urls: string[]): Record<string, Texture> | undefined {
	return urls.every(url => Assets.cache.has(url))
		? Object.fromEntries(urls.map(url => [url, Assets.get<Texture>(url)]))
		: undefined;
}

// PixiJS's `Assets.load` decodes images off-thread to build GPU textures, which
// doesn't reliably leave a browser HTTP-cache entry behind — a plain
// <img>/background-image request for the same URL can still hit the network
// afterwards, producing a visible pop-in. Images only the DOM draws (bonus art,
// volatility cards, bottom-bar buttons, fish portraits) are preloaded the way the
// DOM will fetch them: a same-context `Image()` load.

const retained: HTMLImageElement[] = [];

function preloadImage(src: string): Promise<void> {
	const img = new Image();
	img.src = src;
	retained.push(img);
	// Don't let one broken/missing asset block the loading screen.
	return img.decode().catch(() => undefined);
}

export function preloadImages(urls: string[], onProgress?: (fraction: number) => void): Promise<void> {
	if (urls.length === 0) {
		onProgress?.(1);
		return Promise.resolve();
	}

	let loaded = 0;
	return Promise.all(
		urls.map(src =>
			preloadImage(src).then(() => {
				loaded += 1;
				onProgress?.(loaded / urls.length);
			})
		)
	).then(() => undefined);
}

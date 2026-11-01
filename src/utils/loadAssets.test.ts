import { Assets, Cache, type Texture } from "pixi.js";
import { afterEach, expect, it } from "vitest";

import { cachedTextures } from "./loadAssets";

afterEach(() => {
	Cache.reset();
});

it("returns undefined until every url is cached", () => {
	Cache.set("a.png", {} as Texture);

	expect(cachedTextures(["a.png", "b.png"])).toBeUndefined();
});

it("keys the cached textures by url", () => {
	const a = {} as Texture;
	const b = {} as Texture;
	Cache.set("a.png", a);
	Cache.set("b.png", b);

	const textures = cachedTextures(["a.png", "b.png"]);

	expect(textures?.["a.png"]).toBe(a);
	expect(textures?.["b.png"]).toBe(b);
	expect(Assets.cache.has("a.png")).toBe(true);
});

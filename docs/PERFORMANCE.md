# Performance — PixiJS draw-callback allocations

Notes from a real incident in `HarbourScene` (BUILD_PLAN §7.1): FPS tanking
on mobile, then — after an initial fix — browser memory climbing
continuously while the scene sat idle. Both had the same root cause. Read
this before adding any `pixiGraphics draw={...}` callback that builds a
gradient, pattern, or other GPU resource.

## The anti-pattern

```ts
draw={g => {
	g.clear();
	g.circle(x, y, r).fill(new FillGradient({ ... }));
}}
```

`draw` re-runs every frame for anything animated (@pixi/react calls it
directly on prop change — see `applyProps.mjs` — no remount, but no
memoisation either). `FillGradient`/`FillPattern` construction is not free:
`FillGradient.buildGradient()` (`pixi.js/lib/scene/graphics/shared/fill/FillGradient.js`)
synchronously creates a `<canvas>`, runs a 2D gradient fill on it, and wraps
it in a GPU `Texture`. It only skips that work if the _same instance_ is
reused — a fresh `new FillGradient(...)` rebuilds from scratch regardless of
whether the colors actually changed.

Two distinct costs follow from this, and they show up differently:

- **CPU/GPU cost per frame** — canvas fill + texture upload, scaled by
  `textureSize` (default 256×256 for a radial gradient) and how many you
  build per frame. A tight loop building several of these (a moon-reflection
  ribbon of many fragments, say) is a direct FPS hit.
- **Memory that climbs even when FPS looks fine** — Pixi's automatic texture
  GC (`GCSystem`, `pixi.js/lib/rendering/renderers/shared/GCSystem.js`) only
  sweeps every `gcFrequency` (default 30s) and only reclaims a texture once
  it's been unused for `gcMaxUnusedTime` (default 60s). A texture built and
  abandoned every frame sits around for the better part of a minute before
  it's even eligible for collection — so the _count_ of orphaned textures
  only goes up for the first ~60s, regardless of how small each one is. This
  reads as a leak in devtools even though every texture is, eventually,
  correctly freed.

A small texture doesn't save you here — a 256×1 linear gradient rebuilt
every frame, forever, leaks the same way a 256×256 one does. What matters is
whether anything ever _reuses_ the instance.

## The two fixes, and when to use which

### 1. Cache by (bucketed) color, vary strength via `alpha`

Use when the _shape_ of the gradient is constant and only its color and/or
overall strength change — a moon that's always the same color, a sun that
sweeps a bounded arc, a beacon that cycles a bounded hue wheel.

- Bake the color stops at a fixed reference alpha (e.g. `0.9`) once.
- Drive all per-frame variation (shimmer, sway, day/night strength) through
  the fill call's separate numeric `alpha` — `g.fill({ fill: gradient, alpha })`
  — instead of re-baking alpha into the color stops. `Graphics.fill()`
  multiplies a texture/gradient fill by this `alpha` on top of whatever's
  baked in, so one cached instance covers every strength.
- Key the cache on **bucketed** RGB (round each channel to a step, e.g. 8),
  not exact RGB. A continuously-cycling color (day/night arc, rainbow
  beacon) still only touches a small, bounded set of buckets, so the cache
  plateaus. Caching on exact float-derived RGB would almost never hit and
  isn't worth the Map overhead.
- Shrink `textureSize` (e.g. 64 instead of the 256 default) for anything
  that's a soft, blurred glow — the GPU bilinear-scales it up over a large
  radius fine, and it cuts canvas-fill and upload cost ~16×.

Shared helper: `src/components/HarbourScene/gradientCache.ts` —
`bucketColor()` + `cachedGradient()`. Used by:

- `CelestialBody.tsx` — sun/moon glow (`glowGradient`)
- `WaterReflections.tsx` — moon-reflection ribbon (`ribbonGradient`); the
  window-glow band uses a plain module-level constant instead, since its
  color never varies at all
- `TowerBeacon.tsx` — beacon halo (`haloGradient`)

### 2. Destroy the previous instance the moment it's replaced

Use when the color genuinely drifts almost every frame and caching would
(almost) never hit, or would visibly quantize something that's supposed to
fade smoothly — the sky gradient behind the whole scene is the example here:
bucketing it would stair-step the color during a fast sunrise/sunset.

Instead: keep exactly one instance alive, and call `.destroy()` on the
previous one right after building its replacement — safe because `g.clear()`
already dropped the geometry that referenced it, so nothing still needs it.
This is a straight swap, not a cache: no growth ever, full color accuracy,
and the actual rebuild-every-frame cost is unchanged (only worth doing when,
like the sky's 256×1 gradient, that cost is already cheap).

Applied in `SkyLayer.tsx` (`skyGradient`, backed by a module-level
`previousGradient`).

## Auditing for this

```
grep -rn "new FillGradient\|new FillPattern" src
```

Every hit should be one of:

- inside a `cachedGradient(...)`-style builder (only runs on a cache miss),
- a module-level `const` (built once, colors never vary), or
- immediately preceded by destroying whatever it's replacing.

A bare `new FillGradient(...)` (or `FillPattern`, or any other
canvas-backed `Texture`) sitting directly in a `draw` callback with no cache
and no destroy is the bug, regardless of how small its texture looks.

The same reasoning applies to any other per-frame GPU allocation in a
`draw`/`onRender` callback — `RenderTexture`, `Texture.from(canvas)`,
`Sprite.from(dataURL)` — not just gradients. If it wraps a canvas or GPU
resource and gets constructed on every frame, it needs one of the two
patterns above.

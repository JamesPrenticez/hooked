# Deep Catch / Hooked — Asset Spec

What to provide, in what format, and where it goes. Living doc — sections
land as their milestone comes up. Current focus: **§7 Harbour / Main Hub**.

Placeholder art is already in the build (`src/components/HarbourScene/layers.ts`
and friends). Every real asset drops in by replacing a placeholder — the
layer stack, z-order and scene wiring don't change.

**Decisions locked** (2026-09-10): dusk lighting; **portrait-first**, wide
desktop also supported; **fully separated layers** (parallax + §7.3 motion);
animation is **Blender-rendered sprite sheets**, no skeletal runtime, no
proprietary tooling.

---

## Conventions

| Thing         | Rule                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stills        | `.webp`, lossy q80–90 for painterly art, lossless for hard-edged props/UI. Straight (non-premultiplied) alpha. sRGB.                                                                  |
| Animation     | Blender → PNG frame sequence → packed sprite sheet (`.webp` + Pixi JSON). Played by Pixi's built-in `AnimatedSprite`. **No new dependency.**                                          |
| Vector        | The fishing line is **code-drawn** (see below). Pixi rasterises SVG and it can't follow a moving path — don't send SVG.                                                               |
| Orientation   | **Portrait-first.** Safe area **1080×1920 (9:16)** — everything load-bearing sits inside it. Desktop widescreen just reveals more to the left/right.                                  |
| Layer shape   | Each full-width environment layer is a **wide, short strip**, only as tall as that band of the scene needs, positioned by a Y-anchor. Keeps every texture well under the 4096² limit. |
| Delivery size | ~2× on-screen size. Strips **2560 px wide** (up to **3000** for foreground layers that travel most under parallax). Never exceed 4096 in either dimension.                            |
| Bleed         | Extend strips **horizontally** past 9:16 so a 21:9 desktop doesn't run out of image. Nothing important in the bleed.                                                                  |
| Naming        | `harbour/<layer>.webp`, `harbour/boat-01.webp`, `fisherman/<clip>/…`, `fish/<fishId>/…`, `vfx/…`. Lowercase, kebab-case. `fishId`s are the 18 in `server/src/constants.ts`.           |
| Location      | `src/assets/<group>/…` (imported by code, hashed + bundled). Not `public/`.                                                                                                           |

Exact horizon / deck Y-anchors and the portrait↔desktop fit come from §20
(Responsive) and §25 (Camera) — for now, author generously: sky to the top
edge, dock to the bottom edge, ocean fills between.

---

## §7.1 Environment — the harbour backdrop

Eight layers, back to front. Confirmed **fully separated** — no combined
illustration. Placeholder for each is a flat shape block in `layers.ts`;
its `covers` note maps 1:1 to this list.

| Layer         | File(s)                                     | Size (px)          | Alpha  |
| ------------- | ------------------------------------------- | ------------------ | ------ |
| **sky**       | `harbour/sky.webp`                          | 2560 × 1400        | opaque |
| **buildings** | `harbour/buildings-far.webp`, `…-near.webp` | 2560×700, 3000×900 | alpha  |
| **ocean**     | `harbour/ocean.webp`                        | 2560 × 1200        | opaque |
| **boats**     | `harbour/boat-01.webp` … `boat-04.webp`     | ~800 × 560 each    | alpha  |
| **dock**      | `harbour/dock.webp`                         | 3000 × 1000        | alpha  |
| **cranes**    | `harbour/crane-01.webp`, `crane-02.webp`    | ~1000 × 1500 ea    | alpha  |
| **props**     | `harbour/prop-*.webp` (6–10 pieces)         | 150–520 each       | alpha  |
| **lighting**  | — (code) + optional `vfx/vignette.webp`     | 2560 × 1400        | —      |

- **sky** — dusk gradient + soft cloud, no hard detail near edges; sets the base light.
- **buildings** — far: hazy distant skyline. near: warehouses, gantries, signage, hanging nets, lit windows. Two files so they parallax apart. `-near` is wider because it travels more.
- **ocean** — horizon at the very top edge of the image. Keep painted foam minimal; it gets an animated water shader in §7.3 / §27.
- **boats** — separate files, moored fishing vessels, 3–4 silhouette-readable variants. Tell me each one's waterline y if it isn't the image bottom.
- **dock** — the wharf deck the player "stands" on + piles into the water. Foreground, bottom-anchored, widest parallax travel.
- **cranes** — separate, **static pose**, with a clean pivot noted (sidecar `.json` or just tell me the px). They swing in §7.3 and become extraction gear in §16.
- **props** — deck dressing: crates, barrels, net, bollard, buoy, lamp. The lamp wants a separate soft glow sprite (`prop-lamp-glow.webp`, additive) so it can flicker.
- **lighting** — global colour-grade + vignette done in-engine. Send `vfx/vignette.webp` (soft dark oval on transparent) only if a painted one beats the procedural.

**Nice-to-have, not blocking:** `harbour/birds.webp` sheet (§7.3),
`harbour/foreground-rope.webp` framing element across the top.

---

## Animation pipeline — Blender → sprite sheet

No skeletal runtime, no Spine/Rive, no paid tools. Workflow:

1. **Blender** — model / rig / animate. 3D rendered to read as 2D is fine and
   keeps lighting consistent; grease pencil or flat planes also work.
2. **Render** each clip to a transparent PNG sequence (`RGBA`), e.g.
   `idle_0001.png … idle_0024.png`, at the clip's playback fps.
3. **Pack** the sequences into a sheet. Free options: `free-tex-packer`
   (GUI + CLI, Pixi JSON out), or `@assetpack/core`'s spritesheet plugin
   wired into the Vite build. Output `name.webp` + `name.json`; if it spills
   past 4096², the packer emits `name-0.webp`, `name-1.webp`.
4. **Load** — `Assets.load("fisherman.json")` → `new AnimatedSprite(sheet.animations.cast)`.
   Frame names `cast/0001` group under `sheet.animations.cast`.

**Frame budget** — a sprite frame is uncompressed RGBA in VRAM (webp only
saves disk). So keep it lean:

- 12–15 fps is plenty for this style; 24 only for a hero beat.
- Short loops: idle ~24–36 frames, one-shots ~12–20.
- Right-size the frame: shrimp at 128², a shark at 512², whale/kraken at
  1024² but with fewer frames.
- Packers trim transparent margins — model tight to frame.

### §7.2 Fisherman

One character sheet, ~700–900 px tall in the portrait safe area, feet on the
dock deck line.

| Clip           | Frames (guide) | Use                                    |
| -------------- | -------------- | -------------------------------------- |
| `idle`         | 24–36 loop     | Harbour home state.                    |
| `cast`         | 14–20 one-shot | Rod swings out (§10).                  |
| `fishing-loop` | 16–24 loop     | Line out, subtle rod strain (§13–§14). |
| `reel`         | 12–16 loop     | Hauling in (§15).                      |
| `reaction-win` | 12–18 one-shot | Small celebrate (§17).                 |
| `reaction-big` | 18–24 one-shot | Big win / jackpot.                     |
| `victory`      | 12 loop / hold | Payout screen pose.                    |

### §12 Fish (later — commission in one batch)

One sheet **per fish id** (18). Clips: `swim` (loop), `hooked` (one-shot),
`struggle` (loop), `reveal` (one-shot beauty pose).

The math forces discipline: 18 fish × ~70 frames each, all resident, would
blow the texture budget. Mitigations, in order:

- **Lazy-load the outcome fish.** The server names the fish before the
  presentation starts (§11) — load that one sheet during the cast/descent,
  free it after the round. Ambient background fish use one tiny shared sheet.
- Common low-value fish get fewer frames (`swim` 12f, drop `struggle`).
- Reserve big frame counts + high res for the rare, screen-filling catches.
- Compressed textures (KTX2/basis) are a §25 optimisation if it's still tight.

---

## Simple motion — no sprite sheet

Done in code by transforming a sprite (or its parts), no frames to render:

- **Cranes** — tower sprite + boom sprite, tween `boom.rotation` (§7.3 sway, §16 lift).
- **Boats** — whole-sprite bob: `y` + `rotation` on a sine.
- **Buoys / lamp glow** — bob + alpha pulse.
- **Rod line strain** — a separate rod sprite parented to the hand anchor,
  small rotation wobble, layered over `fishing-loop`.

---

## Fishing line (§13) — code, not an asset

Drawn in-engine: a Pixi `MeshRope` (or plain `Graphics` stroke) along the
hook's path. Optional tiny tiling texture `vfx/line-rope.webp` (16×64,
seamless vertical) if a flat stroke looks cheap. The hook is one small
sprite: `vfx/hook.webp` ~120×160, alpha.

---

## Still open (your call)

1. **Design-space height** — 1080×1920 (a clean 9:16) assumed. Fine, or
   target a taller modern phone (1080×2340) so tall devices don't letterbox?
2. **Animation fps** — 12 or 15 as the house rate for sprite clips?
3. **Texture-memory budget** — is there a target (e.g. "≤ 256 MB GPU on a
   mid phone")? Sets how aggressive the fish lazy-loading has to be.
4. **Blender render style** — 3D-rendered-to-2D, or hand-drawn / grease
   pencil? Affects how the fisherman and fish get authored, not the pipeline.

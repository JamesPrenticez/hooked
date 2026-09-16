export type Plane =
  | "farSilhouette"
  | "distant"
  | "distantLife"
  | "landmark"
  | "midground"
  | "target"
  | "foreground";

export const PARALLAX: Record<Plane, number> = {
  farSilhouette: 0.05,
  distant: 0.12,
  distantLife: 0.17,
  landmark: 0.28,
  midground: 0.4,
  target: 0.65,
  foreground: 0.82,
};

export interface UnderwaterObject {
  id: string;
  assetId: string;
  plane: Plane;
  /** World depth; larger values are deeper. */
  depth: number;
  /** Horizontal position as a proportion of viewport width. */
  x: number;
  /** Scale relative to the manifest's design size. */
  scale: number;
  rotation?: number;
  flipX?: boolean;
  z?: number;
  fogRange?: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export function projectObject(
  object: UnderwaterObject,
  cameraDepth: number,
  viewport: Viewport,
  anchorY = 0.5,
) {
  return {
    x: object.x * viewport.width,
    y:
      viewport.height * anchorY +
      (object.depth - cameraDepth) * PARALLAX[object.plane],
  };
}

export function isPotentiallyVisible(
  object: UnderwaterObject,
  cameraDepth: number,
  viewport: Viewport,
  maxDisplayHeight: number,
) {
  const { y } = projectObject(object, cameraDepth, viewport);
  const margin = maxDisplayHeight * object.scale * 0.6 + viewport.height * 0.25;
  return y > -margin && y < viewport.height + margin;
}

export function depthFog(
  objectDepth: number,
  cameraDepth: number,
  fogRange = 2600,
) {
  return Math.min(1, Math.abs(objectDepth - cameraDepth) / fogRange);
}

export const EXAMPLE_OBJECTS: UnderwaterObject[] = [
  {
    id: "cliff-left-a",
    assetId: "abyss-cliff-left",
    plane: "farSilhouette",
    depth: 5200,
    x: -0.04,
    scale: 1.1,
  },
  {
    id: "wreck-a",
    assetId: "shipwreck",
    plane: "landmark",
    depth: 4100,
    x: 0.74,
    scale: 0.82,
    rotation: -0.05,
  },
  {
    id: "vent-a",
    assetId: "vent-cluster",
    plane: "midground",
    depth: 6200,
    x: 0.18,
    scale: 0.68,
  },
  {
    id: "reef-right-a",
    assetId: "reef-edge-right",
    plane: "foreground",
    depth: 2450,
    x: 1.03,
    scale: 1.15,
  },
];

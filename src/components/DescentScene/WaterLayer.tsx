import { useLayoutEffect } from "react";
import { Color, MeshGeometry, Shader, type TextureShader, UniformGroup } from "pixi.js";

// A 1×1 quad, stretched to the viewport by the mesh's `scale`. Shared across
// mounts: `Mesh.destroy()` leaves its geometry and shader alone.
const quad = new MeshGeometry({
	positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
	uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
	indices: new Uint32Array([0, 1, 2, 0, 2, 3])
});

const water = new UniformGroup({
	uTop: { value: new Float32Array(3), type: "vec3<f32>" },
	uBottom: { value: new Float32Array(3), type: "vec3<f32>" },
	uDarkness: { value: 0, type: "f32" }
});

// The vertex stage and `vColor` mirror Pixi's built-in mesh shader:
// `uColor * uWorldColorAlpha` is what lets SceneManager's crossfade (an
// `alpha` on an ancestor container) fade this layer too. The darkness overlay
// is a multiply — same result as a black rect at that alpha, in one pass.
// The cast below is only for `pixiMesh`'s prop type (Mesh's default shader
// generic); nothing here samples a texture.
// ponytail: WebGL only (Application sets no `preference`) — add a `gpu` WGSL
// program if we ever opt into WebGPU.
const shader = Shader.from({
	gl: {
		vertex: `
			in vec2 aPosition;
			in vec2 aUV;
			out vec2 vUV;
			out vec4 vColor;

			uniform mat3 uProjectionMatrix;
			uniform mat3 uWorldTransformMatrix;
			uniform vec4 uWorldColorAlpha;
			uniform mat3 uTransformMatrix;
			uniform vec4 uColor;

			void main() {
				mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
				gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
				vUV = aUV;
				vColor = uColor * uWorldColorAlpha;
			}
		`,
		fragment: `
			in vec2 vUV;
			in vec4 vColor;
			out vec4 finalColor;

			uniform vec3 uTop;
			uniform vec3 uBottom;
			uniform float uDarkness;

			// Interleaved gradient noise (Jimenez), 0..1 per device pixel.
			float noise(vec2 p) {
				return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
			}

			void main() {
				vec4 color = vec4(mix(uTop, uBottom, vUV.y) * (1.0 - uDarkness), 1.0) * vColor;
				// Triangular-PDF dither, ±1 level of the 8-bit framebuffer: turns the
				// flat bands a dark, shallow-slope gradient quantises into as fine grain.
				float dither = noise(gl_FragCoord.xy) + noise(gl_FragCoord.xy + vec2(47.0, 17.0)) - 1.0;
				finalColor = vec4(color.rgb + dither / 255.0 * color.a, color.a);
			}
		`,
		// Pixi defaults fragment shaders to mediump, which is fp16 on mobile GPUs.
		preferredFragmentPrecision: "highp"
	},
	resources: { water }
}) as TextureShader;

function setWater(top: number, bottom: number, darkness: number) {
	Color.shared.setValue(top).toRgbArray(water.uniforms.uTop);
	Color.shared.setValue(bottom).toRgbArray(water.uniforms.uBottom);
	water.uniforms.uDarkness = darkness;
}

interface WaterLayerProps {
	view: { width: number; height: number };
	top: number;
	bottom: number;
	/** `0`..`1` dark overlay strength — light falloff with depth. */
	darkness: number;
}

/** The underwater backdrop: a vertical gradient that darkens with depth. Drawn
 *  per pixel in a fragment shader — no gradient texture — so the drifting
 *  `top`/`bottom` colours cost a few uniform writes per frame instead of the
 *  canvas fill + texture upload a rebuilt `FillGradient` needs
 *  (docs/PERFORMANCE.md). */
function WaterLayer({ view, top, bottom, darkness }: WaterLayerProps) {
	useLayoutEffect(() => setWater(top, bottom, darkness), [top, bottom, darkness]);

	return <pixiMesh geometry={quad} shader={shader} scale={{ x: view.width, y: view.height }} />;
}

export default WaterLayer;

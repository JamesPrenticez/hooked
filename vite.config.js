import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		server: {
			port: env.FRONTEND_PORT || 4200,
			host: "0.0.0.0"
		},
		plugins: [react(), svgr()],
		resolve: {
			alias: {
				// One alias per src/ bucket; keep in sync with the "paths" entry in
				// tsconfig.json. Add a bucket here only once something actually
				// imports across into it.
				"@api": path.resolve(import.meta.dirname, "./src/api"),
				"@assets": path.resolve(import.meta.dirname, "./src/assets"),
				"@components": path.resolve(import.meta.dirname, "./src/components"),
				"@constants": path.resolve(import.meta.dirname, "./src/constants"),
				"@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
				"@stores": path.resolve(import.meta.dirname, "./src/stores"),
				// "types/" is aliased as "@type" (singular) — tsc special-cases
				// "@types/*" specifiers as DefinitelyTyped packages (TS6137).
				"@type": path.resolve(import.meta.dirname, "./src/types"),
				// Vendored component library (formerly @animo-gaming/ui), addressed
				// like the npm package it replaced.
				"@hooked-ui": path.resolve(import.meta.dirname, "./src/hooked-ui/index.ts")
			}
		},
		test: {
			environment: "happy-dom",
			globals: true,
			pool: "threads",
			setupFiles: ["./src/vitest.setup.ts"],
			// Tests are colocated with the code they cover, so this has to span
			// the whole tree — a glob scoped to one directory silently ignores
			// every test that follows the convention.
			include: ["src/**/*.test.{ts,tsx}"],
			coverage: {
				provider: "v8",
				// Without an explicit include, v8 only measures files a test happened
				// to import — an untested file reads as absent rather than as 0%, and
				// the thresholds below can then never fail.
				include: ["src/**/*.{ts,tsx}"],
				// Test files and the setup file are excluded so they can't pad the
				// numbers: a colocated *.test.tsx sits inside the include glob and
				// would otherwise count as 100%-covered source.
				//
				// App.tsx, SceneManager and PlaceholderScene are excluded for the
				// same reason as main.tsx: thin Pixi-rendering wiring with no logic
				// of its own (the logic lives in useGameBootstrap/useCrossfade,
				// which ARE covered) — and @pixi/react needs a real WebGL/WebGPU
				// canvas, which happy-dom doesn't provide, so rendering them in a
				// test wouldn't work anyway. Revisit if this project sets up a real
				// Pixi test renderer.
				exclude: [
					"src/**/*.test.{ts,tsx}",
					"src/vitest.setup.ts",
					"src/main.tsx",
					"src/App.tsx",
					"src/components/SceneManager/SceneManager.tsx",
					"src/components/PlaceholderScene/PlaceholderScene.tsx",
					// Same reason as PlaceholderScene: thin @pixi/react wiring, no
					// logic of its own (that's in layers.ts, which IS covered), and
					// it needs a real WebGL canvas happy-dom can't give.
					"src/components/HarbourScene/HarbourScene.tsx",
					"src/**/*.d.ts",
					"src/**/index.ts",
					// hooked-ui (vendored from @animo-gaming/ui): stories aren't
					// logic, and its vitest setup file mirrors src/vitest.setup.ts.
					"src/hooked-ui/**/*.stories.tsx",
					"src/hooked-ui/test/**"
				],
				// 80% is the team target. Adjust per-project only with a reason —
				// this is meant to hold, not to be lowered on friction.
				thresholds: {
					lines: 80,
					statements: 80,
					functions: 80,
					branches: 80
				}
			}
		}
	};
});

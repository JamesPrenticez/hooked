import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";

// @hooked-ui's own index.ts side-effect-imports its tokens.css, so nothing
// extra is needed here.
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>
);

import { useEffect } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";

import "../src/hooked-ui/styles/tokens.css";

export const globalTypes = {
	theme: {
		description: "Animo theme variant",
		toolbar: {
			title: "Theme",
			icon: "paintbrush",
			items: [
				{ value: "default", title: "Default" },
				{ value: "green", title: "Green" },
				{ value: "neon-green", title: "Neon Green" },
				{ value: "gold", title: "Gold" },
				{ value: "purple", title: "Purple" }
			],
			dynamicTitle: true
		}
	}
};

export const initialGlobals = {
	theme: "default"
};

// Themes are selected by an attribute on the root element, exactly as the
// app does it.
const WithTheme: Decorator = (Story, context) => {
	const theme = context.globals.theme as string;

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "default") {
			root.removeAttribute("data-theme");
		} else {
			root.setAttribute("data-theme", theme);
		}
	}, [theme]);

	return <Story />;
};

export const decorators = [WithTheme];

const preview: Preview = {
	parameters: {
		options: {
			storySort: {
				order: ["Getting Started", "Foundations", "Components"]
			}
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		backgrounds: {
			options: {
				dark: { name: "Dark", value: "#080808" },
				light: { name: "Light", value: "#f8f8ff" }
			}
		},
		a11y: { test: "todo" }
	},
	initialGlobals: {
		backgrounds: { value: "light" }
	}
};

export default preview;

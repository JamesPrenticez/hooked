import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Button } from "./button";

const meta = {
	title: "Components/Button",
	component: Button,
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"A text button. It takes every native `<button>` prop — `onClick`, `disabled`, " +
					"`form` — on top of `variant`.\n\n" +
					"`primary` is the default and needs no attribute. `secondary` and `negative` render " +
					"as `data-variant` on the root."
			}
		}
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["primary", "secondary", "negative", "flat"]
		},
		disabled: { control: "boolean" },
		onClick: { table: { disable: true } }
	},
	args: {
		children: "Place bet"
	}
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
	args: { variant: "secondary" }
};
export const Flat: Story = {
	args: { variant: "flat" }
};

export const Negative: Story = {
	args: { variant: "negative", children: "Cancel bet" }
};

export const Disabled: Story = {
	args: { disabled: true }
};

/*
 * Interaction test: keyboard focus must show the ring. Only a real renderer
 * can confirm it — jsdom applies no CSS, and whether :focus-visible matches is
 * a browser heuristic. See DESIGN_GUIDELINES.md, "Interaction tests".
 */
export const KeyboardFocus: Story = {
	play: async ({ canvas, userEvent }) => {
		const button = canvas.getByRole("button", { name: "Place bet" });

		await userEvent.tab();
		await expect(button).toHaveFocus();

		const { outlineStyle, outlineWidth } = getComputedStyle(button);
		await expect(outlineStyle).toBe("solid");
		await expect(outlineWidth).toBe("2px");
	}
};

export const Row: Story = {
	render: args => (
		<div style={{ display: "flex", gap: "1rem" }}>
			<Button {...args} variant="primary">
				Place bet
			</Button>
			<Button {...args} variant="secondary">
				Skip
			</Button>
			<Button {...args} variant="negative">
				Cancel
			</Button>
		</div>
	)
};

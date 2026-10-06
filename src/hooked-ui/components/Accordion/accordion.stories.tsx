import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Accordion } from "./accordion";

const meta = {
	title: "Components/Accordion",
	component: Accordion,
	tags: ["autodocs"],
	argTypes: {
		title: { control: "text" },
		theme: { control: "inline-radio", options: ["light", "dark"] },
		open: { control: "boolean" }
	},
	args: {
		title: "Environment",
		children: "Section content goes here."
	}
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
	args: { open: true }
};

export const Dark: Story = {
	args: { theme: "dark", open: true },
	globals: {
		backgrounds: { value: "dark" }
	}
};

/** Independent sections: opening one does not close the others. */
export const Group: Story = {
	render: args => (
		<div>
			<Accordion {...args} title="Environment" open>
				Time of day and freeze controls.
			</Accordion>
			<Accordion {...args} title="Hook">
				Depth zones and speeds.
			</Accordion>
		</div>
	)
};

/* Interaction test: clicking the title toggles the content. */
export const Toggles: Story = {
	play: async ({ canvas, userEvent }) => {
		const summary = canvas.getByText("Environment");
		const details = summary.closest("details");
		if (!details) throw new Error("expected a <details> root");

		await expect(details).not.toHaveAttribute("open");
		await userEvent.click(summary);
		await expect(details).toHaveAttribute("open");
		await userEvent.click(summary);
		await expect(details).not.toHaveAttribute("open");
	}
};

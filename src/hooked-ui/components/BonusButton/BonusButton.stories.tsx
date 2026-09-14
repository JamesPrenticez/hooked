import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { BonusButton } from "./BonusButton";

const meta = {
	title: "Components/BonusButton",
	component: BonusButton,
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"A square icon-and-label button. It takes every native `<button>` prop — `onClick`, " +
					"`disabled`, `form` — on top of `label`.\n\n" +
					"Below 1024px the button shrinks and the text is dropped, leaving the icon. The label " +
					"is also the `aria-label`, so the button keeps its name at every size.\n\n" +
					"The gold gradient marks it as a real-money affordance, so unlike the rest of the kit " +
					"it does not follow the theme. Hover and press brighten and darken the whole button " +
					"via a `filter`, so the icon (drawn in `currentColor`, fixed white) never disagrees " +
					"with its background."
			}
		}
	},
	argTypes: {
		label: { control: "text" },
		disabled: { control: "boolean" },
		onClick: { table: { disable: true } }
	},
	args: {
		label: ""
	}
} satisfies Meta<typeof BonusButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
	args: { disabled: true }
};

export const LongLabel: Story = {
	args: { label: "Free spins" }
};

/*
 * Interaction test: keyboard focus must show the ring. Only a real renderer
 * can confirm it — jsdom applies no CSS, and whether :focus-visible matches is
 * a browser heuristic. See DESIGN_GUIDELINES.md, "Interaction tests".
 */
export const KeyboardFocus: Story = {
	args: { label: "Bonus" },
	play: async ({ canvas, userEvent }) => {
		const button = canvas.getByRole("button", { name: "Bonus" });

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
			<BonusButton {...args} label="Bonus" />
			<BonusButton {...args} label="Free spins" />
			<BonusButton {...args} label="Jackpot" disabled />
		</div>
	)
};

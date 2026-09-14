import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { IconButton } from "./IconButton";
import { AudioFullIcon, MenuIcon, TurboIcon } from "../../icons";

const meta = {
	title: "Components/IconButton",
	component: IconButton,
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"A square, icon-only button. It takes every native `<button>` prop — `onClick`, " +
					"`disabled`, `form` — on top of `icon`.\n\n" +
					"There is no visible label, so `aria-label` names the button and is required. " +
					"`active` renders `aria-pressed`, for a button that toggles a mode (mute, turbo) " +
					"rather than navigating away."
			}
		}
	},
	argTypes: {
		icon: { table: { disable: true } },
		active: { control: "boolean" },
		disabled: { control: "boolean" },
		onClick: { table: { disable: true } }
	},
	args: {
		icon: <AudioFullIcon aria-hidden="true" />,
		"aria-label": "Mute"
	}
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
	args: { active: true }
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
		const button = canvas.getByRole("button", { name: "Mute" });

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
			<IconButton {...args} icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" />
			<IconButton {...args} icon={<TurboIcon aria-hidden="true" />} aria-label="Turbo" active />
			<IconButton {...args} icon={<MenuIcon aria-hidden="true" />} aria-label="Menu" disabled />
		</div>
	)
};

import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Toggle } from "./toggle";

const meta = {
	title: "Components/Toggle",
	component: Toggle,
	tags: ["autodocs"],
	argTypes: {
		value: { control: "boolean" },
		onValueChange: { table: { disable: true } }
	},
	args: {
		"aria-label": "Sound"
	}
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof Toggle>) => {
	const [value, setValue] = useState(props.value);
	return <Toggle {...props} value={value} onValueChange={setValue} />;
};

export const Default: Story = {
	args: {
		value: false,
		onValueChange: () => {}
	},
	render: args => <Interactive {...args} />
};

export const Checked: Story = {
	args: {
		value: true,
		onValueChange: () => {}
	},
	render: args => <Interactive {...args} />
};

export const Disabled: Story = {
	args: {
		value: false,
		onValueChange: () => {},
		disabled: true
	}
};

/*
 * Interaction test: keyboard focus must show the ring. Only a real renderer
 * can confirm it — jsdom applies no CSS. See DESIGN_GUIDELINES.md,
 * "Interaction tests".
 */
export const KeyboardFocus: Story = {
	args: {
		value: false,
		onValueChange: () => {}
	},
	play: async ({ canvas, userEvent }) => {
		const toggle = canvas.getByRole("switch", { name: "Sound" });

		await userEvent.tab();
		await expect(toggle).toHaveFocus();

		const { outlineStyle, outlineWidth } = getComputedStyle(toggle);
		await expect(outlineStyle).toBe("solid");
		await expect(outlineWidth).toBe("2px");
	}
};

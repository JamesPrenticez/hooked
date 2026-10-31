import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Checkbox } from "./checkbox";

const meta = {
	title: "Components/Checkbox",
	component: Checkbox,
	tags: ["autodocs"],
	argTypes: {
		value: { control: "boolean" },
		onValueChange: { table: { disable: true } }
	},
	args: {
		"aria-label": "Accept terms"
	}
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof Checkbox>) => {
	const [value, setValue] = useState(props.value);
	return <Checkbox {...props} value={value} onValueChange={setValue} />;
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

export const Dark: Story = {
	args: {
		value: false,
		onValueChange: () => {},
		theme: "dark"
	},
	globals: {
		backgrounds: { value: "dark" }
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
		const checkbox = canvas.getByRole("checkbox", { name: "Accept terms" });

		await userEvent.tab();
		await expect(checkbox).toHaveFocus();

		const box = checkbox.nextElementSibling;
		if (!box) throw new Error("expected a sibling element for the visual box");
		const { outlineStyle, outlineWidth } = getComputedStyle(box);
		await expect(outlineStyle).toBe("solid");
		await expect(outlineWidth).toBe("2px");
	}
};

import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { IncrementSelector } from "./IncrementSelector";

const meta = {
	title: "Components/IncrementSelector",
	component: IncrementSelector,
	tags: ["autodocs"],
	argTypes: {
		options: { control: "object" },
		value: { control: "number" },
		onValueChange: { table: { disable: true } }
	},
	args: {
		"aria-label": "Increment"
	}
} satisfies Meta<typeof IncrementSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof IncrementSelector>) => {
	const [value, setValue] = useState(props.value);
	return <IncrementSelector {...props} value={value} onValueChange={setValue} />;
};

export const Default: Story = {
	args: {
		options: [5, 10, 25, 50, 100],
		value: 10,
		onValueChange: () => {}
	},
	render: args => <Interactive {...args} />
};

export const TwoOptions: Story = {
	args: {
		options: [1, 2],
		value: 1,
		onValueChange: () => {}
	},
	render: args => <Interactive {...args} />
};

export const LargeValues: Story = {
	args: {
		options: [100, 500, 1000, 5000, 10000],
		value: 1000,
		onValueChange: () => {}
	},
	render: args => <Interactive {...args} />
};

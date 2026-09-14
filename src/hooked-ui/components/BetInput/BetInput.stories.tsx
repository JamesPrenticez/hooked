import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { BetInput } from "./BetInput";

const INCREMENTS = [5, 10, 25, 50, 100, 250, 500, 1000];

const meta = {
	title: "Components/BetInput",
	component: BetInput,
	tags: ["autodocs"],
	argTypes: {
		orientation: { control: "radio", options: ["horizontal", "vertical"] },
		growDirection: { control: "radio", options: ["up", "push"] },
		increments: { control: "object" },
		value: { control: "number" },
		format: { table: { disable: true } },
		onValueChange: { table: { disable: true } }
	},
	args: {
		label: "Bet",
		increments: INCREMENTS,
		value: 25,
		format: (value: number) => `$${value}`,
		disabled: false,
		quickSelect: false,
		growFromInput: false,
		growDirection: "up",
		fullWidth: false,
		onValueChange: () => {}
	}
} satisfies Meta<typeof BetInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof BetInput>) => {
	const [value, setValue] = useState(props.value);
	return <BetInput {...props} value={value} onValueChange={setValue} />;
};

export const Default: Story = {
	render: args => <Interactive {...args} />
};

export const Vertical: Story = {
	args: {
		orientation: "vertical"
	},
	render: args => <Interactive {...args} />
};

export const QuickSelectPortaled: Story = {
	args: {
		quickSelect: true
	},
	render: args => (
		<div style={{ marginTop: "230px" }}>
			<Interactive {...args} />
		</div>
	)
};

export const QuickSelectGrowUp: Story = {
	args: {
		quickSelect: true,
		growFromInput: true,
		growDirection: "up"
	},
	render: args => (
		<div style={{ marginTop: "230px" }}>
			<p>Content below the input, pushed down as the popup opens.</p>
			<Interactive {...args} />
		</div>
	)
};

export const QuickSelectGrowPush: Story = {
	args: {
		quickSelect: true,
		growFromInput: true,
		growDirection: "push"
	},
	render: args => (
		<div>
			<Interactive {...args} />
			<p>Content below the input, pushed down as the popup opens.</p>
		</div>
	)
};

export const Disabled: Story = {
	args: {
		disabled: true
	}
};

export const FullWidth: Story = {
	args: {
		fullWidth: true
	},
	render: args => (
		<div style={{ width: "32rem" }}>
			<Interactive {...args} />
		</div>
	)
};

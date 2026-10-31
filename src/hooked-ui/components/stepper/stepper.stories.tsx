import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stepper } from "./stepper";

const meta = {
	title: "Components/Stepper",
	component: Stepper,
	tags: ["autodocs"],
	argTypes: {
		orientation: { control: "radio", options: ["horizontal", "vertical"] },
		value: { control: "number" },
		format: { table: { disable: true } },
		onIncrement: { table: { disable: true } },
		onDecrement: { table: { disable: true } },
		onValueClick: { table: { disable: true } }
	},
	args: {
		orientation: "horizontal",
		label: "Bet",
		value: 10,
		format: (value: number) => String(value),
		disabled: false,
		atMin: false,
		atMax: false,
		decLabel: "−",
		incLabel: "+",
		clickable: false,
		onIncrement: () => {},
		onDecrement: () => {},
		onValueClick: () => {}
	}
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof Stepper>) => {
	const [value, setValue] = useState(props.value);
	return (
		<Stepper
			{...props}
			value={value}
			atMin={value <= 0}
			atMax={value >= 100}
			onIncrement={() => setValue(v => v + 5)}
			onDecrement={() => setValue(v => v - 5)}
		/>
	);
};

export const Default: Story = {
	render: args => <Interactive {...args} />
};

export const Vertical: Story = {
	args: {
		orientation: "vertical",
		decLabel: "∨",
		incLabel: "∧"
	},
	render: args => <Interactive {...args} />
};

export const Clickable: Story = {
	args: {
		clickable: true
	},
	render: args => <Interactive {...args} />
};

export const AtMin: Story = {
	args: {
		value: 0,
		atMin: true
	}
};

export const AtMax: Story = {
	args: {
		value: 100,
		atMax: true
	}
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

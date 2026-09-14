import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { StepperPopup } from "./StepperPopup";

const BET_INCREMENTS_UPDATED = [
	0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 30, 40, 50, 75,
	100, 150, 200, 250, 300, 350, 400, 450, 500, 750, 1000
];
const meta = {
	title: "Components/StepperPopup",
	component: StepperPopup,
	tags: ["autodocs"],
	argTypes: {
		values: { control: "object" },
		value: { control: "number" },
		format: { table: { disable: true } },
		onValueSelect: { table: { disable: true } },
		onClose: { table: { disable: true } },
		anchor: { table: { disable: true } }
	},
	args: {
		label: "Bet",
		values: BET_INCREMENTS_UPDATED,
		value: 10,
		format: (value: number) => String(value),
		isOpen: true,
		growFromInput: true,
		close: false,
		growDirection: "up",
		anchor: null,
		onValueSelect: () => {},
		onClose: () => {}
	}
} satisfies Meta<typeof StepperPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = (props: ComponentProps<typeof StepperPopup>) => {
	const [value, setValue] = useState(props.value);
	const [isOpen, setIsOpen] = useState(props.isOpen);
	return (
		<div style={{ position: "relative", paddingTop: "1rem" }}>
			<StepperPopup
				{...props}
				value={value}
				isOpen={isOpen}
				onValueSelect={setValue}
				onClose={() => setIsOpen(false)}
			/>
		</div>
	);
};

export const Default: Story = {
	args: {
		growDirection: "push"
	},
	render: args => <Interactive {...args} />
};

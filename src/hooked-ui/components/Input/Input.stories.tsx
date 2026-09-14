import { type ComponentProps, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./Input";
import { MenuIcon } from "../../icons";

const meta = {
	title: "Components/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {
		onValueChange: { table: { disable: true } },
		onIconClick: { table: { disable: true } }
	},
	args: {
		label: "Amount",
		value: "",
		onValueChange: () => {}
	}
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

// The component is controlled, so stories need local state to be interactive.
const Interactive = (props: ComponentProps<typeof Input>) => {
	const [value, setValue] = useState(props.value);
	return <Input {...props} value={value} onValueChange={setValue} />;
};

export const Default: Story = {
	render: args => <Interactive {...args} />
};

export const WithIconButton: Story = {
	args: {
		value: "10.00",
		icon: <MenuIcon />,
		iconLabel: "Open options",
		onIconClick: () => {}
	},
	render: args => <Interactive {...args} />
};

export const ReadOnly: Story = {
	args: {
		value: "10.00",
		readOnly: true,
		icon: <MenuIcon />,
		iconLabel: "Open options",
		onIconClick: () => {}
	},
	render: args => <Interactive {...args} />
};

export const Disabled: Story = {
	args: {
		value: "10.00",
		disabled: true,
		icon: <MenuIcon />,
		iconLabel: "Open options",
		onIconClick: () => {}
	},
	render: args => <Interactive {...args} />
};

export const LongLabelAndValue: Story = {
	args: {
		label: "A rather long label that has to wrap on a narrow phone screen",
		value: "123456789012345678901234567890"
	},
	render: args => <Interactive {...args} />
};

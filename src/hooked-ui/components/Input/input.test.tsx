import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

const icon = <svg aria-hidden="true" focusable="false" />;

describe("Input", () => {
	it("labels the field with its label prop", () => {
		render(<Input label="Amount" value="" onValueChange={vi.fn()} />);

		expect(screen.getByRole("textbox", { name: "Amount" })).toBeInTheDocument();
	});

	it("calls onValueChange with the typed value", async () => {
		const onValueChange = vi.fn();
		render(<Input label="Amount" value="" onValueChange={onValueChange} />);

		await userEvent.type(screen.getByRole("textbox"), "a");

		expect(onValueChange).toHaveBeenCalledWith("a");
	});

	it("does not accept input when disabled", async () => {
		const onValueChange = vi.fn();
		render(<Input label="Amount" value="" onValueChange={onValueChange} disabled />);

		await userEvent.type(screen.getByRole("textbox"), "a");

		expect(screen.getByRole("textbox")).toBeDisabled();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("does not accept input when read only, but keeps the value selectable", async () => {
		const onValueChange = vi.fn();
		render(<Input label="Amount" value="10" onValueChange={onValueChange} readOnly />);

		const input = screen.getByRole("textbox");
		await userEvent.type(input, "a");

		expect(input).toHaveValue("10");
		expect(input).not.toBeDisabled();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("calls onIconClick when the icon button is pressed", async () => {
		const onIconClick = vi.fn();
		render(
			<Input
				label="Amount"
				value=""
				onValueChange={vi.fn()}
				icon={icon}
				iconLabel="Set max"
				onIconClick={onIconClick}
			/>
		);

		await userEvent.click(screen.getByRole("button", { name: "Set max" }));

		expect(onIconClick).toHaveBeenCalledTimes(1);
	});

	it("keeps the icon button usable when read only, and disables it with the field", async () => {
		const onIconClick = vi.fn();
		const { rerender } = render(
			<Input
				label="Amount"
				value="10"
				onValueChange={vi.fn()}
				readOnly
				icon={icon}
				iconLabel="Set max"
				onIconClick={onIconClick}
			/>
		);

		await userEvent.click(screen.getByRole("button", { name: "Set max" }));
		expect(onIconClick).toHaveBeenCalledTimes(1);

		rerender(
			<Input
				label="Amount"
				value="10"
				onValueChange={vi.fn()}
				disabled
				icon={icon}
				iconLabel="Set max"
				onIconClick={onIconClick}
			/>
		);

		expect(screen.getByRole("button", { name: "Set max" })).toBeDisabled();
	});

	it("renders no button without an icon", () => {
		render(<Input label="Amount" value="" onValueChange={vi.fn()} />);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("spreads unknown props onto the input", () => {
		render(<Input label="Amount" value="" onValueChange={vi.fn()} placeholder="0.00" name="amount" />);

		expect(screen.getByPlaceholderText("0.00")).toHaveAttribute("name", "amount");
	});
});

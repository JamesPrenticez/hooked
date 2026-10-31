import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { MultiplierList } from "./multiplier-list";

test("renders nothing for an empty list", () => {
	const { container } = render(<MultiplierList items={[]} />);
	expect(container).toBeEmptyDOMElement();
});

test("lists biggest multiplier first", () => {
	render(
		<MultiplierList
			items={[
				{ id: "a", label: "A", multiplier: 100 },
				{ id: "b", label: "B", multiplier: 250.5 }
			]}
		/>
	);
	expect(screen.getAllByRole("listitem").map(li => li.textContent)).toEqual(["B×250.5", "A×100"]);
});

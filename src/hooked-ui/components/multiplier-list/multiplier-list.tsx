import { type CSSProperties, memo, useMemo } from "react";
import styled, { keyframes } from "styled-components";

import { formatMultiplier } from "@utils/formatMultiplier";

const slideIn = keyframes`
	to {
		transform: translateX(0);
		opacity: 1;
	}
`;

const List = styled.ul`
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	margin: 0;
	padding: 0;
	list-style: none;
`;

const Item = styled.li`
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	box-sizing: border-box;
	width: 15.6rem;
	height: 5.25rem;
	padding: 0.3rem;
	border: var(--border-thickness) solid var(--item-color, transparent);
	border-left: 0;
	border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
	background: color-mix(in srgb, var(--color-black) 80%, transparent);
	color: var(--color-primary);
	font: var(--font-weight-semibold) var(--font-size-sm) / 1 var(--font-text);
	font-variant-numeric: tabular-nums;
	opacity: 0;
	transform: translateX(-2rem);
	animation: ${slideIn} 250ms ease forwards;

	@media (prefers-reduced-motion: reduce) {
		animation-duration: 0s;
	}
`;

const Icon = styled.span`
	display: grid;
	flex: none;
	place-items: center;
	width: 4.8rem;
	height: 4.2rem;
	overflow: hidden;
	color: var(--color-white);
	font: var(--font-text-legal);
	line-height: 1;

	img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
`;

const Value = styled.span`
	flex: 1;
	text-align: center;
`;

export interface MultiplierItem {
	id: string;
	/** Drawn in place of `image`, and as its alt text. */
	label: string;
	image?: string;
	/** CSS colour for the item's border. */
	color?: string;
	multiplier: number;
}

export interface MultiplierListProps {
	items?: MultiplierItem[];
	/** Delay before the first item slides in, in ms. */
	initialDelay?: number;
}

/** Items stagger in from the left every `STEP_MS`, biggest multiplier first. */
const STEP_MS = 300;

/** A column of multipliers, each beside its icon, biggest first. Renders nothing for an empty list. */
export const MultiplierList = memo(({ items, initialDelay = 0 }: MultiplierListProps) => {
	const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => b.multiplier - a.multiplier), [items]);
	if (!sorted.length) return null;

	return (
		<List>
			{sorted.map(({ id, label, image, color, multiplier }, index) => (
				<Item
					key={id}
					style={{ animationDelay: `${initialDelay + index * STEP_MS}ms`, "--item-color": color } as CSSProperties}
				>
					<Icon>{image ? <img src={image} alt={label} /> : label}</Icon>
					<Value>×{formatMultiplier(multiplier)}</Value>
				</Item>
			))}
		</List>
	);
});
MultiplierList.displayName = "MultiplierList";

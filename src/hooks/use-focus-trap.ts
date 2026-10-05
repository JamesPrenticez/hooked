import { type RefObject, useEffect } from "react";

// Overlays can stack (bonus modal -> automine modal); only the topmost one traps.
const stack: HTMLElement[] = [];
let inerted: Element[] = [];

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const applyTrap = () => {
	for (const el of inerted) el.removeAttribute("inert");
	inerted = [];

	for (let node = stack.at(-1); node && node !== document.body; node = node.parentElement ?? undefined) {
		for (const sibling of node.parentElement?.children ?? []) {
			if (sibling === node || sibling.hasAttribute("inert")) continue;
			sibling.setAttribute("inert", "");
			inerted.push(sibling);
		}
	}
};

/**
 * Makes everything on the page outside `ref` inert, so Tab cycles through the
 * element's controls and then out to the browser UI, never to the page behind it.
 * The first Tab while focus is outside the element lands on its first control,
 * and focus returns to whatever opened it on unmount.
 */
export const useFocusTrap = (ref: RefObject<HTMLElement | null>, active = true) => {
	useEffect(() => {
		const el = ref.current;
		if (!active || !el) return;
		const opener = document.activeElement;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Tab" || stack.at(-1) !== el || el.contains(document.activeElement)) return;
			// Skip controls hidden by CSS (e.g. mobile-only tabs on desktop); focusing those is a no-op.
			const first = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].find(n => n.getClientRects().length > 0);
			if (!first) return;
			e.preventDefault();
			first.focus();
		};

		stack.push(el);
		applyTrap();
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			stack.splice(stack.indexOf(el), 1);
			applyTrap();
			if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
		};
	}, [ref, active]);
};

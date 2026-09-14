/**
 * Merges the kit's own class with an optional caller-supplied one, so a
 * consumer's `className` extends a component's styling instead of replacing
 * it. Internal only — never exported from the kit.
 *
 * Takes `string | undefined` throughout, not just for the caller's
 * `className`: under this repo's `noUncheckedIndexedAccess`, a CSS module's
 * generated types (`vite/client`) type every class name as `string |
 * undefined` too, since the module is typed via an index signature.
 *
 * This is also the supported way to give a single instance its own colours:
 * a class set directly on a component's root (not on some shared ancestor)
 * can freely redefine any `--animo-*` custom property, because the override
 * only cascades to that instance and its own descendants — never to a
 * sibling elsewhere in the subtree that happens to read the same token.
 */
export const mergeClassNames = (...classNames: (string | undefined)[]) => classNames.filter(Boolean).join(" ");

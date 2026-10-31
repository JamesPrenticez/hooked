import { ICONS } from "@hooked-ui";

import { SideTrigger } from "./side-trigger";

/** Placeholder: holds the top of the left-hand button column until the menu exists. */
export const MenuSection = () => <SideTrigger $slot={2} aria-label="Menu" title="Menu" icon={ICONS.HamburgerIcon} />;

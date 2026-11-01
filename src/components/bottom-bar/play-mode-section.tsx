import styled from "styled-components";

import { IconButton, ICONS } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

/* Desktop only for now: phones have no room left in the floating button rows. */
const Trigger = styled(IconButton)`
	display: none;

	@media ${breakpoint.tablet} {
		display: flex;
		pointer-events: auto;
		width: var(--size-control);
		height: var(--size-control);
	}
`;

/** Placeholder: does nothing yet. */
export const AutoplaySection = () => <Trigger aria-label="Autoplay" title="Autoplay" icon={ICONS.AutoPlayIcon} />;

/** Placeholder: does nothing yet. */
export const TurboSection = () => <Trigger aria-label="Turbo mode" title="Turbo mode" icon={ICONS.SkipIcon} />;

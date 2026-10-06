import styled from "styled-components";

export const CloseButton = styled.button`
	padding: var(--spacing-sm);
	background: color-mix(in srgb, var(--color-white) 10%, transparent);
	border-radius: var(--border-radius-md);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	text-align: center;

	svg {
		width: 2.4rem;
	}

	&:hover {
		color: black;
		background: var(--color-white);
	}

	&:focus-visible {
		border: 1px solid var(--color-primary);
	}
`;

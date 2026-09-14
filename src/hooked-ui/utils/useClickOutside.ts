import { type RefObject, useEffect } from "react";

export const useClickOutside = (ref: RefObject<HTMLElement | null>, callback: () => void) => {
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!ref.current) return;

			if (event.target instanceof Node && ref.current.contains(event.target)) {
				return;
			}

			if ((event.target as HTMLElement).closest("[data-ignore-click-away]")) {
				return;
			}

			callback();
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [ref, callback]);
};

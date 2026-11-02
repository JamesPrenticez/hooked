import { useCallback, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-width: 0;
	overflow: hidden;

	> span {
		flex: none;
		white-space: nowrap;
		transform-origin: center;
		will-change: transform;
	}
`;

// Measures the inner text against its container and returns a scale factor that
// only ever shrinks (<= 1). `scrollWidth` is the element's layout width and
// ignores the applied transform, so feeding the scaled value back never loops.
// Re-measures on container resize and on text resize (content change or late
// web-font swap).
const useFitScale = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLSpanElement>(null);
	const [scale, setScale] = useState(1);

	const measure = useCallback(() => {
		const container = containerRef.current;
		const inner = innerRef.current;
		if (!container || !inner) return;

		// clientWidth includes padding; the text only gets the content box.
		const { paddingLeft, paddingRight } = getComputedStyle(container);
		const available = container.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
		const natural = inner.scrollWidth;
		if (available <= 0 || !natural) return;

		setScale(Math.min(1, available / natural));
	}, []);

	useLayoutEffect(() => {
		measure();

		const container = containerRef.current;
		const inner = innerRef.current;
		if (!container || typeof ResizeObserver === "undefined") return;

		// Observe the text too, not just the container: a late web-font swap
		// widens `inner` without changing the container, and static text never
		// re-runs this effect otherwise, so `scale` would stay stuck at 1.
		// ResizeObserver reports the content-box, which `transform: scale()`
		// does not affect, so applying the scale can't loop back in here.
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		if (inner) observer.observe(inner);

		return () => observer.disconnect();
	}, [measure]);

	return { containerRef, innerRef, scale };
};

type FitTextProps = {
	children?: React.ReactNode;
	className?: string;
};

// Shrinks a single line of text so it fits its container instead of overflowing
// when the content runs long (e.g. a 999999999X multiplier). Applies a downward
// `transform: scale(...)` — it never scales past the inherited font size. Style
// the text through `> span`, either here or from the class you pass in.
export const FitText = ({ children, className }: FitTextProps) => {
	const { containerRef, innerRef, scale } = useFitScale();

	return (
		<Container className={className} ref={containerRef}>
			<span ref={innerRef} style={{ transform: `scale(${scale})` }}>
				{children}
			</span>
		</Container>
	);
};

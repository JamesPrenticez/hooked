export const viewportMobileDV = (
	pixels: number,
	direction: "width" | "height",
	orientation: "portrait" | "landscape"
) => {
	const unit = direction === "width" ? "dvw" : "dvh";
	const maxSize =
		(orientation === "landscape" && direction === "width") || (orientation === "portrait" && direction === "height")
			? "var(--mobile-longest-design-size)"
			: "var(--mobile-shortest-design-size)";

	return `calc((${pixels} / ${maxSize} * 100) * 1${unit})`;
};

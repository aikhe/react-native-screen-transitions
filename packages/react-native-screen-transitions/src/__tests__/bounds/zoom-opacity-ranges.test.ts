import { beforeEach, describe, expect, it } from "bun:test";
import { createScreenTransitionState } from "../../constants";
import { BoundStore } from "../../stores/bounds";
import { createScreenPairKey } from "../../stores/bounds/helpers/link-pairs.helpers";
import type {
	BoundsInterpolationProps,
	BoundsNavigationZoomOptions,
} from "../../types/bounds.types";
import { buildZoomStyles } from "../../utils/bounds/navigation/zoom/build";

const screen = { width: 390, height: 844 };
const nativeHandoff = {
	focusedElementOpacity: { open: [0, 0.5, 0, 1], close: [0.6, 1, 0, 1] },
	unfocusedElementOpacity: { open: [1, 2, 1, 0], close: [1.9, 2, 1, 0] },
} as const satisfies BoundsNavigationZoomOptions;

beforeEach(() => {
	globalThis.resetMutableRegistry();
	const pair = createScreenPairKey("grid", "detail");
	BoundStore.link.setSource(pair, "box", "grid", {
		x: 210, y: 400, pageX: 210, pageY: 400, width: 164, height: 164,
	}, { borderRadius: 32 });
	BoundStore.link.setDestination(pair, "box", "detail", {
		x: 16, y: 40, pageX: 16, pageY: 40, width: 358, height: 358,
	}, { borderRadius: 16 });
});

function frame(focused: boolean, progress: number, closing = false): BoundsInterpolationProps {
	const grid = createScreenTransitionState({ key: "grid", name: "Grid" });
	const detail = createScreenTransitionState({ key: "detail", name: "Detail" });
	grid.transitionProgress = grid.progress = 1;
	detail.transitionProgress = detail.progress = progress;
	detail.closing = closing ? 1 : 0;
	detail.animating = 1;
	detail.settled = 0;
	grid.layouts.screen = detail.layouts.screen = screen;
	return {
		current: focused ? detail : grid,
		previous: focused ? grid : undefined,
		next: focused ? undefined : detail,
		active: detail,
		inactive: grid,
		focused,
		progress: focused ? progress : 1 + progress,
		transitionProgress: focused ? progress : 1 + progress,
		stackProgress: focused ? progress : 1 + progress,
		layouts: { screen },
		insets: { top: 0, right: 0, bottom: 0, left: 0 },
	};
}

function opacity(focused: boolean, progress: number, closing = false, options = nativeHandoff) {
	const styles = buildZoomStyles({ tag: "box", props: frame(focused, progress, closing), zoomOptions: options });
	const slot = focused ? styles.content : styles.box;
	return slot && "style" in slot ? slot.style : undefined;
}

describe("custom zoom opacity handoff", () => {
	it("keeps the source tile moving beyond the default early opening handoff", () => {
		const source = opacity(false, 0.55);
		expect(source?.opacity).toBeCloseTo(0.45, 8);
		expect(source?.transform).not.toEqual([
			{ translateX: 0 }, { translateY: 0 }, { scaleX: 1 }, { scaleY: 1 },
		]);
	});

	it("fades the detail away early on close while the returning source stays opaque", () => {
		expect(opacity(true, 0.8, true)?.opacity).toBeCloseTo(0.5, 8);
		expect(opacity(true, 0.6, true)?.opacity).toBe(0);
		expect(opacity(true, 0.4, true)?.opacity).toBe(0);
		expect(opacity(false, 0.8, true)?.opacity).toBe(1);
		expect(opacity(false, 0.95, true)?.opacity).toBeCloseTo(0.5, 8);
	});

	it("preserves existing defaults when no opacity curves are supplied", () => {
		const props = frame(true, 0.5, true);
		const styles = buildZoomStyles({ tag: "box", props });
		const content = styles.content;
		expect(content && "style" in content ? content.style?.opacity : undefined).toBeCloseTo((0.5 - 0.13) / (0.7 - 0.13), 8);
	});

	it("uses the preset output opacities for input-only ranges", () => {
		const styles = buildZoomStyles({ tag: "box", props: frame(false, 0.5), zoomOptions: { unfocusedElementOpacity: { open: [1.2, 1.8] } } });
		const source = styles.box;
		expect(source && "style" in source ? source.style?.opacity : undefined).toBeCloseTo(0.5, 8);
	});
});

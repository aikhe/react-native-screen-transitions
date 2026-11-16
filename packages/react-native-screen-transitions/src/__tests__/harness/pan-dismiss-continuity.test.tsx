import { expect, it } from "bun:test";
import type { ScreenInterpolationProps } from "../../types/animation.types";
import { installHarness } from "./install";

const sim = installHarness({ os: "android", window: { width: 360, height: 800 } });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { mountStack } = await import("./stack-harness");
const { interpolate } = await import("react-native-reanimated");

const spring = { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true };
const slide = {
	gestureEnabled: true,
	gestureDirection: "horizontal",
	transitionSpec: { open: spring, close: spring },
	screenStyleInterpolator: ({ progress, active, layouts: { screen } }: ScreenInterpolationProps) => ({
		content: { style: {
			transform: [{ translateX: interpolate(progress, [0, 1, 2], [screen.width, 0, -screen.width * 0.3]) }],
			borderRadius: active.animating ? 20 : 0,
			overflow: "hidden",
		} },
	}),
};

const screens = [
	{ name: "Tabs", options: {
		transitionSpec: { open: spring, close: spring },
		screenStyleInterpolator: ({ progress }: ScreenInterpolationProps) => ({ content: { style: { opacity: Math.min(progress, 1) } } }),
	} },
	{ name: "Slide", options: slide },
];

for (const duration of [180, 350, 650]) {
	for (const openingFrames of [20, 200]) {
		it(`continues a ${duration}ms swipe without reversing after ${openingFrames} opening frames`, async () => {
			const stack = await mountStack(sim, { screens });
			try {
				await stack.settle();
				await stack.navigate("Slide");
				await stack.frames(openingFrames);
				const incoming = stack.trace.at(-1)?.scenes.find((scene) => scene.name === "Slide");
				if (!incoming) throw new Error("missing incoming slide");
				const result = await stack.gestures.drag({ x: incoming.rect.x + 24, y: 400 }, { x: 355, y: 400 }, duration);
				expect(result.target).toBe("Slide");
				expect(result.activated).toEqual(["pan"]);
				const released = stack.trace.length - 2;
				await stack.settle();
				const positions = stack.trace.slice(released).map((frame) => frame.scenes.find((scene) => scene.name === "Slide")?.rect.x).filter((x): x is number => x !== undefined);
				for (let index = 1; index < positions.length; index++) {
					expect(positions[index]!).toBeGreaterThanOrEqual(positions[index - 1]! - 0.1);
				}
				expect(stack.routes().map((route) => route.name)).toEqual(["Tabs"]);
				expect(stack.trace.at(-1)?.scenes.find((scene) => scene.name === "Tabs")?.rect.x).toBeCloseTo(0, 3);
			} finally {
				await stack.unmount();
			}
		});
	}
}

it("keeps a cancelled short swipe interruptible and allows the next long swipe to dismiss", async () => {
	const stack = await mountStack(sim, { screens });
	try {
		await stack.settle();
		await stack.navigate("Slide");
		await stack.settle();
		await stack.gestures.drag({ x: 24, y: 400 }, { x: 90, y: 400 }, 350, { holdMs: 150 });
		await stack.frames(4);
		const result = await stack.gestures.drag({ x: 120, y: 400 }, { x: 355, y: 400 }, 350);
		expect(result.target).toBe("Slide");
		const released = stack.trace.length - 2;
		await stack.settle();
		const positions = stack.trace.slice(released).map((frame) => frame.scenes.find((scene) => scene.name === "Slide")?.rect.x).filter((x): x is number => x !== undefined);
		for (let index = 1; index < positions.length; index++) {
			expect(positions[index]!).toBeGreaterThanOrEqual(positions[index - 1]! - 0.1);
		}
		expect(stack.routes().map((route) => route.name)).toEqual(["Tabs"]);
	} finally {
		await stack.unmount();
	}
});

import { describe, expect, it, mock } from "bun:test";
import { createReanimatedSim } from "./reanimated-sim";

const sim = createReanimatedSim();
mock.module("react-native-reanimated", () => sim.reanimated);
mock.module("react-native-worklets", () => sim.worklets);

const { withInternalTiming } = await import("../../utils/animation/timing/timing");
mock.module("../../utils/animation/timing", () => ({ withInternalTiming }));
const { animate } = await import("../../utils/animation/animate");

describe("transition delay", () => {
	it.each([
		{ duration: 120, delay: 100 },
		{ stiffness: 1000, damping: 500, mass: 3, delay: 100 },
	])("holds the sheet and its progress clock before starting: %j", (config) => {
		const progress = sim.reanimated.makeMutable(1);
		const clock = sim.reanimated.makeMutable(1);
		const completions: boolean[] = [];
		progress.set(animate(0, config, (state) => completions.push(state.finished), {
			value: clock,
			from: 1,
			to: 0,
		}));

		for (let frame = 0; frame < 5; frame++) sim.frame();
		expect(progress.get()).toBe(1);
		expect(clock.get()).toBe(1);
		expect(completions).toEqual([]);

		for (let frame = 0; frame < 600 && !sim.isIdle(); frame++) sim.frame();
		expect(sim.isIdle()).toBe(true);
		expect(progress.get()).toBe(0);
		expect(clock.get()).toBe(0);
		expect(completions.filter(Boolean)).toEqual([true]);
	});
});

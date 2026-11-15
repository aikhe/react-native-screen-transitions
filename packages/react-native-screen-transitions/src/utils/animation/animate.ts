import { type WithTimingConfig, withDelay } from "react-native-reanimated";
import { type SpringConfig, withInternalSpring } from "./spring";
import type { AnimationProgressDriver, AnimationStateCallback } from "./state";
import { withInternalTiming } from "./timing";

type AnimationDelayConfig = { delay?: number };

export type TimingAnimationConfig = WithTimingConfig & AnimationDelayConfig;
export type SpringAnimationConfig = SpringConfig & AnimationDelayConfig;
export type ScreenAnimationConfig =
	| SpringAnimationConfig
	| TimingAnimationConfig;

export const isSpringAnimationConfig = (
	config: ScreenAnimationConfig | undefined,
): config is SpringAnimationConfig => {
	"worklet";
	if (typeof config !== "object" || config === null) {
		return false;
	}

	return (
		"stiffness" in config ||
		"damping" in config ||
		"mass" in config ||
		"velocity" in config ||
		"overshootClamping" in config ||
		"energyThreshold" in config ||
		"dampingRatio" in config ||
		"clamp" in config
	);
};

export const animate = (
	toValue: number,
	config?: ScreenAnimationConfig,
	callback?: AnimationStateCallback,
	animationProgress?: AnimationProgressDriver,
): number => {
	"worklet";

	const { delay, ...animationConfig } = config ?? {};
	const animation = isSpringAnimationConfig(animationConfig)
		? withInternalSpring(toValue, animationConfig, callback, animationProgress)
		: withInternalTiming(toValue, animationConfig, callback, animationProgress);

	return typeof delay === "number" && Number.isFinite(delay) && delay > 0
		? withDelay(delay, animation, animationConfig.reduceMotion)
		: animation;
};

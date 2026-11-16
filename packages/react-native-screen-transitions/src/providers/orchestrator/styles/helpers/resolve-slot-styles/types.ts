import type { NormalizedTransitionInterpolatedStyle } from "../../../../../types/animation.types";

export type LocalStyleLayers = NormalizedTransitionInterpolatedStyle[];

/** A screen's local style layers and the screen whose interpolator owns them. */
export type OwnedStyleLayers = {
	layers: LocalStyleLayers;
	owner: string;
};

export type ResettableStyleState = {
	styleKeys?: Record<string, true>;
	styleResetValues?: Record<string, unknown>;
	propKeys?: Record<string, true>;
	propResetValues?: Record<string, unknown>;
};

export type ResettableStyleStatesBySlot = Record<string, ResettableStyleState>;

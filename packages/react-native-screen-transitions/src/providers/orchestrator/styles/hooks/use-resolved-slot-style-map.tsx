import {
	type SharedValue,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { NO_PROPS, NO_STYLES } from "../../../../constants";
import type { NormalizedTransitionInterpolatedStyle } from "../../../../types/animation.types";
import { useScreenRelationships } from "../../../builder/topology";
import { useOptionalOrchestratorStore } from "../../orchestrator.provider";
import {
	areResettableStatesBySlotEqual,
	type OwnedStyleLayers,
	type ResettableStyleStatesBySlot,
	resolveSlotStyles,
	reuseEqualResolvedSlots,
} from "../helpers/resolve-slot-styles";

interface UseResolvedStylesMapParams {
	localStylesMaps: SharedValue<OwnedStyleLayers>;
}

export const useResolvedStylesMap = ({
	localStylesMaps,
}: UseResolvedStylesMapParams) => {
	const { parentScreenKey } = useScreenRelationships();
	const ancestorStylesMap = useOptionalOrchestratorStore(
		parentScreenKey,
		(store) => store.slotsMap,
	);
	const previousStyleStatesBySlot =
		useSharedValue<ResettableStyleStatesBySlot>(NO_PROPS);
	const previousResolvedStylesMap =
		useSharedValue<NormalizedTransitionInterpolatedStyle>(NO_STYLES);
	const previousOwner = useSharedValue<string | null>(null);

	return useDerivedValue<NormalizedTransitionInterpolatedStyle>(() => {
		"worklet";
		const { layers, owner } = localStylesMaps.get();
		const lastOwner = previousOwner.get();
		const { resolvedStylesMap, nextPreviousStyleStatesBySlot } =
			resolveSlotStyles({
				localStylesMaps: layers,
				ancestorStylesMap: ancestorStylesMap?.get() ?? NO_STYLES,
				previousStyleStatesBySlot: previousStyleStatesBySlot.get(),
				ownerChanged: lastOwner !== null && lastOwner !== owner,
			});

		if (lastOwner !== owner) {
			previousOwner.set(owner);
		}

		if (
			!areResettableStatesBySlotEqual(
				previousStyleStatesBySlot.get(),
				nextPreviousStyleStatesBySlot,
			)
		) {
			previousStyleStatesBySlot.set(nextPreviousStyleStatesBySlot);
		}

		const previousResolvedStyles = previousResolvedStylesMap.get();
		const stableResolvedStylesMap = reuseEqualResolvedSlots({
			resolvedStylesMap,
			previousResolvedStylesMap: previousResolvedStyles,
		});

		if (stableResolvedStylesMap !== previousResolvedStyles) {
			previousResolvedStylesMap.set(stableResolvedStylesMap);
		}

		return stableResolvedStylesMap;
	});
};

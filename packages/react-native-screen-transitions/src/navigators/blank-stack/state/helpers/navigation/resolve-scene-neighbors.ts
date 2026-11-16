interface SceneWithKey {
	route: { key: string };
	descriptor: unknown;
}

type IsRouteClosing = (routeKey: string) => boolean;
type GetRouteClosingOrder = (routeKey: string) => number | undefined;

const findPreviousDescriptor = <T extends SceneWithKey>(
	scenes: T[],
	sceneIndex: number,
	isRouteClosing: IsRouteClosing,
): T["descriptor"] | undefined => {
	let firstClosingBelow: T["descriptor"] | undefined;

	for (let i = sceneIndex - 1; i >= 0; i--) {
		const candidate = scenes[i];
		if (!candidate) continue;

		if (!isRouteClosing(candidate.route.key)) {
			return candidate.descriptor;
		}

		if (firstClosingBelow === undefined) {
			firstClosingBelow = candidate.descriptor;
		}
	}

	return firstClosingBelow;
};

/**
 * The closing route directly above a closing scene that began closing first:
 * it still covers the scene, so the pair keeps resolving while both animate
 * out (a batch dismissal cascading top-down).
 */
const findCoveringClosingDescriptor = <T extends SceneWithKey>(
	scenes: T[],
	sceneIndex: number,
	isRouteClosing: IsRouteClosing,
	getRouteClosingOrder: GetRouteClosingOrder | undefined,
): T["descriptor"] | undefined => {
	const current = scenes[sceneIndex];
	const above = scenes[sceneIndex + 1];
	if (!current || !above || !isRouteClosing(above.route.key)) {
		return undefined;
	}

	const currentOrder = getRouteClosingOrder?.(current.route.key);
	const aboveOrder = getRouteClosingOrder?.(above.route.key);
	if (currentOrder === undefined || aboveOrder === undefined) {
		return undefined;
	}

	return aboveOrder < currentOrder ? above.descriptor : undefined;
};

/**
 * Resolves previous/next descriptors while accounting for routes that are
 * visually closing.
 *
 * Rules:
 * - Closing scenes keep their previous descriptor so their original pair can
 *   keep resolving while they remain mounted. Their next descriptor is the
 *   closing route directly above them when it began closing first, and none
 *   otherwise.
 * - Non-closing scenes skip over closing neighbors to find the actual active
 *   neighbor.
 * - If there is no non-closing neighbor above/below, we fall back to the first
 *   closing neighbor (needed for normal back transitions).
 * - A closing scene between a scene and its non-closing next (a push that landed
 *   during a close) is returned as closingNextDescriptor.
 */
export function resolveSceneNeighbors<T extends SceneWithKey>(
	scenes: T[],
	sceneIndex: number,
	isRouteClosing: IsRouteClosing,
	getRouteClosingOrder?: GetRouteClosingOrder,
): {
	previousDescriptor: T["descriptor"] | undefined;
	nextDescriptor: T["descriptor"] | undefined;
	closingNextDescriptor?: T["descriptor"];
} {
	const current = scenes[sceneIndex];
	if (!current) {
		return {
			previousDescriptor: undefined,
			nextDescriptor: undefined,
		};
	}

	if (isRouteClosing(current.route.key)) {
		return {
			previousDescriptor: findPreviousDescriptor(
				scenes,
				sceneIndex,
				isRouteClosing,
			),
			nextDescriptor: findCoveringClosingDescriptor(
				scenes,
				sceneIndex,
				isRouteClosing,
				getRouteClosingOrder,
			),
		};
	}

	let nextDescriptor: T["descriptor"] | undefined;
	let latestClosingAbove: T["descriptor"] | undefined;
	let latestClosingAboveOrder = Number.NEGATIVE_INFINITY;

	for (let i = sceneIndex + 1; i < scenes.length; i++) {
		const candidate = scenes[i];
		if (!candidate) continue;

		if (!isRouteClosing(candidate.route.key)) {
			nextDescriptor = candidate.descriptor;
			break;
		}

		const closeOrder = getRouteClosingOrder?.(candidate.route.key) ?? i;
		if (closeOrder >= latestClosingAboveOrder) {
			latestClosingAbove = candidate.descriptor;
			latestClosingAboveOrder = closeOrder;
		}
	}

	let closingNextDescriptor: T["descriptor"] | undefined;
	if (nextDescriptor === undefined) {
		nextDescriptor = latestClosingAbove;
	} else {
		closingNextDescriptor = latestClosingAbove;
	}

	const previousDescriptor = findPreviousDescriptor(
		scenes,
		sceneIndex,
		isRouteClosing,
	);

	return {
		previousDescriptor,
		nextDescriptor,
		closingNextDescriptor,
	};
}

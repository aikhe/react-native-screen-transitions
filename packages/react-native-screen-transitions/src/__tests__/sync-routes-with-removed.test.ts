import { beforeEach, describe, expect, it } from "bun:test";
import { syncRoutesWithRemoved } from "../navigators/blank-stack/state/helpers/navigation/sync-routes-with-removed";

const createRoute = (key: string) => ({ key });

const createClosingRouteKeys = () => new Set<string>();

// Reset stores before each test
beforeEach(() => {
	(globalThis as any).resetMutableRegistry();
});

describe("syncRoutesWithRemoved", () => {
	it("retains every dismissed sheet and its descriptor when popping to the root", () => {
		const closingRouteKeys = createClosingRouteKeys();
		const descriptors = { a: {}, b: {}, c: {} };
		const result = syncRoutesWithRemoved({
			prevRoutes: [createRoute("a"), createRoute("b"), createRoute("c")],
			prevDescriptors: descriptors,
			nextRoutes: [createRoute("a")],
			nextDescriptors: { a: descriptors.a },
			closingRouteKeys,
		});

		expect(result.routes.map((route) => route.key)).toEqual(["a", "b", "c"]);
		// the batch closes top-down: "b" is the latest close, the one "a" follows
		expect([...closingRouteKeys]).toEqual(["c", "b"]);
		expect(result.descriptors.b).toBe(descriptors.b);
		expect(result.descriptors.c).toBe(descriptors.c);
	});

	describe("basic routing", () => {
		it("returns empty routes when nextRoutes is empty", () => {
			const closingRouteKeys = createClosingRouteKeys();
			const result = syncRoutesWithRemoved({
				prevRoutes: [createRoute("a")],
				prevDescriptors: {},
				nextRoutes: [],
				nextDescriptors: {},
				closingRouteKeys,
			});
			expect(result.routes).toEqual([]);
		});

		it("returns nextRoutes unchanged for normal push (A -> B)", () => {
			const closingRouteKeys = createClosingRouteKeys();

			// Both routes fully visible

			const result = syncRoutesWithRemoved({
				prevRoutes: [createRoute("a")],
				prevDescriptors: { a: {} },
				nextRoutes: [createRoute("a"), createRoute("b")],
				nextDescriptors: { a: {}, b: {} },
				closingRouteKeys,
			});
			expect(result.routes.map((r) => r.key)).toEqual(["a", "b"]);
		});

		it("returns nextRoutes unchanged for normal stack (A -> B -> C)", () => {
			const closingRouteKeys = createClosingRouteKeys();

			const result = syncRoutesWithRemoved({
				prevRoutes: [createRoute("a"), createRoute("b")],
				prevDescriptors: { a: {}, b: {} },
				nextRoutes: [createRoute("a"), createRoute("b"), createRoute("c")],
				nextDescriptors: { a: {}, b: {}, c: {} },
				closingRouteKeys,
			});
			expect(result.routes.map((r) => r.key)).toEqual(["a", "b", "c"]);
		});
	});

	describe("normal back navigation", () => {
		it("keeps closing route at end for normal back (C -> B)", () => {
			const closingRouteKeys = createClosingRouteKeys();

			const result = syncRoutesWithRemoved({
				prevRoutes: [createRoute("a"), createRoute("b"), createRoute("c")],
				prevDescriptors: { a: {}, b: {}, c: {} },
				nextRoutes: [createRoute("a"), createRoute("b")],
				nextDescriptors: { a: {}, b: {} },
				closingRouteKeys,
			});

			// c should be added to end for close animation
			expect(result.routes.map((r) => r.key)).toEqual(["a", "b", "c"]);
			expect(closingRouteKeys.has("c")).toBe(true);
		});
	});
});

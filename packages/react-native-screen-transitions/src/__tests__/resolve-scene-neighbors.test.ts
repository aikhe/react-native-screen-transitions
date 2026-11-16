import { describe, expect, it } from "bun:test";
import { resolveSceneNeighbors } from "../navigators/blank-stack/state/helpers/navigation/resolve-scene-neighbors";

const createScene = (key: string) => ({
	route: { key },
	descriptor: { id: key },
});

describe("resolveSceneNeighbors", () => {
	it("returns direct neighbors when no routes are closing", () => {
		const scenes = [createScene("a"), createScene("b"), createScene("c")];
		const isRouteClosing = () => false;

		const result = resolveSceneNeighbors(scenes, 1, isRouteClosing);

		expect(result.previousDescriptor).toEqual({ id: "a" });
		expect(result.nextDescriptor).toEqual({ id: "c" });
	});

	it("keeps previous descriptor for a closing current scene", () => {
		const scenes = [createScene("a"), createScene("b"), createScene("c")];
		const isRouteClosing = (routeKey: string) => routeKey === "b";

		const result = resolveSceneNeighbors(scenes, 1, isRouteClosing);

		expect(result.previousDescriptor).toEqual({ id: "a" });
		expect(result.nextDescriptor).toBeUndefined();
	});

	it("keeps previous descriptor for the top closing scene", () => {
		const scenes = [createScene("a"), createScene("b-closing")];
		const isRouteClosing = (routeKey: string) => routeKey === "b-closing";

		const result = resolveSceneNeighbors(scenes, 1, isRouteClosing);

		expect(result.previousDescriptor).toEqual({ id: "a" });
		expect(result.nextDescriptor).toBeUndefined();
	});

	it("skips closing route above and links to active next", () => {
		const scenes = [
			createScene("a"),
			createScene("b-closing"),
			createScene("c"),
		];
		const isRouteClosing = (routeKey: string) => routeKey === "b-closing";

		const result = resolveSceneNeighbors(scenes, 0, isRouteClosing);

		expect(result.previousDescriptor).toBeUndefined();
		expect(result.nextDescriptor).toEqual({ id: "c" });
	});

	it("falls back to closing route above when it is the only next route", () => {
		const scenes = [createScene("a"), createScene("b-closing")];
		const isRouteClosing = (routeKey: string) => routeKey === "b-closing";

		const result = resolveSceneNeighbors(scenes, 0, isRouteClosing);

		expect(result.nextDescriptor).toEqual({ id: "b-closing" });
	});

	it("handles push during dismiss shape [A, B1(closing), B2]", () => {
		const scenes = [createScene("a"), createScene("b1"), createScene("b2")];
		const isRouteClosing = (routeKey: string) => routeKey === "b1";

		const forA = resolveSceneNeighbors(scenes, 0, isRouteClosing);
		const forB2 = resolveSceneNeighbors(scenes, 2, isRouteClosing);

		expect(forA.nextDescriptor).toEqual({ id: "b2" });
		expect(resolveSceneNeighbors(scenes, 1, isRouteClosing).previousDescriptor).toEqual({
			id: "a",
		});
		expect(forB2.previousDescriptor).toEqual({ id: "a" });
	});

	describe("closing scenes", () => {
		const scenes = [
			createScene("a"),
			createScene("b"),
			createScene("c"),
			createScene("d"),
		];
		const isRouteClosing = (routeKey: string) => routeKey !== "a";

		it("links each to the closing route above that began closing first", () => {
			const order = new Map([
				["d", 0],
				["c", 1],
				["b", 2],
			]);
			const resolve = (index: number) =>
				resolveSceneNeighbors(scenes, index, isRouteClosing, (key) =>
					order.get(key),
				).nextDescriptor;

			expect(resolve(0)).toEqual({ id: "b" });
			expect(resolve(1)).toEqual({ id: "c" });
			expect(resolve(2)).toEqual({ id: "d" });
			expect(resolve(3)).toBeUndefined();
		});

		it("leaves a scene uncovered by a route that began closing after it", () => {
			const order = new Map([
				["b", 0],
				["c", 1],
				["d", 2],
			]);
			const result = resolveSceneNeighbors(scenes, 1, isRouteClosing, (key) =>
				order.get(key),
			);

			expect(result.nextDescriptor).toBeUndefined();
		});
	});
});

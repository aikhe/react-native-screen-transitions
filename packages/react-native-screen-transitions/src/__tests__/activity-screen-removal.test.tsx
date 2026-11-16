import { afterEach, expect, it } from "bun:test";
import { useSyncExternalStore, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { BlankStackStoreValue } from "../navigators/blank-stack/state/blank-stack.provider";
import { createModuleMock } from "./helpers/mock-module";

const listeners = new Set<() => void>();
const scene = { descriptor: { options: {} }, route: { key: "A", name: "A" }, activity: "active" };
let scenesByKey: Record<string, typeof scene> = { A: scene };
const paintDriverRouteKeyByRouteKey = new Map<string, string>();
const mockModule = createModuleMock((specifier) => import.meta.resolve(specifier));
await mockModule("../navigators/blank-stack/state/blank-stack.provider", () => ({
	useBlankStackStore: (select: (store: BlankStackStoreValue) => unknown) => useSyncExternalStore(
		(listener) => { listeners.add(listener); return () => listeners.delete(listener); },
		() => select({ scenesByKey, paintDriverRouteKeyByRouteKey } as unknown as BlankStackStoreValue),
	),
}));
await mockModule("../providers/motion", () => ({ useOptionalMotionStore: () => null }));
await mockModule("../components/activity/activity-view", () => ({
	ActivityView: ({ children }: { children: ReactNode }) => children,
}));
const { ActivityScreen } = await import("../navigators/blank-stack/components/activity/activity-screen");
let renderer: ReactTestRenderer | undefined;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { act(() => renderer?.unmount()); renderer = undefined; });

it("removes the outgoing view safely when its scene disappears before its parent rerenders", () => {
	act(() => { renderer = create(<ActivityScreen routeKey="A">outgoing screen</ActivityScreen>); });
	expect(renderer?.toJSON()).not.toBeNull();
	expect(() => act(() => {
		scenesByKey = {};
		for (const listener of listeners) listener();
	})).not.toThrow();
	expect(renderer?.toJSON()).toBeNull();
});

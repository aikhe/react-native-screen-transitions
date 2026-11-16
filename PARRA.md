# Parra fork

Based on upstream **v4.2.0**, commit `819c21915d7fbc911752fe5f0a70f7e4a3f22591`.
The working branch is `parra-4.2`.

## Fixes carried from Parra's 3.6.0 patch

- Keep every removed route and descriptor until its closing animation finishes
  when several sheets are dismissed together. The v4 controller already retains
  routes across overlapping navigation updates, so the old animation-store
  cleanup changes are unnecessary here.
- Accept `delay` in spring and timing transition specs. Delay the existing v4
  animation, including its progress clock and lifecycle callback, and retain its
  reduced-motion setting.

## Fixes for v4's interpolator composition (4.2.0-parra.2)

- A batch dismissal closes top-down: its routes enter the closing order from the
  top, so the screen below the batch follows the batch's lowest route, its
  nearest cover. A closing route keeps the closing route directly above it as
  its next while that one began closing first, so each sheet in a cascade stays
  covered until the sheet above it has left. Successive closes keep upstream's
  rule: a screen follows the most recent close above it.
- Reserved slots (`content`, `backdrop`, ...) still retain omitted keys while one
  interpolator owns a screen, but reset every omitted key to its identity value
  when ownership moves to another interpolator, such as a covering screen's
  interpolator handing back to the screen's own. A gesture keeps the owner until
  it releases.

## Swipe release continuity (4.2.0-parra.3)

A dismissing pan freezes its progress offset at release and scales that offset
with the remaining closing transition. Previously the offset reset separately,
which could jump a long swipe back toward the open pose before dismissing.
Cancelled swipes still spring back and can be grabbed again. The committed
`transitionProgress` remains independent for custom zoom geometry and handoff.
An outgoing Activity screen also tolerates its scene disappearing before its
parent rerenders, preventing a route-removal race from blanking the app.

The `pan-dismiss-continuity` frame tests cover 180/350/650 ms swipes, dismissal
during opening, and regrabbing a cancelled gesture. The Android frame catalog
passes with this change. Generated `slide-release-*` visual scenarios cover
the same release and regrab paths; running the release harness suite remains
required for full visual verification.

The app's measured button radius is an app fix. V4 removed the native-screen
presentation switch, so `enableNativeScreens={false}` must be removed when
migrating the app. Keep the app's explicit transparent backdrops and transition
interpolators when adapting the new API.

## Verification

The parra.4 release restores optional `focusedElementOpacity` and
`unfocusedElementOpacity` open/close tuples from the 3.6 API. Custom curves also
control when the source stops tracking its geometry, so extending its fade does
not leave it reset to its grid position while visible. Unspecified curves keep
the upstream 4.2 defaults. Parra uses the 3.6 curves, its original Default/Fling
spring pair, and the Android whole-page rounding behavior for the Cost demos.
The targeted `zoom-opacity-ranges` tests cover late source tracking, the early
closing detail fade, default behavior and input-only tuples.

The new route and delay regressions fail against upstream v4.2.0 and pass with
these changes: 34 targeted tests pass. The batch-neighbor and ownership-reset
regressions fail without the parra.2 changes and pass with them
(`blank-stack-controller`, `resolve-scene-neighbors` and `styles/resolve-slot-styles`
tests). The React Navigation source typecheck
also passes with declaration emission disabled and the unused Expo Router host
excluded. The full upstream typecheck needs the fork's Expo Router development
dependency, which Parra does not install. Targeted checks:

```sh
bun test packages/react-native-screen-transitions/src/__tests__/sync-routes-with-removed.test.ts packages/react-native-screen-transitions/src/__tests__/blank-stack-controller.test.ts packages/react-native-screen-transitions/src/__tests__/animation/animate-config.test.ts
bun test packages/react-native-screen-transitions/src/__tests__/resolve-scene-neighbors.test.ts packages/react-native-screen-transitions/src/__tests__/styles/resolve-slot-styles.test.ts
bun test --path-ignore-patterns='**/__none__/**' ./packages/react-native-screen-transitions/src/__tests__/harness/transition-delay.test.ts
```

The generated `stack-pop-to-root` visual test dismisses two screens together,
then checks that another push and pop work. Run it on a release harness build
before treating the visual behavior as verified. Parra's Android builds run in
GitHub Actions, not on this PC.

## Distribution and updates

Run `bun scripts/package-parra.ts` after committing the fork changes. It verifies
the upstream 4.2.0 tarball's integrity and source, then regenerates both JavaScript
formats and the declarations for the patched modules. Other upstream
build artifacts are retained. Additional source changes require updating the
packaging script, so they cannot silently ship without rebuilt artifacts.

Upload the resulting `4.2.0-parra.4` tarball to the fork's `parra-v4.2.0-4` GitHub
release. Parra installs that versioned release asset; the upstream repository
root is a private monorepo, not an installable library package.

Update from upstream deliberately and publish a new fork version. Preserve the
app's transition interpolators and fixes while adapting removed APIs. Check
dismiss-all sheets, rapid back-and-open taps, zoom corners and backdrop appearance
on the Android preview build before treating a new version as visually verified.

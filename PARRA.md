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

The app's measured button radius is an app fix. V4 removed the native-screen
presentation switch, so `enableNativeScreens={false}` must be removed when
migrating the app. Keep the app's explicit transparent backdrops and transition
interpolators when adapting the new API.

## Verification

The new route and delay regressions fail against upstream v4.2.0 and pass with
these changes: 34 targeted tests pass. The React Navigation source typecheck
also passes with declaration emission disabled and the unused Expo Router host
excluded. The full upstream typecheck needs the fork's Expo Router development
dependency, which Parra does not install. Targeted checks:

```sh
bun test packages/react-native-screen-transitions/src/__tests__/sync-routes-with-removed.test.ts packages/react-native-screen-transitions/src/__tests__/blank-stack-controller.test.ts packages/react-native-screen-transitions/src/__tests__/animation/animate-config.test.ts
bun test --path-ignore-patterns='**/__none__/**' ./packages/react-native-screen-transitions/src/__tests__/harness/transition-delay.test.ts
```

The generated `stack-pop-to-root` visual test dismisses two screens together,
then checks that another push and pop work. Run it on a release harness build
before treating the visual behavior as verified. Parra's Android builds run in
GitHub Actions, not on this PC.

## Distribution and updates

Run `bun scripts/package-parra.ts` after committing the fork changes. It verifies
the upstream 4.2.0 tarball's integrity and source, then regenerates both JavaScript
formats and the changed declarations for the two patched modules. Other upstream
build artifacts are retained. Additional source changes require updating the
packaging script, so they cannot silently ship without rebuilt artifacts.

Upload the resulting `4.2.0-parra.1` tarball to the fork's `parra-v4.2.0-1` GitHub
release. Parra installs that versioned release asset; the upstream repository
root is a private monorepo, not an installable library package.

Update from upstream deliberately and publish a new fork version. Preserve the
app's transition interpolators and fixes while adapting removed APIs. Check
dismiss-all sheets, rapid back-and-open taps, zoom corners and backdrop appearance
on the Android preview build before treating a new version as visually verified.

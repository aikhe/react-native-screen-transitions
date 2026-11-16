import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// retain upstream's built package and regenerate only the patched modules
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const library = join(root, "packages/react-native-screen-transitions");
const upstreamVersion = "4.2.0";
const version = `${upstreamVersion}-parra.3`;
const patched = [
	"utils/animation/animate.ts",
	"navigators/blank-stack/state/helpers/navigation/sync-routes-with-removed.ts",
	"navigators/blank-stack/state/helpers/navigation/resolve-scene-neighbors.ts",
	"providers/orchestrator/styles/helpers/resolve-slot-styles/index.ts",
	"providers/orchestrator/styles/helpers/resolve-slot-styles/types.ts",
	"providers/orchestrator/styles/hooks/use-interpolated-style-maps.tsx",
	"providers/orchestrator/styles/hooks/use-resolved-slot-style-map.tsx",
	"providers/motion/gestures/pan/behavior/pan-lifecycle.ts",
	"providers/motion/gestures/pan/behavior/pan-reset.ts",
	"providers/motion/animation/helpers/hydrate-transition-state/index.ts",
	"providers/motion/animation/helpers/hydrate-transition-state/types.ts",
	"providers/orchestrator/helpers/use-interpolator-state.ts",
	"navigators/blank-stack/components/activity/activity-screen.tsx",
];

async function command(args: string[], cwd = root) {
	const child = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
	const [code, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if (code !== 0) throw new Error(`${args.join(" ")}\n${stdout}\n${stderr}`);
	return stdout.trim();
}

const metadataResponse = await fetch(
	`https://registry.npmjs.org/react-native-screen-transitions/${upstreamVersion}`,
);
if (!metadataResponse.ok)
	throw new Error(`registry: ${metadataResponse.status}`);
const metadata: { dist: { tarball: string; integrity: string } } =
	await metadataResponse.json();
const archiveResponse = await fetch(metadata.dist.tarball);
if (!archiveResponse.ok) throw new Error(`tarball: ${archiveResponse.status}`);
const archive = await archiveResponse.arrayBuffer();
const integrity = `sha512-${new Bun.CryptoHasher("sha512").update(archive).digest("base64")}`;
if (integrity !== metadata.dist.integrity)
	throw new Error("upstream integrity mismatch");

const staging = await mkdtemp(join(tmpdir(), "parra-transitions-"));
const upstreamArchive = join(staging, "upstream.tgz");
await Bun.write(upstreamArchive, archive);
await command(["tar", "-xzf", upstreamArchive, "-C", staging]);
const packaged = join(staging, "package");

const changed = await command([
	"git",
	"diff",
	"--name-only",
	`v${upstreamVersion}`,
	"--",
	"packages/react-native-screen-transitions/src",
]);
const expected = new Set(
	patched.map((path) => `packages/react-native-screen-transitions/src/${path}`),
);
for (const path of changed.split(/\r?\n/).filter(Boolean)) {
	if (!path.includes("/__tests__/") && !expected.has(path)) {
		throw new Error(
			`update the package build for the additional source change: ${path}`,
		);
	}
}

for (const path of patched) {
	const baseline = await command([
		"git",
		"show",
		`v${upstreamVersion}:packages/react-native-screen-transitions/src/${path}`,
	]);
	const published = await Bun.file(join(packaged, "src", path)).text();
	if (
		baseline.replace(/\r\n/g, "\n").trim() !==
		published.replace(/\r\n/g, "\n").trim()
	) {
		throw new Error(`published source differs from its upstream tag: ${path}`);
	}
	await Bun.write(
		join(packaged, "src", path),
		Bun.file(join(library, "src", path)),
	);
}

for (const [directory, format] of [
	["module", "esm"],
	["commonjs", "cjs"],
] as const) {
	const build = await Bun.build({
		entrypoints: patched.map((path) => join(packaged, "src", path)),
		root: join(packaged, "src"),
		outdir: join(packaged, "lib", directory),
		target: "node",
		format,
		external: ["*"],
	});
	if (!build.success)
		throw new AggregateError(build.logs, `${directory} build failed`);
}

// emit declarations with the library's build config, then take the patched ones
const declarations = join(staging, "declarations");
const declarationConfig = join(staging, "tsconfig.json");
await Bun.write(
	declarationConfig,
	JSON.stringify({
		extends: join(library, "tsconfig.build.json"),
		compilerOptions: { rootDir: join(library, "src") },
		files: patched.map((path) => join(library, "src", path)),
		include: [],
	}),
);
await command([
	"bun",
	"x",
	"tsc",
	"-p",
	declarationConfig,
	"--outDir",
	declarations,
]);
for (const path of patched) {
	const declaration = path.replace(/\.tsx?$/, ".d.ts");
	await Bun.write(
		join(packaged, "lib/typescript", declaration),
		Bun.file(join(declarations, declaration)),
	);
}

const sourceSha = await command(["git", "rev-parse", "HEAD"]);
const manifest = await Bun.file(join(packaged, "package.json")).json();
manifest.version = version;
manifest.gitHead = sourceSha;
manifest.repository.url =
	"https://github.com/aikhe/react-native-screen-transitions.git";
await Bun.write(
	join(packaged, "package.json"),
	`${JSON.stringify(manifest, null, 2)}\n`,
);
await Bun.write(join(packaged, "PARRA.md"), Bun.file(join(root, "PARRA.md")));

const output = join(staging, `react-native-screen-transitions-${version}.tgz`);
await command(["tar", "-czf", output, "-C", staging, "package"]);
console.log(JSON.stringify({ version, sourceSha, output, packaged }, null, 2));

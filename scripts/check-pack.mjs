#!/usr/bin/env node
// Checks what each published package would put on npm, so a release never
// ships test files, source maps, or the unbundled compiler output in place of
// the self-contained bundle.
//
//   npm run pack:check     (run `npm run build` first)
//
// It rebuilds the mcp and cli bundles, then lists each package's tarball with
// `npm pack --dry-run --ignore-scripts` and fails on anything unexpected.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args) =>
  execFileSync(npm, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const PACKAGES = [
  {
    name: "@kie-ai-tool/mcp",
    dir: "packages/mcp",
    exact: ["LICENSE", "README.md", "dist/index.js", "package.json"],
    bundles: ["dist/index.js"],
  },
  {
    name: "@kie-ai-tool/cli",
    dir: "packages/cli",
    exact: ["LICENSE", "README.md", "dist/index.js", "package.json"],
    bundles: ["dist/index.js"],
  },
  {
    name: "@kie-ai-tool/openai-server",
    dir: "packages/openai",
    bundles: ["dist/index.js", "dist/bin.js", "dist/standalone.js"],
  },
];

const FORBIDDEN = [
  /__tests__\//,
  /\.test\.[cm]?[jt]s$/,
  /\.map$/,
  /(^|\/)\.env/,
];

for (const name of ["@kie-ai-tool/mcp", "@kie-ai-tool/cli"]) {
  run(["run", "bundle", "-w", name]);
}

let failed = false;
const fail = (msg) => {
  console.error(`  FAIL ${msg}`);
  failed = true;
};

for (const pkg of PACKAGES) {
  const [info] = JSON.parse(
    run(["pack", "-w", pkg.name, "--dry-run", "--json", "--ignore-scripts"]),
  );
  const files = info.files.map((f) => f.path).sort();
  const manifest = JSON.parse(readFileSync(`${pkg.dir}/package.json`, "utf8"));
  console.log(
    `${pkg.name}@${manifest.version}: ${files.length} files, ${Math.round(info.unpackedSize / 1024)} kB unpacked`,
  );

  for (const path of files) {
    if (FORBIDDEN.some((re) => re.test(path)))
      fail(`${pkg.name} would ship ${path}`);
  }
  if (
    pkg.exact &&
    JSON.stringify(files) !== JSON.stringify([...pkg.exact].sort())
  ) {
    fail(
      `${pkg.name} file list is ${JSON.stringify(files)}, expected ${JSON.stringify(pkg.exact)}`,
    );
  }

  const bins =
    typeof manifest.bin === "string"
      ? [manifest.bin]
      : Object.values(manifest.bin ?? {});
  for (const target of [manifest.main, manifest.types, ...bins].filter(
    Boolean,
  )) {
    const path = target.replace(/^\.\//, "");
    if (!files.includes(path))
      fail(`${pkg.name} points to ${path}, which is not in the package`);
  }

  // The private core workspace is never published, so a bundle that still
  // imports it would fail for every user.
  for (const bundle of pkg.bundles) {
    const source = readFileSync(`${pkg.dir}/${bundle}`, "utf8");
    if (
      /from\s*["']@kie-ai-tool\/core["']|require\(["']@kie-ai-tool\/core["']\)/.test(
        source,
      )
    ) {
      fail(
        `${pkg.name} ${bundle} imports the unpublished @kie-ai-tool/core (not bundled)`,
      );
    }
  }
}

if (failed) {
  console.error("\nPackage contents check failed.");
  process.exit(1);
}
console.log("Package contents OK.");

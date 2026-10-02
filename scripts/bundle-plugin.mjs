// Builds the self-contained files the plugin runs: bundle/kie-mcp.mjs (MCP
// server) and bundle/kie-cli.mjs (CLI). Every dependency is inlined and the
// task store uses Node's built-in node:sqlite, so a plain git clone runs with
// `node bundle/kie-mcp.mjs`: no npm install, no native build. Claude Code and
// other plugin hosts clone the repo and run files as they are, which is why
// the bundles are committed. CI rebuilds them and fails if they differ.
//
// Run: npm run bundle:plugin   (after npm ci)

import { readFileSync, statSync } from "node:fs";
import { build } from "esbuild";

const banner = {
  // Inlined CommonJS dependencies (express and friends) call require() for
  // Node built-ins; ESM output has no require unless we create one.
  // The entry files' own #! line stays first; esbuild puts the banner after it.
  js: [
    "import { createRequire as __kieCreateRequire } from 'node:module';",
    "const require = __kieCreateRequire(import.meta.url);",
  ].join("\n"),
};

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner,
  legalComments: "eof",
  logLevel: "warning",
  // Keep output stable between machines so CI can diff it.
  sourcemap: false,
  minify: false,
};

const targets = [
  { entry: "packages/mcp/src/index.ts", out: "bundle/kie-mcp.mjs" },
  { entry: "packages/cli/src/index.ts", out: "bundle/kie-cli.mjs" },
];

for (const { entry, out } of targets) {
  await build({ ...shared, entryPoints: [entry], outfile: out });
  const text = readFileSync(out, "utf8");
  for (const forbidden of [
    "@kie-ai-tool/core",
    'from "sqlite3"',
    'require("sqlite3")',
  ]) {
    if (text.includes(forbidden)) {
      console.error(`FATAL: ${out} still references ${forbidden}.`);
      process.exit(1);
    }
  }
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`${out}  ${kb} KB`);
}

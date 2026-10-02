# Contributing

Thanks for your interest in improving this project.

## Open an issue before a large PR

This is a **monorepo** (npm workspaces). One shared `core` feeds two published
surfaces:

```text
packages/core   @kie-ai-tool/core   (private, bundled into both — never published)
packages/mcp    @kie-ai-tool/mcp
packages/cli    @kie-ai-tool/cli
```

A tool is **one `ToolDef`** under `packages/core/src/tools/<tool>.ts` (single
source of truth). Both the MCP server and the CLI derive their interface from the
registry automatically — there is **no** monolithic `src/index.ts` handler file,
and `dist/` is build output (gitignored, do not commit it).

So before opening a sizable PR, **file an issue first** describing the bug or
change. It's a two-minute filter that avoids work against the wrong place —
many "handler" fixes from the old single-file layout are already handled
uniformly across the per-tool registry.

## Adding a model

See [`CLAUDE.md`](./CLAUDE.md) → "Adding New Tools" and
[`docs/ENDPOINTS.md`](./docs/ENDPOINTS.md). In short: one tool file +
one client method, registered in `packages/core/src/tools/index.ts`.

## Dev

```bash
npm run build       # build all packages
npm test            # all package tests
npm run typecheck   # tsc --noEmit
npm run check       # Biome lint + format
```

Work on a branch and open a pull request against
`tansilandre/kie-ai-tool-mcp-skills-agent`; CI must be green before merge. The
rules agents follow in this repo are in [`AGENTS.md`](./AGENTS.md).

Keep changes surgical and match the surrounding style.

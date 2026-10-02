# Roadmap

## Goal

Andre's brief (2026-10-02): "create MCP/skill/ai agent that are powerful enough to run with kie.ai ...
a baseline of a good opensource tool to be use everywhere ... our goals is to make this very usable."

So the bar is:

- **Powerful:** every model kie.ai sells, not only the ones someone hand-wrote a tool for.
- **Safe with money:** an agent never spends credits the human didn't agree to, and hard caps hold
  even when the agent misbehaves.
- **Everywhere:** one-step install in Claude Code, Codex, Cursor, Claude Desktop, WorkBuddy and any
  MCP client, on macOS, Linux and Windows.
- **Usable:** works on the first try, explains its errors, and the skills make good images and
  video, not just valid API calls.

## Where we start (inherited from felores/kie-cli-mcp, 2026-08-25)

Works:

- 38 hand-written tools for kie.ai models, one Zod schema each, shared by the MCP server and the CLI.
- A prepare → approve → submit flow for paid generations, using MCP form elicitation.
- Uploads, task polling, a SQLite task store, Streamable HTTP with a bearer token.
- 286 passing tests, Biome lint, CI on every pull request.

Missing or broken (found while reviewing the code and kie.ai's live API on 2026-10-02):

- **Only 38 of kie.ai's 218 catalog models.** kie.ai has a live catalog API (`/api/v1/models`, each
  model's OpenAPI schema, price text, 24-hour success rate) that the toolkit doesn't use.
- **Prices are known for 2 requests only.** Everything else shows "unknown". kie.ai publishes a
  price for each model in its catalog and in a public price list.
- **No balance check** before spending (kie.ai has `/api/v1/chat/credit`).
- **Approval only works in MCP clients that support forms.** Elsewhere nothing can be generated
  unless the operator turns approval off completely.
- **No credit caps.** A plan with an unknown price can still be approved.
- **Install needs a build and a native `sqlite3` module**, which often fails on Windows.
- **No plugin packaging, no agent, one skill.**
- Bugs to confirm: Veo and Midjourney task status reads `state` but those APIs report `successFlag`;
  the Runway Aleph URL doubles `/api/v1`; Veo 3.1 Lite and Seedance 1.5 Pro are missing.

## Plan

Each step is one pull request with green CI. Steps marked "live test" spend a few credits on the
cheapest settings only (gpt-image-2 at 1K, Veo 3.1 Lite at 720p), as Andre allowed.

1. ✅ **Fork identity.** (PR #1) New package names, credits, this roadmap, rules for agents working on the
   repo. No behaviour change.
2. ✅ **Live catalog.** (PR #2) Search all kie.ai models; read a model's schema (cached on disk, with back-off
   because the schema endpoint rate-limits after a few calls); price text and 24-hour success rate;
   account balance. Run *any* catalog model through the same prepare → approve → submit flow, with
   the request checked against the model's live schema. Accept `KIE_API_KEY`, the name kie.ai's own
   docs use, as well as `KIE_AI_API_KEY`.
3. ✅ **One-step install.** (PR #3; the live gpt-image-2 test moved to step 4, because plan
   approval in a non-interactive session is cancelled by the host.) Replace the native `sqlite3` module with Node's built-in `node:sqlite`, so
   the server is one file with no install step. Package the repo as a Claude Code plugin and
   marketplace (`/plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent`), with a core
   `kie` skill and a `kie-director` agent. Live test: one gpt-image-2 1K image through the
   installed plugin.
4. ✅ **Spend controls that work in every app.** (PR #5; design in
   [`docs/design/spend-controls.md`](design/spend-controls.md). Not built: refusing on a low
   balance, see the design.) Approval modes: `form` (MCP form, the default),
   `chat` (the agent must relay the human's yes, for apps without forms) and `auto` (approve
   anything under a credit limit the human set). Per-plan and per-day credit caps enforced in code
   for every mode. Prices from kie.ai's catalog, the real cost read back from each finished task,
   and a balance check before submitting. Reviewed by a separate agent told to break it.
5. **Creative skills.** Adapted from higgsfield-ai/skills (MIT) for kie.ai models: image prompts,
   video prompts, product photoshoot, YouTube thumbnail, brand kit, and a short-video / explainer
   pipeline. Plus kie.ai field notes: traps verified on the live API (upload host, Omni input
   rules, content-filter 500s, the 20-minute task limit, key model allowlists).
6. ✅ **Everywhere.** (PR #7. Verified: the macOS installer end to end, the Codex plugin install. Not
   yet verified: `install.ps1` on Windows, and a live Codex session, because Codex's login on the
   build machine had expired.) Codex and Cursor plugin manifests, `npx skills add` support, `install.sh` and
   `install.ps1`, config snippets for Claude Desktop and WorkBuddy, and a Windows test.
7. ✅ **Fixes.** (PR #6: Veo/Midjourney status, Veo aspect ratio, Aleph, Veo 3.1 Lite, GPT Image 2
   options. Seedance 1.5 Pro runs through `run_model`; stale upstream docs remain.) Veo and Midjourney status, Runway Aleph URL, Veo 3.1 Lite and Seedance 1.5 Pro.
   Live test: one Veo 3.1 Lite 720p clip. Remove stale docs.
8. **Later.** A standalone agent (`kie agent "make a 15 second ad"`) that runs its own loop on
   kie.ai's chat models with the same key. Publishing to npm once the package scope is reserved.

## Decisions

Decided by Andre on 2026-10-02:

- A new public repo, `kie-ai-tool-mcp-skills-agent`, that keeps felores's full git history so the
  authors stay credited and upstream fixes can still be merged. The upstream repos are forked
  into his account as references.
- "AI agent" means a plugin agent first (it runs inside Claude Code, Codex and others on the AI
  the user already has); a standalone agent comes later.
- Live tests use the cheapest model at the lowest resolution only.

Assumed, open to change:

- npm package names under the `@kie-ai-tool` scope (`core`, `mcp`, `cli`, `openai-server`).
  Not published yet; the scope still has to be reserved on npm.
- `higgsfield-ai/higgsfield` was not forked: it is an LLM training framework with nothing for
  media generation.
- This public repo follows normal open-source layout (`packages/`, `docs/`, `skills/`), not the
  numbered-folder convention of Andre's private workspaces, because plugin loaders and npm expect
  these paths.

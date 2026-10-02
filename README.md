# kie-ai-tool: MCP server, CLI, skills and agent for kie.ai

An open-source toolkit that lets AI agents (Claude Code, Codex, Cursor, Claude Desktop, WorkBuddy or
any MCP client) make images, video, music and speech with [kie.ai](https://kie.ai), safely and
cheaply.

[kie.ai](https://kie.ai) resells 200+ generation models (GPT Image 2, Nano Banana, Seedream, Veo 3.1,
Kling 3.0, Seedance, Gemini Omni, Suno, ElevenLabs and more) behind one API key, usually well below
the official price. This repo gives agents a proper way to use it: find the right model, show the
price, wait for your yes, generate, and hand back the files.

> **Status: early, under active development.** Works today: the MCP server and CLI, with every
> model in kie.ai's live catalog (search, schemas, prices, health, balance) behind a
> prepare → approve → submit step. The plugin install, the creative skills and the agent are being
> built now. See the [roadmap](docs/ROADMAP.md).

## What an agent can do with it

| Tool | Cost | What it does |
|---|---|---|
| `search_models` | free | Search kie.ai's live catalog of 200+ models by words, task type or provider |
| `get_model_schema` | free | A model's input fields, required ones, allowed values, defaults and an example |
| `get_model_status` | free | kie.ai's price text and the model's success rate over the last hour and day |
| `get_balance` | free | Credits left on your key |
| `prepare_media_generation` | free | Checks a request against the model's live schema, shows the price, saves a plan |
| `submit_media_generation` | spends | Runs an approved plan once |
| `run_model` | spends | Any catalog model, inside a plan |
| `gpt_image_2`, `kling_video`, … | spend | 28 hand-tuned model tools with safe defaults, inside a plan |
| `wait_for_task`, `get_task_status` | free | Waits for a task and returns every result URL |

## What's inside

| Part | Path | What it does |
|---|---|---|
| MCP server | [`packages/mcp`](packages/mcp) | Exposes kie.ai models as MCP tools, over stdio or Streamable HTTP |
| CLI | [`packages/cli`](packages/cli) | The same tools from the terminal (`kie-cli <tool> --flags`) |
| OpenAI-compatible server | [`packages/openai`](packages/openai) | Selected image and video models behind OpenAI-shaped routes |
| Shared core | [`packages/core`](packages/core) | kie.ai client, tool registry, pricing, plans, task store |
| Skills | [`skills/`](skills) | Instructions agents load to use the toolkit well |
| Agent | [`agents/kie-director.md`](agents/kie-director.md) | A ready-made agent that plans, prices, gets your approval, produces and checks media |
| Plugin bundles | [`bundle/`](bundle) | The MCP server and CLI as single files with no dependencies, so a plain clone runs |

## Install

You need [Node.js](https://nodejs.org) 22.13 or newer and a kie.ai API key from
[kie.ai/api-key](https://kie.ai/api-key). Nothing else: the server is one file with no dependencies.

### Claude Code (plugin: MCP server, skills and agent in one step)

In Claude Code:

```text
/plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent
/plugin install kie@kie-ai-tool
```

Claude Code asks for your kie.ai API key and keeps it in your system's secure storage. You can
change it later with `/plugin configure kie@kie-ai-tool`. If you leave it empty, the plugin uses
`KIE_API_KEY` from the shell that started Claude Code.

Then ask in plain words, for example *"make a 1:1 product photo of a white ceramic mug with GPT
Image 2 at 1K and save it to ./out"*. The `kie:generate-media` skill and the `kie-director`
agent load on their own; the tools appear as `mcp__plugin_kie_kie__*`.

From a terminal, the same install is:

```bash
claude plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent
claude plugin install kie@kie-ai-tool
```

### Any other MCP client (Claude Desktop, Cursor, Codex, WorkBuddy, …)

```bash
git clone https://github.com/tansilandre/kie-ai-tool-mcp-skills-agent
```

Then point the client at the bundled server, using the absolute path to your clone:

```json
{
  "mcpServers": {
    "kie": {
      "command": "node",
      "args": ["/absolute/path/to/kie-ai-tool-mcp-skills-agent/bundle/kie-mcp.mjs"],
      "env": { "KIE_API_KEY": "your-key" }
    }
  }
}
```

For Codex: `codex mcp add kie --env KIE_API_KEY=your-key -- node /absolute/path/to/kie-ai-tool-mcp-skills-agent/bundle/kie-mcp.mjs`.

### CLI

```bash
export KIE_API_KEY=your-key
node bundle/kie-cli.mjs --help
node bundle/kie-cli.mjs search_models --query veo
node bundle/kie-cli.mjs get_model_schema --model gpt-image-2-text-to-image
node bundle/kie-cli.mjs get_balance
```

## How spending works

Every paid generation goes through three steps, so an agent cannot spend your credits without you
seeing the plan first:

1. `prepare_media_generation` checks the request, fills in cheap defaults you didn't set, shows the
   price when it is known, and saves a plan. Nothing is sent to kie.ai yet.
2. You approve the plan. In an MCP client that supports forms, the server asks you in a form. In the
   CLI you pass `--approve <planId>`.
3. `submit_media_generation` runs the approved plan once.

The MCP server hides the direct generation tools unless its operator sets
`KIE_AI_ALLOW_DIRECT_GENERATION=true`. The roadmap adds credit caps enforced in code and an approval
path for MCP clients that don't support forms.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `KIE_AI_API_KEY` | yes | Your kie.ai API key. `KIE_API_KEY`, the name kie.ai's own docs use, works too |
| `KIE_AI_CACHE_DIR` | no | Where model schemas are cached (default `~/.kie-ai/cache`, kept 24 hours) |
| `KIE_AI_ENABLED_TOOLS` | no | Comma-separated tool names to load, to keep the agent's context small |
| `KIE_AI_TOOL_CATEGORIES` | no | Load whole categories: `image`, `video`, `audio`, `catalog` (`run_model`), `utility` |
| `KIE_AI_DISABLED_TOOLS` | no | Tools to hide. Disabling a model tool such as `veo3_generate_video` does not stop the same model through `run_model`; disable `run_model` too |
| `KIE_AI_ALLOW_DIRECT_GENERATION` | no | `true` lets every paid tool, including `run_model` with any catalog model, run without a plan. Leave it off |
| `KIE_AI_DB_PATH` | no | Where tasks and plans are stored (default `~/.kie-ai/tasks.db`) |
| `KIE_AI_CALLBACK_URL` | no | Your own webhook for task completion |

The full reference for every tool, transport and option is in [`docs/TOOLS.md`](docs/TOOLS.md),
[`docs/DEPLOY_HTTP.md`](docs/DEPLOY_HTTP.md) and the [archived upstream README](docs/upstream/README.md).

## Develop

```bash
npm ci
npm run build && npm run typecheck && npm test && npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Changes land through pull
requests with green CI.

## Credits

This project stands on other people's work:

- [andrewlwn77/kie-ai-mcp-server](https://github.com/andrewlwn77/kie-ai-mcp-server), the original
  kie.ai MCP server (MIT).
- [felores/kie-cli-mcp](https://github.com/felores/kie-cli-mcp), which grew it into the CLI, MCP
  server and OpenAI-compatible server this repo starts from (MIT). The full git history is kept.
- [higgsfield-ai/skills](https://github.com/higgsfield-ai/skills) (MIT), whose skill design and
  prompt craft the planned creative skills adapt for kie.ai.
- [kie.ai's own docs](https://docs.kie.ai) and agent skills, for the live catalog API.

See [NOTICE.md](NOTICE.md) for details.

## License

MIT. See [LICENSE](LICENSE).

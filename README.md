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
| `prepare_media_generation` | free | Checks a request against the model's live schema, prices it, saves a plan |
| `approve_media_generation` | free | Chat approval mode: records your yes to a plan |
| `submit_media_generation` | spends | Runs an approved plan once |
| `run_model` | spends | Any catalog model, inside a plan |
| `gpt_image_2`, `kling_video`, … | spend | 28 hand-tuned model tools with safe defaults, inside a plan |
| `wait_for_task`, `get_task_status` | free | Waits for a task and returns every result URL |

## What's inside

| Part | Path | What it does |
|---|---|---|
| MCP server | [`packages/mcp`](packages/mcp) | Exposes kie.ai models as MCP tools, over stdio or Streamable HTTP |
| CLI | [`packages/cli`](packages/cli) | The same tools from the terminal (`kie <tool> --flags`) |
| OpenAI-compatible server | [`packages/openai`](packages/openai) | Selected image and video models behind OpenAI-shaped routes |
| Shared core | [`packages/core`](packages/core) | kie.ai client, tool registry, pricing, plans, task store |
| Skills | [`skills/`](skills) | What agents load to use the toolkit well (below) |
| Agent | [`agents/kie-director.md`](agents/kie-director.md) | A ready-made agent that plans, prices, gets your approval, produces and checks media |
| Plugin bundles | [`bundle/`](bundle) | The MCP server and CLI as single files with no dependencies, so a plain clone runs |

## Skills

| Skill | For |
|---|---|
| [`generate-media`](skills/generate-media/SKILL.md) | The core workflow: find a model, plan, get approval, generate, check; kie.ai field notes |
| [`image-prompts`](skills/image-prompts/SKILL.md) | Prompts for GPT Image 2, Nano Banana and Seedream: edits, text in images, reference sheets, storyboard frames |
| [`video-prompts`](skills/video-prompts/SKILL.md) | Motion prompts for Veo 3.1, Seedance, Gemini Omni and Kling, lip-sync, dialogue fit, diagnosing bad clips |
| [`product-photoshoot`](skills/product-photoshoot/SKILL.md) | E-commerce and ad images from real product photos, keeping the product faithful |
| [`youtube-thumbnail`](skills/youtube-thumbnail/SKILL.md) | Truthful, high-contrast 16:9 thumbnails with the creator's face and a text overlay |
| [`short-video`](skills/short-video/SKILL.md) | A finished vertical reel or explainer: script, look and sequence reviews as images, clips, voice, ffmpeg assembly |

The [`kie-director`](agents/kie-director.md) agent uses them to take a brief to finished files.

## Install

You need [Node.js](https://nodejs.org) 22.13 or newer, git, and a kie.ai API key from
[kie.ai/api-key](https://kie.ai/api-key). Nothing else: the server is one file with no dependencies.

### Claude Code (plugin: MCP server, skills and agent in one step)

In Claude Code:

```text
/plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent
/plugin install kie@kie-ai-tool
```

Claude Code asks for your kie.ai API key and keeps it in your system's secure storage, and lets
you pick the approval mode and the credit caps. Change them later with
`/plugin configure kie@kie-ai-tool`. Then ask in plain words, for example *"make a 1:1 product
photo of a white ceramic mug with GPT Image 2 at 1K and save it to ./out"*. The skills (such as
`kie:generate-media`, `kie:image-prompts`, `kie:short-video`) and the `kie-director` agent load on
their own; the tools appear as `mcp__plugin_kie_kie__*`.

### Everything else: the installer

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/tansilandre/kie-ai-tool-mcp-skills-agent/main/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/tansilandre/kie-ai-tool-mcp-skills-agent/main/install.ps1 | iex
```

It clones the toolkit into `~/.kie-ai-tool` (run it again to update), checks Node.js, and prints
the exact setup for the AI apps it finds. Run the downloaded script with `--register`
(`-Register` on Windows) to also install the Claude Code plugin and add the skills to Codex. It
never asks for your key. The Windows installer has not been tested on Windows yet: please report
problems in an issue.

Or set it up by hand:

- **Codex:** `codex mcp add kie --env KIE_API_KEY=<your key> --env KIE_AI_APPROVAL=chat -- node ~/.kie-ai-tool/bundle/kie-mcp.mjs`,
  and copy the folders in `~/.kie-ai-tool/skills` to `~/.codex/skills`. (Codex can also install
  this repo as a plugin with `codex plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent`
  and `codex plugin add kie@kie-ai-tool`; then set `KIE_API_KEY` in the environment Codex starts
  from. The install is verified; a live Codex session with the plugin is not yet.)
- **Claude Desktop, Cursor, WorkBuddy and other MCP apps:** add the server to the app's MCP
  settings with the absolute path to your clone:

  ```json
  {
    "mcpServers": {
      "kie": {
        "command": "node",
        "args": ["/absolute/path/to/.kie-ai-tool/bundle/kie-mcp.mjs"],
        "env": { "KIE_API_KEY": "your-key", "KIE_AI_APPROVAL": "chat" }
      }
    }
  }
  ```

  On Windows the path looks like `"C:\\Users\\you\\.kie-ai-tool\\bundle\\kie-mcp.mjs"` (backslashes doubled
  in JSON). Use `"form"` instead of `"chat"` if the app shows MCP approval forms; without them, form
  mode can prepare plans but never approve them.
- **Skills in other agents:** the folders in `skills/` follow the common SKILL.md layout; copy them
  into your agent's skills folder (for example `~/.agents/skills`).

### CLI

```bash
export KIE_API_KEY=your-key            # Windows PowerShell: $env:KIE_API_KEY = "your-key"
node ~/.kie-ai-tool/bundle/kie-cli.mjs --help
node ~/.kie-ai-tool/bundle/kie-cli.mjs search_models --query veo
node ~/.kie-ai-tool/bundle/kie-cli.mjs get_model_schema --model gpt-image-2-text-to-image
node ~/.kie-ai-tool/bundle/kie-cli.mjs get_balance
```

## How spending works

Credits are real money (1 credit is about US$0.005), so every paid generation goes through a plan:

1. **Prepare.** `prepare_media_generation` checks the request (against the model's live schema for
   `run_model`), fills in cheap defaults you didn't set, and prices it: an exact quote where one
   is known, otherwise an upper-bound estimate from kie.ai's own price list. Nothing is sent to
   kie.ai yet.
2. **Approve.** Who says yes depends on `KIE_AI_APPROVAL`, which only the person who starts the
   server or CLI can set:

   | Mode | Who approves | Use it for |
   |---|---|---|
   | `form` (default) | You, in the app's approval dialog. In the CLI you type a code it shows you in your terminal | Claude Code, apps that show MCP forms, the CLI used by a person |
   | `chat` | You, in chat: the agent shows the plan, you say yes, it calls `approve_media_generation` | Cursor, Codex, WorkBuddy and other apps without approval forms |
   | `auto` | Nobody, for plans up to `KIE_AI_AUTO_APPROVE_CREDITS` | Unattended pipelines |

3. **Submit.** `submit_media_generation` runs an approved plan once and returns every task it
   created, even when one item fails, so nothing gets paid for twice.

**Caps hold in every mode**, enforced in code: no plan above `KIE_AI_MAX_CREDITS_PER_PLAN`
(default 150 credits), and no more than `KIE_AI_MAX_CREDITS_PER_DAY` (default 600) in any 24 hours,
counting what kie.ai actually charged where it reports it. A plan with an unknown price needs a
person to accept that explicitly, and auto mode never approves one.

What these controls can and can't do:

- They stop accidents and keep an honest agent inside your limits. They don't stop a determined
  agent: in `chat` mode it relays your answer, and an agent with a shell can change the CLI's
  environment or call kie.ai with your key directly. For agents, the hard limit is a kie.ai API key
  with its own credit limit.
- An item with an unknown price counts as a full plan (`KIE_AI_MAX_CREDITS_PER_PLAN`) until kie.ai
  reports its real charge, which can be higher. Estimates are upper bounds; when kie.ai prices a
  model by characters, tokens, megapixels or input media, the estimate is "unknown" instead.
- An item that returns no task id (rejected, or timed out) keeps its estimate booked for 24 hours,
  since a timeout can hide a task kie.ai did create.
- The ledger lives in the local task database, so separate machines or databases don't share it.
- The OpenAI-compatible server in `packages/openai` is outside these controls.
- `KIE_AI_ALLOW_DIRECT_GENERATION=true` turns plans off entirely; leave it off.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `KIE_AI_API_KEY` | yes | Your kie.ai API key. `KIE_API_KEY`, the name kie.ai's own docs use, works too |
| `KIE_AI_CACHE_DIR` | no | Where model schemas are cached (default `~/.kie-ai/cache`, kept 24 hours) |
| `KIE_AI_ENABLED_TOOLS` | no | Comma-separated tool names to load, to keep the agent's context small |
| `KIE_AI_TOOL_CATEGORIES` | no | Load whole categories: `image`, `video`, `audio`, `catalog` (`run_model`), `utility` |
| `KIE_AI_DISABLED_TOOLS` | no | Tools to hide. Disabling a model tool such as `veo3_generate_video` does not stop the same model through `run_model`; disable `run_model` too |
| `KIE_AI_APPROVAL` | no | `form` (default), `chat` or `auto`. See "How spending works" |
| `KIE_AI_MAX_CREDITS_PER_PLAN` | no | Cap per plan, default 150 credits |
| `KIE_AI_MAX_CREDITS_PER_DAY` | no | Cap per 24 hours, default 600 credits |
| `KIE_AI_AUTO_APPROVE_CREDITS` | no | Auto mode: largest plan approved without asking, default 0 |
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

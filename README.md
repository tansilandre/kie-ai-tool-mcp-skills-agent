# kie-ai-tool: MCP server, CLI, skills and agent for kie.ai

An open-source toolkit that lets AI agents (Claude Code, Codex, Cursor, Claude Desktop, WorkBuddy or
any MCP client) make images, video, music and speech with [kie.ai](https://kie.ai), safely and
cheaply.

[kie.ai](https://kie.ai) resells 200+ generation models (GPT Image 2, Nano Banana, Seedream, Veo 3.1,
Kling 3.0, Seedance, Gemini Omni, Suno, ElevenLabs and more) behind one API key, usually well below
the official price. This repo gives agents a proper way to use it: find the right model, show the
price, wait for your yes, generate, and hand back the files.

> **Status: early, under active development.** What works today is the MCP server and CLI inherited
> from [felores/kie-cli-mcp](https://github.com/felores/kie-cli-mcp): 38 kie.ai models behind a
> prepare → approve → submit step. The live model catalog, the plugin install, the creative skills and
> the agent are being built now. See the [roadmap](docs/ROADMAP.md).

## What's inside

| Part | Path | What it does |
|---|---|---|
| MCP server | [`packages/mcp`](packages/mcp) | Exposes kie.ai models as MCP tools, over stdio or Streamable HTTP |
| CLI | [`packages/cli`](packages/cli) | The same tools from the terminal (`kie-cli <tool> --flags`) |
| OpenAI-compatible server | [`packages/openai`](packages/openai) | Selected image and video models behind OpenAI-shaped routes |
| Shared core | [`packages/core`](packages/core) | kie.ai client, tool registry, pricing, plans, task store |
| Skills | [`skills/`](skills) | Instructions agents load to use the toolkit well |
| Agent | planned | A ready-made agent that plans, prices and produces media |

## Run it today (from source)

You need Node.js 20 or newer and a kie.ai API key from [kie.ai/api-key](https://kie.ai/api-key).

```bash
git clone https://github.com/tansilandre/kie-ai-tool-mcp-skills-agent
cd kie-ai-tool-mcp-skills-agent
npm ci
npm run build
```

### Add the MCP server to Claude Code

```bash
claude mcp add kie-ai --env KIE_AI_API_KEY=your-key -- node "$PWD/packages/mcp/dist/index.js"
```

### Add it to any other MCP client

Put this in the client's MCP config (for Claude Desktop that is `claude_desktop_config.json`), with
the absolute path to your clone:

```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "node",
      "args": ["/absolute/path/to/kie-ai-tool-mcp-skills-agent/packages/mcp/dist/index.js"],
      "env": { "KIE_AI_API_KEY": "your-key" }
    }
  }
}
```

### Use the CLI

```bash
export KIE_AI_API_KEY=your-key
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js list_models --filter video
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
| `KIE_AI_API_KEY` | yes | Your kie.ai API key |
| `KIE_AI_ENABLED_TOOLS` | no | Comma-separated tool names to load, to keep the agent's context small |
| `KIE_AI_TOOL_CATEGORIES` | no | Load whole categories: `image`, `video`, `audio`, `utility` |
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

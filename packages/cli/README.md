# @kie-ai-tool/cli

Standalone command-line interface for the [Kie.ai](https://kie.ai) APIs: generate
images, video, music and speech from your terminal. Same models as the
`@kie-ai-tool/mcp`
MCP server, no MCP client required.

The CLI and the MCP server are generated from one shared tool registry, so both
always expose the exact same tools. They install and run completely
independently.

## Install

Needs Node.js 22.13 or newer.

```bash
npm install -g @kie-ai-tool/cli      # then: kie --help
# or without installing:
npx @kie-ai-tool/cli --help
```

## Setup

```bash
export KIE_API_KEY="your-key"       # Windows PowerShell: $env:KIE_API_KEY = "your-key"
```

Optional: `KIE_AI_BASE_URL`, `KIE_AI_TIMEOUT`, `KIE_AI_DB_PATH`, `KIE_AI_CALLBACK_URL`.
`upload_file` accepts validated Base64 or a local path beneath explicitly
configured `KIE_CLI_UPLOAD_ROOTS`. Temporary HTTP upload
capabilities and `upload_widget` require the MCP HTTP adapter and return clear
unsupported-adapter guidance in the CLI.

## Usage

```bash
# List every tool (commands map 1:1 to the MCP tools)
kie --help

# See the flags for a tool (derived from its schema)
kie nano_banana_image --help

# Generate an image
kie nano_banana_image --prompt "a red panda coding at night" --resolution 2K

# Generate a video, then poll the task
kie veo3_generate_video --prompt "drone shot over a canyon at sunrise"
kie get_task_status --task_id <id>

# List recent tasks
kie list_tasks --limit 10
```

### JSON output

Add `--json` to print the raw tool result (machine-readable, ideal for piping to
`jq` or other agents):

```bash
kie list_tasks --json | jq '.tasks'
```

Tools that return a `success: false` payload set a non-zero exit code.

## Available tools

Run `kie --help` for the current list. Tools are grouped by category
(`image`, `video`, `audio`, `utility`) and include Nano Banana, Veo3, Suno,
ElevenLabs, ByteDance Seedance 2.5/Seedream, Qwen, Runway Aleph, Midjourney, Wan,
MiniMax H3 (Hailuo 03), Kling, GPT Image 2, Flux Kontext, Recraft, Ideogram, Topaz, HappyHorse
and more.

## License

MIT

## Spending

Every paid command runs through a plan: `prepare_media_generation`, your approval (in a terminal,
`submit_media_generation --planId <id>` shows the plan and asks you to type a code), then the
submit. Credit caps apply. See the [main README](https://github.com/tansilandre/kie-ai-tool-mcp-skills-agent#how-spending-works).

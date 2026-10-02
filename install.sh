#!/usr/bin/env sh
# kie-ai-tool installer for macOS and Linux. Safe to run again: it updates.
#
#   curl -fsSL https://raw.githubusercontent.com/tansilandre/kie-ai-tool-mcp-skills-agent/main/install.sh | sh
#   sh install.sh --register     # also register with Claude Code and Codex
#
# It clones (or updates) the toolkit into ~/.kie-ai-tool, checks Node.js, and
# prints the exact setup for each AI app it finds. It never asks for or stores
# your kie.ai key: you set it where each app keeps secrets.
set -eu

REPO="${KIE_AI_TOOL_REPO:-https://github.com/tansilandre/kie-ai-tool-mcp-skills-agent}"
DIR="${KIE_AI_TOOL_HOME:-$HOME/.kie-ai-tool}"
REGISTER=0
for arg in "$@"; do
  case "$arg" in
    --register) REGISTER=1 ;;
    -h|--help)
      sed -n '2,10p' "$0" 2>/dev/null || true
      exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

say() { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }

step "Checking Node.js"
if ! command -v node >/dev/null 2>&1; then
  say "Node.js is not installed. Install Node.js 22 LTS or newer from https://nodejs.org and run this again."
  exit 1
fi
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  say "Node.js $(node -v) is too old. kie-ai-tool needs 22.13 or newer (https://nodejs.org)."
  exit 1
fi
say "Node.js $(node -v): OK"

step "Getting the toolkit into $DIR"
if ! command -v git >/dev/null 2>&1; then
  say "git is not installed. Install git (https://git-scm.com) and run this again."
  exit 1
fi
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only --quiet
  say "Updated."
else
  git clone --depth 1 --quiet "$REPO" "$DIR"
  say "Installed."
fi
node "$DIR/bundle/kie-cli.mjs" --help >/dev/null
say "The bundled CLI and MCP server run: OK"

SERVER="$DIR/bundle/kie-mcp.mjs"
CLI="$DIR/bundle/kie-cli.mjs"

if command -v claude >/dev/null 2>&1; then
  step "Claude Code"
  if [ "$REGISTER" -eq 1 ]; then
    claude plugin marketplace add "$DIR" >/dev/null 2>&1 || claude plugin marketplace update kie-ai-tool >/dev/null 2>&1 || true
    claude plugin install kie@kie-ai-tool
    say "Installed the plugin. In Claude Code, run /plugin configure kie@kie-ai-tool to add your kie.ai key."
  else
    say "In Claude Code, run:"
    say "  /plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent"
    say "  /plugin install kie@kie-ai-tool"
    say "It asks for your kie.ai key once and keeps it in your system's secure storage."
  fi
fi

if command -v codex >/dev/null 2>&1; then
  step "Codex"
  say "Add the server (put your key where it says; Codex keeps it in ~/.codex/config.toml):"
  say "  codex mcp add kie --env KIE_API_KEY=<your kie.ai key> --env KIE_AI_APPROVAL=chat -- node \"$SERVER\""
  if [ "$REGISTER" -eq 1 ]; then
    mkdir -p "$HOME/.codex/skills"
    for skill in "$DIR"/skills/*/; do
      name="$(basename "$skill")"
      [ -e "$HOME/.codex/skills/$name" ] || ln -s "$skill" "$HOME/.codex/skills/$name"
    done
    say "Linked the skills into ~/.codex/skills."
  else
    say "Skills: link each folder of $DIR/skills into ~/.codex/skills (or run this with --register)."
  fi
fi

step "Any other MCP app (Claude Desktop, Cursor, WorkBuddy, ...)"
say "Add this server to the app's MCP settings, with your key:"
cat <<EOF
{
  "mcpServers": {
    "kie": {
      "command": "node",
      "args": ["$SERVER"],
      "env": { "KIE_API_KEY": "<your kie.ai key>", "KIE_AI_APPROVAL": "chat" }
    }
  }
}
EOF
say "Use \"form\" instead of \"chat\" if the app shows MCP approval forms."

step "Command line"
say "  export KIE_API_KEY=<your kie.ai key>"
say "  alias kie=\"node '$CLI'\""
say "  kie search_models --query veo"
say ""
say "Get a key at https://kie.ai/api-key. Docs: $REPO#readme"

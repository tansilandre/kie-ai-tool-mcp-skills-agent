# kie-ai-tool installer for Windows (PowerShell). Safe to run again: it updates.
#
#   irm https://raw.githubusercontent.com/tansilandre/kie-ai-tool-mcp-skills-agent/main/install.ps1 | iex
#   .\install.ps1 -Register      # also register with Claude Code and copy skills for Codex
#
# It clones (or updates) the toolkit into %USERPROFILE%\.kie-ai-tool, checks
# Node.js, and prints the exact setup for each AI app it finds. It never asks
# for or stores your kie.ai key: you set it where each app keeps secrets.
param([switch]$Register)
$ErrorActionPreference = "Stop"

$Repo = if ($env:KIE_AI_TOOL_REPO) { $env:KIE_AI_TOOL_REPO } else { "https://github.com/tansilandre/kie-ai-tool-mcp-skills-agent" }
$Dir = if ($env:KIE_AI_TOOL_HOME) { $env:KIE_AI_TOOL_HOME } else { Join-Path $HOME ".kie-ai-tool" }

function Step([string]$Text) { Write-Host "`n== $Text" }

Step "Checking Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Install Node.js 22 LTS or newer from https://nodejs.org and run this again."
  exit 1
}
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Node.js $(node -v) is too old. kie-ai-tool needs 22.13 or newer (https://nodejs.org)."
  exit 1
}
Write-Host "Node.js $(node -v): OK"

Step "Getting the toolkit into $Dir"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "git is not installed. Install Git for Windows (https://git-scm.com) and run this again."
  exit 1
}
if (Test-Path (Join-Path $Dir ".git")) {
  git -C $Dir pull --ff-only --quiet
  Write-Host "Updated."
} else {
  git clone --depth 1 --quiet $Repo $Dir
  Write-Host "Installed."
}
$Server = Join-Path $Dir "bundle\kie-mcp.mjs"
$Cli = Join-Path $Dir "bundle\kie-cli.mjs"
node $Cli --help | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "The bundled CLI did not start."; exit 1 }
Write-Host "The bundled CLI and MCP server run: OK"

if (Get-Command claude -ErrorAction SilentlyContinue) {
  Step "Claude Code"
  if ($Register) {
    claude plugin marketplace add $Dir 2>$null
    if ($LASTEXITCODE -ne 0) { claude plugin marketplace update kie-ai-tool 2>$null }
    claude plugin install kie@kie-ai-tool
    Write-Host "Installed the plugin. In Claude Code, run /plugin configure kie@kie-ai-tool to add your kie.ai key."
  } else {
    Write-Host "In Claude Code, run:"
    Write-Host "  /plugin marketplace add tansilandre/kie-ai-tool-mcp-skills-agent"
    Write-Host "  /plugin install kie@kie-ai-tool"
    Write-Host "It asks for your kie.ai key once and keeps it in your system's secure storage."
  }
}

if (Get-Command codex -ErrorAction SilentlyContinue) {
  Step "Codex"
  Write-Host "Add the server (put your key where it says; Codex keeps it in its config file):"
  Write-Host "  codex mcp add kie --env KIE_API_KEY=<your kie.ai key> --env KIE_AI_APPROVAL=chat -- node `"$Server`""
  $CodexSkills = Join-Path $HOME ".codex\skills"
  if ($Register) {
    New-Item -ItemType Directory -Force -Path $CodexSkills | Out-Null
    Get-ChildItem -Directory (Join-Path $Dir "skills") | ForEach-Object {
      Copy-Item -Recurse -Force $_.FullName (Join-Path $CodexSkills $_.Name)
    }
    Write-Host "Copied the skills into $CodexSkills (run this again after updating)."
  } else {
    Write-Host "Skills: copy each folder of $Dir\skills into $CodexSkills (or run this with -Register)."
  }
}

Step "Any other MCP app (Claude Desktop, Cursor, WorkBuddy, ...)"
Write-Host "Add this server to the app's MCP settings, with your key:"
$ServerJson = $Server.Replace("\", "\\")
Write-Host @"
{
  "mcpServers": {
    "kie": {
      "command": "node",
      "args": ["$ServerJson"],
      "env": { "KIE_API_KEY": "<your kie.ai key>", "KIE_AI_APPROVAL": "chat" }
    }
  }
}
"@
Write-Host "Use `"form`" instead of `"chat`" if the app shows MCP approval forms."

Step "Command line"
Write-Host "  `$env:KIE_API_KEY = `"<your kie.ai key>`""
Write-Host "  node `"$Cli`" search_models --query veo"
Write-Host ""
Write-Host "Get a key at https://kie.ai/api-key. Docs: $Repo#readme"

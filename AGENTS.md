# Agent Guidelines for kie-ai-tool-mcp-skills-agent

`CLAUDE.md` is a symlink to this file, so Claude Code, Codex and other agents read the same rules.

## Project goal

An open-source kie.ai toolkit that any AI agent can use: MCP server, CLI, agent skills and a
ready-made agent. It must be powerful (every kie.ai model), safe with money (no spend without the
human's yes, hard caps in code), usable everywhere (Claude Code, Codex, Cursor, Claude Desktop,
WorkBuddy, any MCP client; macOS, Linux, Windows) and easy to install. The plan and its status are
in [`docs/ROADMAP.md`](docs/ROADMAP.md); read it before starting a feature.

## Rules for agents working on this repo

1. **Never print, log, commit or paste an API key.** Read `KIE_AI_API_KEY` from the environment
   only. Test fixtures use obviously fake keys.
2. **No paid kie.ai call without the human's explicit yes in this session.** Free calls (catalog,
   schema, price, success rate, balance, task status) are fine. When a live test is approved, use
   the cheapest model at the lowest resolution (for example gpt-image-2 at 1K, Veo 3.1 Lite at
   720p) and report the credits it actually cost.
3. **Every paid generation path goes through prepare → approve → submit, inside the credit
   caps** (`docs/design/spend-controls.md`). Do not add a code path
   that spends credits without a plan, and do not weaken the approval or credit caps to make a
   test pass.
4. **Work on a branch and land it through a pull request** with green CI (see "Landing the plane").
   Conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`). The commit body says
   why, not just what.
5. **Run the quality gates before every push:** `npm run build && npm run typecheck && npm test &&
   npm run check`. Use the npm scripts, never a bare `npx <tool>`: in a checkout without
   `node_modules`, `npx biome` downloads an unrelated npm package called `biome`.
6. **Do not invent model names, fields or prices.** Read them from kie.ai's live catalog
   (`GET /api/v1/models`, `/api/v1/models/{model}/schema`) or the docs, and cite the source.
7. **Credit upstream work.** Code or text adapted from another project keeps its license notice
   and is listed in [`NOTICE.md`](NOTICE.md).
8. **Rebuild the plugin bundles** after changing anything under `packages/`: `npm run build &&
   npm run bundle:plugin`, and commit `bundle/`. Plugin hosts run `bundle/kie-mcp.mjs` straight from
   the clone; CI rebuilds the bundles and fails if the committed ones differ.
9. Keep install commands pointing only at things that exist. This fork is not on npm yet, so never
   tell users to `npx` an `@kie-ai-tool/*` package until it is published.

## Plugin layout

The repo root is also a Claude Code plugin and marketplace:

- `.claude-plugin/plugin.json`: plugin `kie` (MCP server `kie` running `bundle/kie-mcp.mjs`). Its user
  settings reach the server as `KIE_AI_PLUGIN_*` variables (`KIE_AI_PLUGIN_API_KEY`,
  `KIE_AI_PLUGIN_APPROVAL`, …), which win over the usual `KIE_AI_*` names when filled in; an
  unfilled `${user_config.x}` placeholder (Codex installs the same plugin but doesn't fill them)
  falls back to the person's own `KIE_AI_*` / `KIE_API_KEY`. Codex reads the same
  `.claude-plugin/marketplace.json`.
- `install.sh` / `install.ps1`: clone or update into `~/.kie-ai-tool`, check Node, print per-app setup;
  `--register` installs the Claude Code plugin and links skills for Codex. Test `install.sh` with a
  throwaway `HOME` and `CLAUDE_CONFIG_DIR` (and `KIE_AI_TOOL_REPO` pointing at your checkout).
- `.claude-plugin/marketplace.json`: marketplace `kie-ai-tool`, one plugin with source `./`.
- `skills/<name>/SKILL.md`: skills, namespaced `kie:<name>` in Claude Code.
- `agents/<name>.md`: agents. Plugin MCP tools are named `mcp__plugin_kie_kie__<tool>`.

Check changes with `claude plugin validate .claude-plugin/plugin.json --strict` and
`claude plugin validate . --strict`.

**Hosts show the model `structuredContent` instead of the text.** Claude Code does this, so
`packages/mcp/src/result-normalization.ts` mirrors every field of a tool's JSON text into
`structuredContent`, and output schemas are loose objects. Never return a structured result that
leaves out something the model needs, such as result URLs, prices or the plan.

## Authoritative MCP Documentation
- Start with the official MCP documentation index at https://modelcontextprotocol.io/llms.txt for current protocol and MCP Apps contracts, then follow its relevant source links.

## Design direction (from upstream)
- **Simplify tool interfaces** - Reduce cognitive load for users
- **Consolidate related tools** - Example: merge `generate_nano_banana`, `edit_nano_banana`, and `upscale_nano_banana` into a single unified `nano_banana` tool that auto-detects mode based on parameters (presence of `image_urls` = edit mode, presence of `scale` = upscale mode, etc.)
- **Maintain backwards compatibility** when possible
- **Improve user experience** through intuitive parameter design

## Build/Test Commands
- Build: `npm run build` (TypeScript → dist/), then `npm run bundle:plugin` (bundle/)
- Test: `npm test` (Jest)
- Dev: `npm run dev` (tsx auto-reload)
- Type check: `npx tsc --noEmit`

## Available CLI Tools
- **Git**: Full git access for version control
- **GitHub CLI** (`gh`): Create releases, manage PRs, issues, etc.
- **NPM**: Package management and publishing

## Code Style
- **Module system**: ES modules (`.js` extensions in imports)
- **TypeScript**: Strict mode, explicit types, no `any` except for request handlers
- **Imports**: MCP SDK imports use `.js` extension, local imports use `.js` extension
- **Validation**: Use Zod schemas for all request validation (see types.ts)
- **Error handling**: Wrap errors in `McpError` with appropriate `ErrorCode`
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Database**: SQLite with TaskDatabase class, always update task status
  - Use `await db.createTask()` when creating new generation tasks
  - Use `await db.updateTask()` to sync status after API calls
  - Store api_type for intelligent endpoint routing
  - Handle database errors gracefully with try-catch blocks
  - Use local database as cache to reduce API calls
- **API client**: Use KieAiClient class methods, never construct raw fetch calls
- **Response format**: Return MCP tool responses with JSON.stringify and `null, 2`
- **Async/await**: Use async/await, avoid promises directly

## Callback URL Pattern
For tools requiring callback URLs (like Veo3, Suno):
- **Schema**: Make `callBackUrl` optional in Zod schema
- **Fallback**: Use `KIE_AI_CALLBACK_URL` environment variable if not provided
- **Validation**: Check both direct parameter and environment variable in refine
- **Handler**: Add fallback logic before API call: `if (!request.callBackUrl && process.env.KIE_AI_CALLBACK_URL)`
- **Documentation**: Show both explicit and environment variable approaches in examples

## Environment
- Required: `KIE_AI_API_KEY`
- Optional: `KIE_AI_BASE_URL`, `KIE_AI_TIMEOUT`, `KIE_AI_DB_PATH`, `KIE_AI_CALLBACK_URL`

## Architecture (monorepo, npm workspaces)

One shared `core` feeds two independently installable surfaces:

```text
packages/core   @kie-ai-tool/core  (PRIVATE, never published; bundled into both)
  src/tools/         tool registry, one ToolDef per model (single source of truth)
  src/kie-ai-client.ts  KieAiClient -> Kie.ai API
  src/database.ts       TaskDatabase (SQLite task persistence)
  src/types.ts          Zod schemas
packages/mcp    @kie-ai-tool/mcp  (bin: kie-ai-mcp-server)
  src/index.ts          MCP adapter: listTools + dispatch derived from TOOL_REGISTRY
packages/cli    @kie-ai-tool/cli            (bin: kie-cli)
  src/index.ts          CLI adapter: yargs commands derived from TOOL_REGISTRY
```

- A tool is one `ToolDef { name, description, category, schema, run(args, ctx) }`.
- `run()` returns the MCP content envelope; the MCP server returns it verbatim, and the CLI unwraps `content[0].text`.
- MCP `inputSchema` and CLI flags are derived from the tool's Zod schema via `toInputJsonSchema`. Zod is the only schema definition.
- esbuild bundles `core` into each publishable package; `npm run bundle:plugin` also inlines every dependency into `bundle/`. The task store uses Node's built-in `node:sqlite`, so there is no native module. `core` is never published.
- Build: `npm run build` (all), `npm run bundle` (publish bundles), `npm test` (core Jest), `npm run typecheck`.

## Adding New Tools

Adding a model is one tool file plus one client method. The MCP server and CLI discover it automatically through the registry.

1. Check endpoint status in `docs/ENDPOINTS.md`.
2. Check [Kie Market](https://kie.ai/market) for API and model updates before implementation.
3. Research the relevant Kie.ai playground page and API documentation.
4. Save endpoint documentation in `docs/kie/{provider}_{model}.md`.
5. Run `npm run add-tool -- <tool_name> [image|video|audio|utility]`.
6. Define the Zod schema in `packages/core/src/types.ts`, add the client method, and implement the tool in `packages/core/src/tools/<tool_name>.ts`.
7. Add a source-backed entry to `packages/core/src/model-catalog.ts`. Add a rate-card formula only when every request dimension has official evidence, a source URL, fingerprint, verification date, and tests. Otherwise the price state stays `unknown`.
8. Update `EXPECTED_TOOL_NAMES` in `packages/core/src/__tests__/registry.test.ts`, then run `npm run build && npm test && npm run docs`.

### Key Files
| What | Where |
|------|-------|
| Endpoint tracking | `docs/ENDPOINTS.md` |
| Kie API and model updates | `https://kie.ai/market` |
| Scaffold a tool | `npm run add-tool -- <name> <category>` |
| Tool registry | `packages/core/src/tools/index.ts` |
| One tool per file | `packages/core/src/tools/<tool_name>.ts` |
| Zod schemas | `packages/core/src/types.ts` |
| API client | `packages/core/src/kie-ai-client.ts` |
| MCP adapter | `packages/mcp/src/index.ts` |
| CLI adapter | `packages/cli/src/index.ts` |
| Registry tests | `packages/core/src/__tests__/registry.test.ts` |
| Tool documentation | `docs/TOOLS.md` |


## Database & Task Management

### **Database Architecture**
- **SQLite Database**: Local persistent storage using Node's built-in `node:sqlite` (Node 22.13+)
- **TaskDatabase Class**: Wrapper class providing Promise-based database operations
- **Auto-initialization**: Creates tables and indexes on first run
- **Thread Safety**: Uses SQLite serialization for concurrent access

### **Database Schema**
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT UNIQUE NOT NULL,
  api_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  result_url TEXT,
  error_message TEXT
);

-- Performance indexes
CREATE INDEX idx_task_id ON tasks(task_id);
CREATE INDEX idx_status ON tasks(status);
```

### **Task Lifecycle Management**
1. **Task Creation**: When user calls generation tool → `INSERT` with status 'pending'
2. **Status Updates**: During API polling → `UPDATE` status based on API response
3. **Completion**: When API returns success → `UPDATE` with result_url
4. **Failure**: When API returns error → `UPDATE` with error_message

### **Database Operations**
```typescript
// Core methods available in TaskDatabase class
await db.createTask({ task_id, api_type, status });           // Create new task
await db.getTask(task_id);                                   // Get specific task
await db.updateTask(task_id, { status, result_url });         // Update task
await db.getAllTasks(limit);                                 // List all tasks
await db.getTasksByStatus(status, limit);                    // Filter by status
```

### **Smart Status Checking Pattern**
The `get_task_status` tool implements intelligent status checking:

1. **Local Database Query**: Fast lookup of task metadata and api_type
2. **API Endpoint Routing**: Use api_type to call correct Kie.ai endpoint
3. **Database Synchronization**: Update local record with latest API data
4. **Combined Response**: Merge local and API data for complete picture

### **API Type Routing Strategy**
```typescript
// Client uses api_type to determine correct endpoint
if (apiType === 'veo3') {
  return this.makeRequest(`/veo/record-info?taskId=${taskId}`, 'GET');
} else if (apiType === 'suno') {
  return this.makeRequest(`/generate/record-info?taskId=${taskId}`, 'GET');
} else if (apiType.includes('elevenlabs') || apiType.includes('bytedance')) {
  return this.makeRequest(`/jobs/recordInfo?taskId=${taskId}`, 'GET');
}
```

### **Database Configuration**
- **Environment Variable**: `KIE_AI_DB_PATH` (default: `./tasks.db`)
- **Auto-creation**: Database and tables created automatically on startup
- **Persistence**: Data survives server restarts
- **Inspectability**: Can be opened with any SQLite client tool

### **Task Status Values**
- **`pending`**: Task created, waiting for API processing
- **`processing`**: API is actively processing the task
- **`completed`**: Task finished successfully, result available
- **`failed`**: Task failed, error message available

### **Best Practices for Agents**
- **Always update task status** in database after API calls
- **Use api_type from database** for intelligent endpoint routing
- **Store both local and API status** for comprehensive tracking
- **Handle database errors gracefully** with proper error messages
- **Use transactions** when multiple updates are needed (not currently implemented)
- **Consider cleanup strategies** for old completed tasks (future enhancement)

### **Performance Considerations**
- **Indexed Queries**: task_id and status fields are indexed for fast lookups
- **Local Caching**: Database reduces API calls for status checks
- **Connection Management**: Single database connection per server instance
- **Memory Usage**: SQLite is lightweight and efficient for task tracking

### **Future Database Enhancements**
- **Task Expiration**: Automatic cleanup of old completed tasks
- **User Association**: Multi-user support with user_id field
- **Task Metadata**: Additional fields for parameters, model versions, etc.
- **Statistics**: Analytics and usage tracking tables
- **Batch Operations**: Bulk status updates and cleanup operations

## Releases

Not on npm yet. The `@kie-ai-tool` npm scope must be reserved first; until then nothing is
published and `release.yml` (triggered by a `v*` tag or by hand) must not be run. Once publishing
is set up:

- Versions follow semver per package; bump the version, update `CHANGELOG.md` and the package
  README in the same pull request.
- `release.yml` publishes the public packages with npm provenance using the `NPM_TOKEN` secret.
  `@kie-ai-tool/core` stays private and is bundled into each public package.
- Run `npm pack -w <package> --dry-run` before tagging and check the file list.

## MCP Tool Architecture & Schema Design

### **Unified Tool Pattern**

Our primary design goal is **unified tools** that consolidate multiple related capabilities into single interfaces. This reduces cognitive load and simplifies user experience.

#### **Examples of Unified Tools:**
- `bytedance_seedance_video`: Text-to-video + Image-to-video
- `bytedance_seedream_image`: Text-to-image + Image editing
- `qwen_image`: Text-to-image + Image editing
- `midjourney_generate`: 6 generation modes in one tool
- `openai_4o_image`: Text-to-image + Image editing + Image variants

### **Schema Design Principles**

#### **1. Union Schema Pattern**
For unified tools, create a single schema that encompasses ALL possible parameters across all modes:

```typescript
// All parameters are optional at the schema level
UnifiedToolSchema = z.object({
  // Parameters for mode A
  prompt: z.string().optional(),
  
  // Parameters for mode B  
  imageUrl: z.string().url().optional(),
  
  // Parameters for mode C
  maskUrl: z.string().url().optional(),
  
  // Common parameters
  quality: z.enum(['standard', 'hd']).default('standard'),
  callBackUrl: z.string().url().optional()
}).refine((data) => {
  // Business logic validation for mode requirements
  return validateModeRequirements(data);
});
```

#### **2. Smart Mode Detection**
Implement logic to detect the intended mode based on parameter combinations:

```typescript
// Mode detection logic in refine() or handler
const hasPrompt = !!data.prompt;
const hasImage = !!data.imageUrl;
const hasMask = !!data.maskUrl;

if (hasImage && hasMask) {
  // Image editing mode
  return hasPrompt; // prompt required for editing
} else if (hasImage) {
  // Image variants mode
  return true; // prompt optional
} else {
  // Text-to-image mode
  return hasPrompt; // prompt required
}
```

#### **3. Single vs Multiple Endpoints**

**Single Endpoint Tools** (API handles mode detection internally):
- `openai_4o_image`: One endpoint `/gpt4o-image/generate`
- API determines behavior based on parameter presence
- Server just passes parameters through

**Multiple Endpoint Tools** (Server routes to different endpoints):
- `bytedance_seedance_video`: Routes to different endpoints based on quality/mode
- `midjourney_generate`: Routes to different MJ endpoints based on task type
- Server handles intelligent endpoint selection

### **Client Instructions vs Schema Delivery**

#### **What MCP Server Provides Automatically:**
1. **Tool Discovery**: `ListToolsResponse` with all available tools
2. **Schema Delivery**: Complete JSON Schema for each tool
3. **Parameter Validation**: Type checking, constraints, enums
4. **Error Messages**: Validation failures with specific guidance

#### **What Should Go in Client Instructions:**

**❌ DON'T Include:**
- Raw schema definitions (they're delivered automatically)
- Parameter type information (handled by MCP)
- Validation rules (enforced by server)

**✅ DO Include:**
1. **Tool Capabilities**: High-level descriptions of what each tool does
2. **Usage Patterns**: Common workflows and parameter combinations
3. **Mode Logic**: Explain how unified tools detect modes
4. **Best Practices**: Tips for getting good results
5. **Parameter Selection**: Guidance on choosing between options
6. **Error Handling**: What to do when things go wrong

**Example Client Instruction:**
> "Use `openai_4o_image` for all image generation needs. It automatically detects whether you want to generate from text (provide prompt), edit an existing image (provide prompt + imageUrl + maskUrl), or create variants (provide imageUrl). Generate 4 variants by default for best results. Use HD quality for professional work."

### **Implementation Patterns**

#### **Pattern 1: Single Endpoint, Smart API**
```typescript
// API handles mode detection internally
async generateOpenAI4oImage(request: OpenAI4oImageRequest) {
  const payload = {
    prompt: request.prompt,
    filesUrl: request.filesUrl,
    maskUrl: request.maskUrl,
    // ... other parameters
  };
  
  // Always same endpoint - API figures out what to do
  return this.makeRequest('/gpt4o-image/generate', 'POST', payload);
}
```

#### **Pattern 2: Multiple Endpoints, Smart Routing**
```typescript
// Server routes to different endpoints based on mode
async generateByteDanceSeedanceVideo(request: ByteDanceSeedanceVideoRequest) {
  const isImageToVideo = !!request.image_url;
  const isProQuality = request.quality === 'pro';
  
  let endpoint = '/bytedance/seedance/';
  endpoint += isProQuality ? 'v1-pro-' : 'v1-lite-';
  endpoint += isImageToVideo ? 'image-to-video' : 'text-to-video';
  
  return this.makeRequest(endpoint, 'POST', request);
}
```

#### **Pattern 3: Complex Mode Detection**
```typescript
// Midjourney - complex parameter combinations determine mode
async generateMidjourney(request: MidjourneyGenerateRequest) {
  let taskType = 'mj_txt2img'; // default
  
  // Smart detection based on parameters
  if (request.high_definition_video || request.motion) {
    taskType = request.high_definition_video ? 'mj_video_hd' : 'mj_video';
  } else if (request.ow) {
    taskType = 'mj_omni_reference';
  } else if (request.taskType === 'mj_style_reference') {
    taskType = 'mj_style_reference';
  } else if (request.fileUrls || request.fileUrl) {
    taskType = 'mj_img2img';
  }
  
  const payload = { ...request, taskType };
  return this.makeRequest('/mj/generate', 'POST', payload);
}
```

### **Schema Validation Best Practices**

#### **1. Layered Validation**
- **Schema Layer**: Basic type checking (string, number, URL format)
- **Business Logic Layer**: Mode-specific requirement validation
- **API Layer**: Final validation by the target API

#### **2. Clear Error Messages**
```typescript
.refine((data) => {
  // Complex validation with clear error messages
  if (data.maskUrl && !data.filesUrl) {
    return false;
  }
  return true;
}, {
  message: "maskUrl requires filesUrl to be provided",
  path: ["maskUrl"]
});
```

#### **3. Environment Variable Fallbacks**
```typescript
.refine((data) => {
  // Check both direct parameter and environment variable
  const hasCallBackUrl = data.callBackUrl || process.env.KIE_AI_CALLBACK_URL;
  return !!hasCallBackUrl;
}, {
  message: "callBackUrl is required (either directly or via KIE_AI_CALLBACK_URL environment variable)",
  path: ["callBackUrl"]
});
```

### **Future Development Guidelines**

#### **When Adding New Tools:**

1. **Analyze API Structure**: 
   - Single endpoint with smart mode detection? → Pattern 1
   - Multiple distinct endpoints? → Pattern 2
   - Complex parameter combinations? → Pattern 3

2. **Design Unified Schema**:
   - Include ALL possible parameters
   - Make parameters optional at schema level
   - Add business logic validation in refine()

3. **Implement Smart Detection**:
   - Clear, predictable mode detection logic
   - Document the detection rules in client instructions
   - Provide helpful error messages for invalid combinations

4. **Update Documentation**:
   - Add tool to README.md and README.es.md with examples
   - Update CHANGELOG.md
   - Document mode detection logic in AGENTS.md

#### **When Modifying Existing Tools:**

1. **Backward Compatibility**: Add new parameters as optional
2. **Schema Evolution**: Extend existing schemas without breaking changes
3. **Documentation**: Update examples and usage patterns
4. **Testing**: Verify all modes still work correctly

### **Key Takeaways**

1. **Unified Tools > Multiple Tools**: Reduce cognitive load
2. **Schema Delivery is Automatic**: Don't manually paste schemas in client instructions
3. **Smart Mode Detection**: Either API handles it (Pattern 1) or server routes it (Pattern 2/3)
4. **Client Instructions Focus on Usage**: How to use, not what the parameters are
5. **Clear Error Messages**: Help users understand what went wrong and how to fix it

This architecture ensures a clean, maintainable codebase while providing an excellent user experience through intelligent, unified tool interfaces.

## Landing the Plane (Session Completion)

Work is not complete until the change is merged through a pull request with green CI and local
`main` matches `origin/main`.

1. **Run the quality gates** if code changed: build, typecheck, tests, Biome.
2. **Deliver through a pull request**, never a direct push to `main`:
   ```bash
   git switch -c <type>/<topic>      # e.g. feat/live-catalog
   git push -u origin <type>/<topic>
   gh pr create --repo tansilandre/kie-ai-tool-mcp-skills-agent
   # wait for the Verify check to pass, then
   gh pr merge --squash --delete-branch
   git switch main && git pull --ff-only
   ```
   Always pass `--repo tansilandre/kie-ai-tool-mcp-skills-agent` (or run `gh repo set-default`
   first): this repo shares history with felores/kie-cli-mcp, and a pull request must never be
   opened there by accident. The `upstream` remote has its push URL disabled for the same reason.
3. **File issues** for anything left over, and update `docs/ROADMAP.md` when a step lands.
4. **Hand off**: say what changed, what verification found, and what is next.

If CI fails, fix it on the topic branch and push again. Do not bypass the `Verify` check.

## Pulling upstream fixes

`upstream` points at felores/kie-cli-mcp (fetch only). To bring in an upstream fix:

```bash
git fetch upstream
git switch -c chore/upstream-sync
git merge upstream/main   # or cherry-pick the specific commits
```

Package names differ (`@felores/*` upstream, `@kie-ai-tool/*` here), so expect conflicts in
`package.json` files and imports.

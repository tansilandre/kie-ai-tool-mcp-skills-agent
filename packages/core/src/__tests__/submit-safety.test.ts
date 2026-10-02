import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jest } from "@jest/globals";
import { TaskDatabase } from "../database.js";
import { prepareGenerationPlan } from "../generation-plan.js";
import { MISSING_API_KEY_MESSAGE } from "../kie-ai-client.js";
import { getTool } from "../tools/index.js";
import { nanoBananaImageTool } from "../tools/nano_banana_image.js";
import { prepareMediaGenerationTool } from "../tools/prepare_media_generation.js";
import { submitMediaGenerationTool } from "../tools/submit_media_generation.js";
import type { ToolContext, ToolDef } from "../tools/types.js";

let directory: string;
let db: TaskDatabase;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "kie-submit-safety-"));
  db = new TaskDatabase(join(directory, "tasks.db"));
});
afterEach(async () => {
  await db.close();
  rmSync(directory, { recursive: true, force: true });
});

function context(
  database: TaskDatabase,
  tools: (name: string) => ToolDef | undefined,
  client: Record<string, unknown> = {},
): ToolContext {
  return {
    db: database,
    client: client as unknown as ToolContext["client"],
    approvalContext: "test",
    getCallbackUrl: (url) => url ?? "",
    getTool: tools,
    formatError: (_tool, error) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
    }),
  };
}

function read(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

const created = (taskId: string) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({ success: true, task_id: taskId }),
    },
  ],
});
const rejected = {
  content: [
    {
      type: "text" as const,
      text: JSON.stringify({ success: false, error: "Provider rejected" }),
    },
  ],
};

async function approvedPlan(prompts: string[]) {
  const plan = prepareGenerationPlan(
    prompts.map((prompt) => ({ tool: "nano_banana_image", args: { prompt } })),
    new Map([["nano_banana_image", nanoBananaImageTool]]),
    { maxConcurrency: 1 },
  );
  await db.createGenerationPlan(plan, "test");
  await db.approveGenerationPlan(plan.id, plan.requestHash, "test");
  return plan;
}

describe("submit never hides paid tasks", () => {
  test("a partly failed plan still returns the task ids that were created", async () => {
    const run = jest
      .fn<ToolDef["run"]>()
      .mockResolvedValueOnce(created("paid-1"))
      .mockResolvedValueOnce(rejected);
    const tool: ToolDef = { ...nanoBananaImageTool, run };
    const plan = await approvedPlan(["one", "two"]);
    const result = await submitMediaGenerationTool.run(
      { planId: plan.id },
      context(db, (name) => (name === "nano_banana_image" ? tool : undefined)),
    );
    const body = read(result);
    expect(result.isError).toBe(true);
    expect(body.success).toBe(false);
    expect(body.results[0].taskId).toBe("paid-1");
    expect(body.note).toContain("1 task(s) were created and will be charged");
    expect(body.note).toContain("never resubmit them");
    expect(body.note).toContain(
      "may have timed out after kie.ai created a task",
    );
  });

  test("a database error after the tasks exist is a warning, not a lost submission", async () => {
    const run = jest.fn<ToolDef["run"]>().mockResolvedValue(created("paid-2"));
    const tool: ToolDef = { ...nanoBananaImageTool, run };
    const plan = await approvedPlan(["one"]);
    const lockedDb = Object.create(db) as TaskDatabase;
    lockedDb.finishGenerationPlan = async () => {
      throw new Error("database is locked");
    };
    const body = read(
      await submitMediaGenerationTool.run(
        { planId: plan.id },
        context(lockedDb, (name) =>
          name === "nano_banana_image" ? tool : undefined,
        ),
      ),
    );
    expect(body.success).toBe(true);
    expect(body.results[0].taskId).toBe("paid-2");
    expect(body.warning).toContain("Do not submit this work again");
  });
});

describe("prepare without an API key", () => {
  test("refuses before asking anyone to approve a price", async () => {
    const requestPlanApproval =
      jest.fn<NonNullable<ToolContext["requestPlanApproval"]>>();
    const ctx = {
      ...context(db, getTool, { hasApiKey: () => false }),
      requestPlanApproval,
    };
    const body = read(
      await prepareMediaGenerationTool.run(
        { items: [{ tool: "nano_banana_image", args: { prompt: "x" } }] },
        ctx,
      ),
    );
    expect(body.error).toBe(MISSING_API_KEY_MESSAGE);
    expect(requestPlanApproval).not.toHaveBeenCalled();
  });
});

describe("opening an old database from several processes at once", () => {
  test("every process starts; none dies on the column migration race", () => {
    const file = join(directory, "old.db");
    const seedScript = join(directory, "seed.mjs");
    writeFileSync(
      seedScript,
      `import { DatabaseSync } from "node:sqlite";
       const db = new DatabaseSync(process.argv[2]);
       db.exec(${JSON.stringify(
         "CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT UNIQUE NOT NULL, api_type TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, result_url TEXT, error_message TEXT);" +
           "CREATE TABLE generation_plans (plan_id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, plan_json TEXT NOT NULL, request_hash TEXT NOT NULL, submitted_at TEXT, task_results_json TEXT);",
       )});
       db.close();`,
    );
    spawnSync(process.execPath, ["--no-warnings", seedScript, file]);
    // Runs the built store (CI builds before testing) in 16 processes that
    // start together and open the same old file.
    const script = join(directory, "open.mjs");
    writeFileSync(
      script,
      `import { TaskDatabase } from ${JSON.stringify(join(process.cwd(), "dist", "database.js"))};
       const db = new TaskDatabase(process.argv[2]); await db.close();`,
    );
    const runner = join(directory, "race.mjs");
    writeFileSync(
      runner,
      `import { spawn } from "node:child_process";
       const runs = Array.from({ length: 16 }, () => new Promise((resolve) => {
         const child = spawn(process.execPath, [${JSON.stringify(script)}, ${JSON.stringify(file)}], { stdio: ["ignore", "ignore", "pipe"] });
         let err = ""; child.stderr.on("data", (d) => { err += d; });
         child.on("close", (code) => resolve({ code, err }));
       }));
       const results = await Promise.all(runs);
       console.log(JSON.stringify(results.filter((r) => r.code !== 0)));`,
    );
    const out = spawnSync(process.execPath, [runner], {
      encoding: "utf8",
      timeout: 60000,
    });
    expect(JSON.parse(out.stdout.trim())).toEqual([]);
  });
});

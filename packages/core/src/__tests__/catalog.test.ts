import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jest } from "@jest/globals";
import { assertModelId, KieCatalog } from "../catalog.js";
import { TaskDatabase } from "../database.js";
import type { KieAiClient } from "../kie-ai-client.js";
import { extractResultOutputs } from "../tools/get_task_status.js";
import { getTool } from "../tools/index.js";
import { prepareMediaGenerationTool } from "../tools/prepare_media_generation.js";
import { runModelTool } from "../tools/run_model.js";
import type { ToolContext } from "../tools/types.js";

// Real kie.ai responses saved 2026-10-02 (catalog trimmed to 7 models).
function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "src/__tests__/fixtures/catalog", name),
      "utf8",
    ),
  );
}

type Envelope = { code: number; msg: string; data?: unknown };

/** A fake client whose GETs are answered by `routes` in order, per endpoint. */
function fakeClient(routes: Record<string, Envelope[]>) {
  const calls: string[] = [];
  const getEnvelope = jest.fn(async (endpoint: string) => {
    calls.push(endpoint);
    const queue = routes[endpoint];
    if (!queue || queue.length === 0)
      throw new Error(`unexpected GET ${endpoint}`);
    return queue.length > 1 ? (queue.shift() as Envelope) : queue[0];
  });
  const createMarketTask = jest.fn(async (_request: unknown) => ({
    code: 200,
    msg: "success",
    data: { taskId: "task-123" },
  }));
  return {
    client: { getEnvelope, createMarketTask } as unknown as KieAiClient,
    calls,
    getEnvelope,
    createMarketTask,
  };
}

const rateLimited: Envelope = {
  code: 429,
  msg: "Your call frequency is too high. Please try again later.",
};

let cacheDir: string;
beforeEach(() => {
  cacheDir = mkdtempSync(join(tmpdir(), "kie-catalog-"));
});
afterEach(() => {
  rmSync(cacheDir, { recursive: true, force: true });
});

function catalogWith(
  routes: Record<string, Envelope[]>,
  now = () => Date.now(),
) {
  const fake = fakeClient(routes);
  const sleeps: number[] = [];
  const catalog = new KieCatalog(fake.client, {
    cacheDir,
    now,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  return { ...fake, catalog, sleeps };
}

describe("assertModelId", () => {
  test.each([
    "gpt-image-2-text-to-image",
    "bytedance/seedance-1.5-pro",
    "kling-3.0-omni/text-to-video",
  ])("accepts %s", (id) => expect(assertModelId(id)).toBe(id));
  test.each([
    "../chat/credit",
    "a//b",
    "a b",
    "/models",
    "veo-3-1?x=1",
    "a/../b",
    "",
  ])("rejects %p", (id) =>
    expect(() => assertModelId(id)).toThrow("not a valid kie.ai model id"),
  );
});

describe("KieCatalog search", () => {
  test("filters by words, task type and provider from one cached list", async () => {
    const { catalog, calls } = catalogWith({
      "/models": [fixture("models.json")],
    });
    const veo = await catalog.search({ query: "veo" });
    expect(veo.models.map((m) => m.model)).toEqual(["veo-3-1"]);
    const images = await catalog.search({
      taskType: "text to image",
      provider: "openai",
    });
    expect(images.models.map((m) => m.model)).toEqual([
      "gpt-image-2-text-to-image",
    ]);
    const both = await catalog.search({ query: "gpt image" });
    expect(both.total).toBe(2);
    expect(calls).toEqual(["/models"]);
  });

  test("refreshes the list after it expires", async () => {
    let now = 0;
    const { catalog, calls } = catalogWith(
      { "/models": [fixture("models.json")] },
      () => now,
    );
    await catalog.listModels();
    now += 11 * 60 * 1000;
    await catalog.listModels();
    expect(calls).toEqual(["/models", "/models"]);
  });
});

describe("KieCatalog schemas", () => {
  const schemaPath = "/models/gpt-image-2-text-to-image/schema";

  test("caches a schema in memory and on disk", async () => {
    const first = catalogWith({
      [schemaPath]: [fixture("schema_gpt-image-2-text-to-image.json")],
    });
    await first.catalog.getSchema("gpt-image-2-text-to-image");
    await first.catalog.getSchema("gpt-image-2-text-to-image");
    expect(first.calls).toEqual([schemaPath]);

    const second = catalogWith({});
    const shape = await second.catalog.getSchema("gpt-image-2-text-to-image");
    expect(second.calls).toEqual([]);
    expect(shape.inputSchema?.required).toEqual(["prompt"]);
  });

  test("retries a 429 with growing back-off", async () => {
    const { catalog, sleeps } = catalogWith({
      [schemaPath]: [
        rateLimited,
        rateLimited,
        fixture("schema_gpt-image-2-text-to-image.json"),
      ],
    });
    const shape = await catalog.getSchema("gpt-image-2-text-to-image");
    expect(shape.kind).toBe("task");
    expect(sleeps).toEqual([2000, 4000]);
  });

  test("falls back to an expired cached schema while rate-limited", async () => {
    let now = Date.parse("2026-10-01T00:00:00Z");
    const warm = catalogWith(
      { [schemaPath]: [fixture("schema_gpt-image-2-text-to-image.json")] },
      () => now,
    );
    await warm.catalog.getSchema("gpt-image-2-text-to-image");
    now += 25 * 60 * 60 * 1000;
    const cold = catalogWith({ [schemaPath]: [rateLimited] }, () => now);
    const shape = await cold.catalog.getSchema("gpt-image-2-text-to-image");
    expect(shape.stale).toBe(true);
    expect(cold.sleeps).toHaveLength(3);
  });

  test("throws when rate-limited with nothing cached", async () => {
    const { catalog } = catalogWith({ [schemaPath]: [rateLimited] });
    await expect(
      catalog.getSchema("gpt-image-2-text-to-image"),
    ).rejects.toThrow("code 429");
  });

  test("says so when kie.ai has no schema for a model", async () => {
    const { catalog } = catalogWith({
      "/models/new-model/schema": [
        {
          code: 200,
          msg: "success",
          data: { model: "new-model", openapi: null },
        },
      ],
    });
    await expect(catalog.getSchema("new-model")).rejects.toThrow(
      "no published schema",
    );
  });
});

describe("KieCatalog cache and fail-closed checks", () => {
  test("a cache entry dated in the future is not trusted", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(cacheDir, "schemas"), { recursive: true });
    writeFileSync(
      join(cacheDir, "schemas", "gpt-image-2-text-to-image.json"),
      JSON.stringify({
        model: "gpt-image-2-text-to-image",
        fetchedAt: "2099-01-01T00:00:00.000Z",
        kind: "task",
        path: "/api/v1/jobs/createTask",
        method: "POST",
      }),
    );
    const { catalog, calls } = catalogWith({
      "/models/gpt-image-2-text-to-image/schema": [
        fixture("schema_gpt-image-2-text-to-image.json"),
      ],
    });
    const check = await catalog.checkInput("gpt-image-2-text-to-image", {
      prompt: "x",
      resolution: "16K",
    });
    expect(calls).toEqual(["/models/gpt-image-2-text-to-image/schema"]);
    expect(check.ok).toBe(false);
  });

  test("a model whose schema has no input definition is refused, not waved through", async () => {
    const { catalog } = catalogWith({
      "/models/bare/schema": [
        {
          code: 200,
          msg: "success",
          data: {
            model: "bare",
            openapi: { paths: { "/api/v1/jobs/createTask": { post: {} } } },
          },
        },
      ],
    });
    const check = await catalog.checkInput("bare", { anything: "goes" });
    expect(check.ok).toBe(false);
    expect(check.errors[0]).toContain("no input definition");
  });

  test("model ids are trimmed before use", async () => {
    const { RunModelSchema } = await import("../types.js");
    expect(
      RunModelSchema.parse({ model: "  veo-3-1\n", input: {} }).model,
    ).toBe("veo-3-1");
  });
});

describe("KieCatalog checks, price, health and balance", () => {
  test("rejects run_model for a model outside the task API", async () => {
    const { catalog } = catalogWith({
      "/models/some-chat/schema": [
        {
          code: 200,
          msg: "success",
          data: {
            model: "some-chat",
            openapi: { paths: { "/api/v1/chat/completions": { post: {} } } },
          },
        },
      ],
    });
    const check = await catalog.checkInput("some-chat", { prompt: "hi" });
    expect(check.ok).toBe(false);
    expect(check.errors[0]).toContain("not a task model");
  });

  test("summarizes success rate buckets", async () => {
    const { catalog } = catalogWith({
      "/models/veo-3-1/success-rate": [
        {
          code: 200,
          msg: "success",
          data: {
            model: "veo-3-1",
            points: [
              { successRate: 50, isNormal: true },
              ...Array.from({ length: 5 }, () => ({ successRate: null })),
              { successRate: 100, isNormal: true },
              { successRate: 90, isNormal: false },
            ],
          },
        },
      ],
    });
    expect(await catalog.getSuccessRate("veo-3-1")).toEqual({
      model: "veo-3-1",
      lastHour: 95,
      last24h: 80,
      latestNormal: false,
      samples: 3,
    });
  });

  test("reads the balance and refuses a non-number", async () => {
    const ok = catalogWith({
      "/chat/credit": [{ code: 200, msg: "success", data: 1188.73 }],
    });
    expect(await ok.catalog.getBalance()).toBe(1188.73);
    const bad = catalogWith({
      "/chat/credit": [{ code: 200, msg: "success", data: "lots" }],
    });
    await expect(bad.catalog.getBalance()).rejects.toThrow("not a number");
  });

  test("surfaces an auth failure kie.ai reports in the body", async () => {
    const { catalog } = catalogWith({
      "/chat/credit": [
        { code: 401, msg: "You do not have access permissions" },
      ],
    });
    await expect(catalog.getBalance()).rejects.toThrow("code 401");
  });

  test("reads the price text", async () => {
    const { catalog } = catalogWith({
      "/models/veo-3-1/price": [fixture("price_veo-3-1.json")],
    });
    expect(await catalog.getPrice("veo-3-1")).toContain("720P");
  });
});

describe("run_model and plans", () => {
  let directory: string;
  let db: TaskDatabase;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "kie-run-model-"));
    db = new TaskDatabase(join(directory, "tasks.db"));
  });
  afterEach(async () => {
    await db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function context(routes: Record<string, Envelope[]>) {
    const fake = catalogWith(routes);
    const ctx: ToolContext = {
      db,
      client: fake.client,
      catalog: fake.catalog,
      approvalContext: "test",
      getCallbackUrl: (url) => url ?? "https://callback.example/complete",
      getTool,
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
    return { ctx, ...fake };
  }

  const routes = () => ({
    "/models": [fixture("models.json")],
    "/models/gpt-image-2-text-to-image/schema": [
      fixture("schema_gpt-image-2-text-to-image.json"),
    ],
  });

  function read(result: { content: Array<{ text: string }> }) {
    return JSON.parse(result.content[0].text);
  }

  test("does not call kie.ai when the input fails the schema", async () => {
    const { ctx, createMarketTask } = context(routes());
    const result = await runModelTool.run(
      { model: "gpt-image-2-text-to-image", input: { resolution: "8K" } },
      ctx,
    );
    expect(result.isError).toBe(true);
    expect(read(result).problems).toEqual([
      "prompt is required",
      'resolution must be one of "1K", "2K", "4K", got "8K"',
    ]);
    expect(createMarketTask).not.toHaveBeenCalled();
  });

  test("creates a task and records it for status polling", async () => {
    const saved = process.env.KIE_AI_CALLBACK_URL;
    delete process.env.KIE_AI_CALLBACK_URL;
    try {
      const { ctx, createMarketTask } = context(routes());
      const result = await runModelTool.run(
        {
          model: "gpt-image-2-text-to-image",
          input: { prompt: "a leaf", resolution: "1K" },
        },
        ctx,
      );
      expect(read(result)).toMatchObject({
        success: true,
        task_id: "task-123",
      });
      expect(createMarketTask).toHaveBeenCalledWith({
        model: "gpt-image-2-text-to-image",
        input: { prompt: "a leaf", resolution: "1K" },
      });
      expect((await db.getTask("task-123"))?.api_type).toBe(
        "market:gpt-image-2-text-to-image",
      );
    } finally {
      if (saved !== undefined) process.env.KIE_AI_CALLBACK_URL = saved;
    }
  });

  test("prepares a plan with the catalog's task type, price text and warnings", async () => {
    const { ctx, createMarketTask } = context(routes());
    const result = await prepareMediaGenerationTool.run(
      {
        items: [
          {
            tool: "run_model",
            args: {
              model: "gpt-image-2-text-to-image",
              input: { prompt: "a leaf", resolution: "1K", aspectRatio: "1:1" },
              allowExtraFields: true,
            },
          },
        ],
      },
      ctx,
    );
    const body = read(result);
    expect(body.status).toBe("prepared");
    const item = body.plan.items[0];
    expect(item).toMatchObject({
      tool: "run_model",
      model: "gpt-image-2-text-to-image",
      mode: "kie.ai lists: text to image",
    });
    expect(item.price.status).toBe("unknown");
    expect(item.price.note).toContain("6 credits");
    expect(item.warnings[0]).toContain("aspectRatio");
    expect(createMarketTask).not.toHaveBeenCalled();
  });

  test("refuses a misspelled field by default and names the known fields", async () => {
    const { ctx, createMarketTask } = context(routes());
    const result = await runModelTool.run(
      {
        model: "gpt-image-2-text-to-image",
        input: { prompt: "a leaf", resolutoin: "4K" },
      },
      ctx,
    );
    expect(result.isError).toBe(true);
    expect(read(result).problems[0]).toContain(
      "resolutoin is not a field this model accepts",
    );
    expect(read(result).problems[0]).toContain("resolution");
    expect(createMarketTask).not.toHaveBeenCalled();
  });

  test("counts outputs from the model's input", async () => {
    const { ctx } = context(routes());
    const result = await prepareMediaGenerationTool.run(
      {
        items: [
          {
            tool: "run_model",
            args: {
              model: "gpt-image-2-text-to-image",
              input: { prompt: "a leaf", n: 4 },
              allowExtraFields: true,
            },
          },
        ],
      },
      ctx,
    );
    expect(read(result).plan.items[0].outputCount).toBe(4);
  });

  test("makes no catalog calls when run_model is not enabled", async () => {
    const { ctx, calls } = context(routes());
    const disabled = {
      ...ctx,
      getTool: (name: string) =>
        name === "run_model" ? undefined : getTool(name),
    };
    const result = await prepareMediaGenerationTool.run(
      {
        items: [
          {
            tool: "run_model",
            args: {
              model: "gpt-image-2-text-to-image",
              input: { prompt: "x" },
            },
          },
        ],
      },
      disabled,
    );
    expect(read(result).error).toContain("run_model is not enabled");
    expect(calls).toEqual([]);
  });

  test("refuses to prepare a plan whose input fails the schema", async () => {
    const { ctx } = context(routes());
    const result = await prepareMediaGenerationTool.run(
      {
        items: [
          {
            tool: "run_model",
            args: { model: "gpt-image-2-text-to-image", input: {} },
          },
        ],
      },
      ctx,
    );
    expect(read(result)).toMatchObject({ success: false });
    expect(read(result).error).toContain("prompt is required");
    expect(await db.getAllTasks()).toEqual([]);
  });
});

describe("extractResultOutputs", () => {
  test("collects every file URL and Suno audio tracks without duplicates", () => {
    expect(
      extractResultOutputs({
        resultUrls: ["https://f.example/1.png", "https://f.example/2.png"],
        data: [
          { audio_url: "https://f.example/a.mp3" },
          { audio_url: "https://f.example/1.png" },
        ],
      }),
    ).toEqual({
      urls: [
        "https://f.example/1.png",
        "https://f.example/2.png",
        "https://f.example/a.mp3",
      ],
    });
  });

  test("passes a text result object through", () => {
    expect(extractResultOutputs({ resultObject: { lyricsData: [] } })).toEqual({
      urls: [],
      resultObject: { lyricsData: [] },
    });
  });

  test("tolerates empty results", () => {
    expect(extractResultOutputs(null)).toEqual({ urls: [] });
  });
});

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jest } from "@jest/globals";
import { TaskDatabase } from "../database.js";
import {
  type PreparedGenerationPlan,
  prepareGenerationPlan,
} from "../generation-plan.js";
import { estimateFromPriceText } from "../pricing/estimate.js";
import {
  checkCaps,
  DEFAULT_SPEND_POLICY,
  type SpendPolicy,
} from "../spend-policy.js";
import { approveMediaGenerationTool } from "../tools/approve_media_generation.js";
import { getTool } from "../tools/index.js";
import { nanoBananaImageTool } from "../tools/nano_banana_image.js";
import { prepareMediaGenerationTool } from "../tools/prepare_media_generation.js";
import { submitMediaGenerationTool } from "../tools/submit_media_generation.js";
import type { ToolContext, ToolDef } from "../tools/types.js";

// kie.ai's price text for all 218 catalog models, saved 2026-10-02.
const PRICES = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/__tests__/fixtures/catalog/price_texts.json"),
    "utf8",
  ),
).prices as Record<string, string | null>;

describe("estimateFromPriceText", () => {
  test.each([
    // [model, request, expected upper bound, live charge if measured]
    ["gpt-image-2-text-to-image", { resolution: "1K" }, 6, 6],
    ["gpt-image-2-text-to-image", { resolution: "4K" }, 16, undefined],
    ["nano-banana-2-lite", { resolution: "1K", outputCount: 2 }, 8, undefined],
    // 480p is 1.75/s silent and 3.5/s with audio: the bound takes audio.
    [
      "bytedance/seedance-1.5-pro",
      { resolution: "480p", durationSeconds: 4 },
      14,
      7,
    ],
    // Veo 3.1 lists Lite/Fast/Quality and the request can't pick one.
    ["veo-3-1", { resolution: "720p", durationSeconds: 8 }, 250, undefined],
    [
      "pixverse-v6/extend",
      { resolution: "720p", durationSeconds: 5 },
      48,
      undefined,
    ],
    // Found by review: full-width "／s", "per video second", one-second
    // sentences, duration tiers.
    [
      "wan/2-2-a14b-speech-to-video-turbo",
      { resolution: "720p", durationSeconds: 5 },
      120,
      120,
    ],
    [
      "wan/2-2-a14b-text-to-video-turbo",
      { resolution: "720p", durationSeconds: 5 },
      80,
      80,
    ],
    [
      "bytedance/v1-pro-text-to-video",
      { resolution: "720p", durationSeconds: 5 },
      30,
      30,
    ],
    ["runway", { resolution: "720p", durationSeconds: 10 }, 30, 30],
  ] as const)("%s %j is at most %d", (model, request, bound, live) => {
    const estimate = estimateFromPriceText(PRICES[model] ?? undefined, request);
    expect(estimate).toMatchObject({ status: "estimated", credits: bound });
    if (live !== undefined)
      expect(estimate.credits).toBeGreaterThanOrEqual(live);
  });

  test.each([
    ["elevenlabs/text-to-speech-multilingual-v2", {}],
    ["qwen/text-to-image", { resolution: "4K" }],
    ["topaz/image-upscale", { resolution: "8K" }],
    ["bytedance/seedance-2", { resolution: "480p", durationSeconds: 15 }],
    ["wan/3-0-video", { resolution: "1080p", durationSeconds: 10 }],
    ["happyhorse/video-edit", { resolution: "1080p", durationSeconds: 10 }],
    ["minimax-h3/text-to-video", { resolution: "2K", durationSeconds: 10 }],
    ["seedream/5-pro-image-to-image", { resolution: "1K" }],
  ] as const)(
    "%s %j is unknown: its price has a unit or formula an estimate can't bound",
    (model, request) => {
      expect(
        estimateFromPriceText(PRICES[model] ?? undefined, request).status,
      ).toBe("unknown");
    },
  );

  test("reads thousands separators", () => {
    expect(estimateFromPriceText("1,000 credits per video", {})).toMatchObject({
      status: "estimated",
      credits: 1000,
    });
  });

  test("a resolution-to-resolution price list takes its highest price", () => {
    expect(
      estimateFromPriceText(PRICES["grok-imagine/upscale"] ?? undefined, {
        resolution: "720p",
      }).credits,
    ).toBe(30);
  });

  test("a per-second price without a duration is unknown, not a guess", () => {
    expect(
      estimateFromPriceText(PRICES["topaz/video-upscale"] ?? "", {}).status,
    ).toBe("unknown");
  });

  test("token prices are unknown; free is zero", () => {
    expect(
      estimateFromPriceText(
        "Input 70 credits / 1M tokens, Output 840 credits / 1M tokens",
        {},
      ).status,
    ).toBe("unknown");
    expect(
      estimateFromPriceText("Generate Persona is free.", {}),
    ).toMatchObject({
      status: "estimated",
      credits: 0,
    });
  });

  test("every catalog price text gives a finite estimate or unknown, never an error", () => {
    for (const [model, text] of Object.entries(PRICES)) {
      for (const request of [
        {},
        { resolution: "720p", durationSeconds: 5 },
        { resolution: "1K" },
      ]) {
        const estimate = estimateFromPriceText(text ?? undefined, request);
        if (estimate.status === "estimated") {
          expect([
            model,
            Number.isFinite(estimate.credits) && (estimate.credits ?? -1) >= 0,
          ]).toEqual([model, true]);
        }
      }
    }
  });
});

function planOf(credits: Array<number | undefined>): PreparedGenerationPlan {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    defaultProfile: "safe",
    maxConcurrency: 1,
    items: credits.map((value, index) => ({
      index,
      tool: "run_model",
      model: "m",
      mode: "x",
      outputCount: 1,
      userSettings: {},
      appliedDefaults: {},
      effectiveSettings: {},
      price:
        value === undefined
          ? { status: "unknown" as const, rateCardVersion: "t" }
          : {
              status: "estimated" as const,
              credits: value,
              rateCardVersion: "t",
            },
    })),
    total: { status: "unknown" },
    requestHash: "h",
  };
}

describe("checkCaps", () => {
  const policy = DEFAULT_SPEND_POLICY;
  test("passes within both caps", () => {
    expect(checkCaps(planOf([6, 10]), policy, 0)).toMatchObject({
      ok: true,
      credits: 16,
    });
  });
  test("refuses over the per-plan cap", () => {
    expect(checkCaps(planOf([151]), policy, 0).problems[0]).toContain(
      "per-plan cap of 150",
    );
  });
  test("refuses past the daily cap", () => {
    expect(checkCaps(planOf([10]), policy, 595).problems[0]).toContain(
      "daily cap of 600",
    );
  });
  test("an unknown price needs a person's explicit acceptance, and never passes in auto mode", () => {
    expect(checkCaps(planOf([undefined]), policy, 0).ok).toBe(false);
    expect(
      checkCaps(planOf([undefined]), policy, 0, { acceptUnknownPrice: true })
        .ok,
    ).toBe(true);
    const auto: SpendPolicy = {
      ...policy,
      approval: "auto",
      autoApproveCredits: 1000,
    };
    expect(
      checkCaps(planOf([undefined]), auto, 0, { acceptUnknownPrice: true }).ok,
    ).toBe(false);
  });
});

let directory: string;
let db: TaskDatabase;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "kie-spend-"));
  db = new TaskDatabase(join(directory, "tasks.db"));
});
afterEach(async () => {
  await db.close();
  rmSync(directory, { recursive: true, force: true });
});

async function approved(plan: PreparedGenerationPlan, context = "test") {
  await db.createGenerationPlan(plan, context);
  await db.approveGenerationPlan(plan.id, plan.requestHash, context);
  return plan;
}

describe("spend ledger", () => {
  const budget = (estimates: Array<number | undefined>, maxPerDay = 600) => ({
    itemEstimates: estimates,
    maxPerDay,
    unknownPlaceholder: 150,
  });

  test("counts estimates, then real charges, and forgets spend older than 24 hours", async () => {
    const plan = await approved(planOf([100]));
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    expect(
      db.claimGenerationPlanWithinBudget(plan.id, plan.requestHash, "test", {
        ...budget([100]),
        nowIso: new Date().toISOString(),
      }).claimed,
    ).toBe(true);
    const day = new Date(Date.now() - 24 * 3600_000).toISOString();
    expect(db.spentSince(day, 150)).toBe(100);
    db.settlePlanSpend(plan.id, [{ index: 0, taskId: "t-1" }]);
    db.recordActualCredits("t-1", 30);
    expect(db.spentSince(day, 150)).toBe(30);
    // A plan claimed 25 hours ago no longer counts.
    const yesterday = await approved({
      ...planOf([200]),
      id: "00000000-0000-4000-8000-000000000009",
    });
    db.claimGenerationPlanWithinBudget(yesterday.id, "h", "test", {
      ...budget([200]),
      nowIso: old,
    });
    expect(db.spentSince(day, 150)).toBe(30);
    expect(db.spentSince(new Date(0).toISOString(), 150)).toBe(230);
  });

  test("an item without a task id keeps its reservation (a timeout can hide a real task)", async () => {
    const plan = await approved(planOf([50, 50]));
    db.claimGenerationPlanWithinBudget(
      plan.id,
      plan.requestHash,
      "test",
      budget([50, 50]),
    );
    db.settlePlanSpend(plan.id, [{ index: 0, taskId: "t-1" }, { index: 1 }]);
    expect(db.spentSince(new Date(0).toISOString(), 150)).toBe(100);
  });

  test("an unknown-price item counts as a whole plan until its real charge arrives", async () => {
    const plan = await approved(planOf([undefined]));
    db.claimGenerationPlanWithinBudget(
      plan.id,
      plan.requestHash,
      "test",
      budget([undefined]),
    );
    expect(db.spentSince(new Date(0).toISOString(), 150)).toBe(150);
  });

  test("a plan that would pass the daily cap is not claimed", async () => {
    const first = await approved(planOf([400]));
    const second = await approved({
      ...planOf([400]),
      id: "00000000-0000-4000-8000-000000000002",
    });
    expect(
      db.claimGenerationPlanWithinBudget(first.id, "h", "test", budget([400]))
        .claimed,
    ).toBe(true);
    const refused = db.claimGenerationPlanWithinBudget(
      second.id,
      "h",
      "test",
      budget([400]),
    );
    expect(refused.claimed).toBe(false);
    expect(refused.reason).toContain("daily cap");
    expect((await db.getGenerationPlan(second.id))?.status).toBe("approved");
  });

  test("plans racing from 8 processes for a 300-credit day: exactly 3 of 100 credits get through", async () => {
    const file = join(directory, "race.db");
    const seeded = new TaskDatabase(file);
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) {
      const plan = {
        ...planOf([100]),
        id: `00000000-0000-4000-8000-00000000010${i}`,
      };
      await seeded.createGenerationPlan(plan, "race");
      await seeded.approveGenerationPlan(plan.id, plan.requestHash, "race");
      ids.push(plan.id);
    }
    await seeded.close();
    const worker = join(directory, "claim.mjs");
    writeFileSync(
      worker,
      `import { TaskDatabase } from ${JSON.stringify(join(process.cwd(), "dist", "database.js"))};
       const db = new TaskDatabase(process.argv[2]);
       const r = db.claimGenerationPlanWithinBudget(process.argv[3], "h", "race", { itemEstimates: [100], maxPerDay: 300, unknownPlaceholder: 150 });
       console.log(r.claimed ? "claimed" : "refused"); await db.close();`,
    );
    const runner = join(directory, "race.mjs");
    writeFileSync(
      runner,
      `import { spawn } from "node:child_process";
       const ids = ${JSON.stringify(ids)};
       const out = await Promise.all(ids.map((id) => new Promise((resolve) => {
         const child = spawn(process.execPath, ["--no-warnings", ${JSON.stringify(worker)}, ${JSON.stringify(file)}, id]);
         let text = ""; child.stdout.on("data", (d) => { text += d; });
         child.stderr.on("data", (d) => { text += "ERR:" + d; });
         child.on("close", () => resolve(text.trim()));
       })));
       console.log(JSON.stringify(out));`,
    );
    const result = spawnSync(process.execPath, [runner], {
      encoding: "utf8",
      timeout: 60000,
    });
    const outcomes = JSON.parse(result.stdout.trim()) as string[];
    expect(outcomes.filter((o) => o === "claimed")).toHaveLength(3);
    expect(outcomes.filter((o) => o === "refused")).toHaveLength(5);
  });
});

function context(
  policy: SpendPolicy,
  extra: Partial<ToolContext> = {},
): ToolContext {
  return {
    db,
    client: {} as ToolContext["client"],
    approvalContext: "test",
    getCallbackUrl: (url) => url ?? "",
    getTool,
    spendPolicy: policy,
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
    ...extra,
  };
}

function read(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

// Nano Banana 2 Lite at 1K has an exact rate-card price: 4 credits.
const cheapItem = { tool: "nano_banana_image", args: { prompt: "a leaf" } };

describe("approval modes in prepare_media_generation", () => {
  test("auto mode approves a plan within its limit without asking", async () => {
    const policy: SpendPolicy = {
      ...DEFAULT_SPEND_POLICY,
      approval: "auto",
      autoApproveCredits: 10,
    };
    const ask = jest.fn<NonNullable<ToolContext["requestPlanApproval"]>>();
    const body = read(
      await prepareMediaGenerationTool.run(
        { items: [cheapItem] },
        context(policy, { requestPlanApproval: ask }),
      ),
    );
    expect(body).toMatchObject({ status: "approved", approved: true });
    expect(ask).not.toHaveBeenCalled();
  });

  test("auto mode asks a person when the plan is above its limit", async () => {
    const policy: SpendPolicy = {
      ...DEFAULT_SPEND_POLICY,
      approval: "auto",
      autoApproveCredits: 3,
    };
    const ask = jest.fn<NonNullable<ToolContext["requestPlanApproval"]>>(
      async () => ({
        approved: false,
        reason: "declined",
      }),
    );
    const body = read(
      await prepareMediaGenerationTool.run(
        { items: [cheapItem] },
        context(policy, { requestPlanApproval: ask }),
      ),
    );
    expect(ask).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({ status: "prepared", approved: false });
  });

  test("chat mode never shows a form and tells the agent to get the person's yes", async () => {
    const policy: SpendPolicy = { ...DEFAULT_SPEND_POLICY, approval: "chat" };
    const ask = jest.fn<NonNullable<ToolContext["requestPlanApproval"]>>();
    const body = read(
      await prepareMediaGenerationTool.run(
        { items: [cheapItem] },
        context(policy, { requestPlanApproval: ask }),
      ),
    );
    expect(ask).not.toHaveBeenCalled();
    expect(body.status).toBe("prepared");
    expect(body.next_step).toContain("approve_media_generation");
  });

  test("a plan over a cap is refused and never stored", async () => {
    const policy: SpendPolicy = {
      ...DEFAULT_SPEND_POLICY,
      maxCreditsPerPlan: 3,
    };
    const result = await prepareMediaGenerationTool.run(
      { items: [cheapItem] },
      context(policy),
    );
    const body = read(result);
    expect(result.isError).toBe(true);
    expect(body.status).toBe("blocked");
    expect(body.problems[0]).toContain("per-plan cap of 3");
    expect(await db.getGenerationPlan(body.plan.id)).toBeNull();
  });
});

describe("approve_media_generation (chat mode)", () => {
  async function prepared(policy: SpendPolicy) {
    return read(
      await prepareMediaGenerationTool.run(
        { items: [cheapItem] },
        context(policy),
      ),
    ).planId as string;
  }

  test("refuses in form mode", async () => {
    const planId = await prepared(DEFAULT_SPEND_POLICY);
    const body = read(
      await approveMediaGenerationTool.run(
        { planId },
        context(DEFAULT_SPEND_POLICY),
      ),
    );
    expect(body.error).toContain("form approval mode");
  });

  test("records the person's yes in chat mode, once", async () => {
    const chat: SpendPolicy = { ...DEFAULT_SPEND_POLICY, approval: "chat" };
    const planId = await prepared(chat);
    expect(
      read(await approveMediaGenerationTool.run({ planId }, context(chat))),
    ).toMatchObject({
      status: "approved",
    });
    expect(
      read(await approveMediaGenerationTool.run({ planId }, context(chat)))
        .success,
    ).toBe(false);
  });
});

describe("submit and the daily cap", () => {
  test("refuses before calling kie.ai when the day's budget is used up, and books what it spends", async () => {
    const run = jest.fn<ToolDef["run"]>().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, task_id: "paid-1" }),
        },
      ],
    });
    const tool: ToolDef = { ...nanoBananaImageTool, run };
    const tools = (name: string) =>
      name === "nano_banana_image" ? tool : undefined;
    const plan = prepareGenerationPlan(
      [cheapItem],
      new Map([["nano_banana_image", nanoBananaImageTool]]),
    );
    await approved(plan);

    const tight: SpendPolicy = { ...DEFAULT_SPEND_POLICY, maxCreditsPerDay: 3 };
    const refused = read(
      await submitMediaGenerationTool.run(
        { planId: plan.id },
        context(tight, { getTool: tools }),
      ),
    );
    expect(refused.error).toContain("Nothing was sent to kie.ai");
    expect(run).not.toHaveBeenCalled();

    const ok = read(
      await submitMediaGenerationTool.run(
        { planId: plan.id },
        context(DEFAULT_SPEND_POLICY, { getTool: tools }),
      ),
    );
    expect(ok.success).toBe(true);
    expect(db.spentSince(new Date(0).toISOString(), 150)).toBe(4);
  });
});

describe("review fixes", () => {
  test("the output count is the highest of all count fields, numbers or strings", async () => {
    const { runModelTool } = await import("../tools/run_model.js");
    const plan = prepareGenerationPlan(
      [
        {
          tool: "run_model",
          args: { model: "m", input: { max_images: 6, n: "1" } },
        },
      ],
      new Map([["run_model", runModelTool]]),
      { itemDetails: [{ priceNote: "5 credits per image" }] },
    );
    expect(plan.items[0].outputCount).toBe(6);
    expect(plan.items[0].price).toMatchObject({
      status: "estimated",
      credits: 30,
    });
  });

  test("a task id inside data (gemini_omni's shape) is found, so its spend is linked", async () => {
    const { extractTaskId } = await import(
      "../tools/submit_media_generation.js"
    );
    expect(extractTaskId({ success: true, data: { taskId: "omni-1" } })).toBe(
      "omni-1",
    );
    expect(extractTaskId({ task_id: "t" })).toBe("t");
    expect(extractTaskId({ response: { data: { taskId: "r" } } })).toBe("r");
    expect(extractTaskId({ success: false })).toBeUndefined();
  });

  test("a charge reported before the task ends doesn't replace the reservation", async () => {
    const { getTaskStatusTool } = await import("../tools/get_task_status.js");
    const plan = await approved(planOf([90]));
    db.claimGenerationPlanWithinBudget(plan.id, plan.requestHash, "test", {
      itemEstimates: [90],
      maxPerDay: 600,
      unknownPlaceholder: 150,
    });
    db.settlePlanSpend(plan.id, [{ index: 0, taskId: "running-1" }]);
    await db.createTask({
      task_id: "running-1",
      api_type: "market:m",
      status: "pending",
    });
    const client = {
      getTaskStatus: async () => ({
        code: 200,
        msg: "success",
        data: { taskId: "running-1", state: "generating", creditsConsumed: 0 },
      }),
    };
    await getTaskStatusTool.run(
      { task_id: "running-1" },
      context(DEFAULT_SPEND_POLICY, {
        client: client as unknown as ToolContext["client"],
      }),
    );
    expect(db.spentSince(new Date(0).toISOString(), 150)).toBe(90);
  });

  test("bad spend settings refuse paid steps instead of crashing", async () => {
    const { spendPolicyOrError, envSetting } = await import(
      "../spend-policy.js"
    );
    const saved = process.env.KIE_AI_MAX_CREDITS_PER_DAY;
    process.env.KIE_AI_MAX_CREDITS_PER_DAY = "abc";
    try {
      expect(spendPolicyOrError().error).toContain(
        "KIE_AI_MAX_CREDITS_PER_DAY",
      );
    } finally {
      if (saved === undefined) delete process.env.KIE_AI_MAX_CREDITS_PER_DAY;
      else process.env.KIE_AI_MAX_CREDITS_PER_DAY = saved;
    }
    process.env.KIE_TEST_PLACEHOLDER = "${user_config.approval_mode}";
    expect(envSetting("KIE_TEST_PLACEHOLDER")).toBeUndefined();
    delete process.env.KIE_TEST_PLACEHOLDER;

    const body = read(
      await prepareMediaGenerationTool.run(
        { items: [cheapItem] },
        context(DEFAULT_SPEND_POLICY, {
          spendPolicyError: "The spend settings are invalid",
        }),
      ),
    );
    expect(body.error).toContain("spend settings are invalid");
  });
});

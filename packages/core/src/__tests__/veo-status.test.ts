import { jest } from "@jest/globals";
import { prepareGenerationPlan } from "../generation-plan.js";
import { KieAiClient, normalizeSuccessFlag } from "../kie-ai-client.js";
import { veo3GenerateVideoTool } from "../tools/veo3_generate_video.js";

describe("successFlag responses (legacy Veo, Midjourney)", () => {
  test("a finished Veo task becomes state success with its result URLs", () => {
    const out = normalizeSuccessFlag({
      code: 200,
      msg: "success",
      data: {
        taskId: "v1",
        successFlag: 1,
        response: { resultUrls: ["https://f.example/v.mp4"] },
      },
    });
    expect(out.data.state).toBe("success");
    expect(JSON.parse(out.data.resultJson)).toEqual({
      resultUrls: ["https://f.example/v.mp4"],
    });
  });

  test("a running task is generating; flags 2 and 3 fail with the message", () => {
    expect(
      normalizeSuccessFlag({ code: 200, msg: "", data: { successFlag: 0 } })
        .data.state,
    ).toBe("generating");
    const failed = normalizeSuccessFlag({
      code: 200,
      msg: "",
      data: { successFlag: 3, errorMessage: "upstream" },
    });
    expect(failed.data).toMatchObject({ state: "fail", failMsg: "upstream" });
  });

  test("Midjourney's resultInfoJson list of {resultUrl} is read", () => {
    const out = normalizeSuccessFlag({
      code: 200,
      msg: "",
      data: {
        successFlag: 1,
        resultInfoJson: {
          resultUrls: [
            { resultUrl: "https://f.example/1.png" },
            { resultUrl: "https://f.example/2.png" },
          ],
        },
      },
    });
    expect(JSON.parse(out.data.resultJson).resultUrls).toEqual([
      "https://f.example/1.png",
      "https://f.example/2.png",
    ]);
  });

  test("unified responses with a state are left alone", () => {
    const unified = {
      code: 200,
      msg: "",
      data: { state: "success", successFlag: 1 },
    };
    expect(normalizeSuccessFlag(unified)).toBe(unified);
  });
});

describe("request bodies kie.ai actually reads", () => {
  function clientCapturing() {
    const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchMock = jest.fn(async (url: unknown, init: unknown) => {
      sent.push({
        url: String(url),
        body: JSON.parse(String((init as { body?: string }).body ?? "{}")),
      });
      return new Response(
        JSON.stringify({ code: 200, msg: "success", data: { taskId: "t" } }),
        {
          status: 200,
        },
      );
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new KieAiClient({
      apiKey: "test-key",
      baseUrl: "https://api.kie.ai/api/v1",
      timeout: 5000,
      callbackUrlFallback: "",
    });
    return { client, sent, restore: () => (globalThis.fetch = original) };
  }

  test("Veo sends aspect_ratio (the legacy endpoint ignores aspectRatio)", async () => {
    const { client, sent, restore } = clientCapturing();
    try {
      await client.generateVeo3Video({
        prompt: "a slow pan",
        model: "veo3_lite",
        aspectRatio: "9:16",
        resolution: "720p",
        duration: 4,
        enableFallback: false,
      } as never);
    } finally {
      restore();
    }
    expect(sent[0].url).toBe("https://api.kie.ai/api/v1/veo/generate");
    expect(sent[0].body).toMatchObject({
      model: "veo3_lite",
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: 4,
    });
    expect(sent[0].body).not.toHaveProperty("aspectRatio");
  });

  test("Runway Aleph goes to the unified task API, not a doubled /api/v1 path", async () => {
    const { client, sent, restore } = clientCapturing();
    try {
      await client.generateRunwayAlephVideo({
        prompt: "make it night",
        videoUrl: "https://f.example/in.mp4",
      } as never);
    } finally {
      restore();
    }
    expect(sent[0].url).toBe("https://api.kie.ai/api/v1/jobs/createTask");
    expect(sent[0].body).toMatchObject({
      model: "runway/gen4-aleph",
      input: { prompt: "make it night", video_url: "https://f.example/in.mp4" },
    });
  });
});

describe("Veo 3.1 Lite in plans", () => {
  test("the safe default is veo3_lite at 720p with the exact 30-credit price", () => {
    const plan = prepareGenerationPlan(
      [
        {
          tool: "veo3_generate_video",
          args: { prompt: "a slow pan over a beach" },
        },
      ],
      new Map([["veo3_generate_video", veo3GenerateVideoTool]]),
    );
    expect(plan.items[0].effectiveSettings).toMatchObject({
      model: "veo3_lite",
      resolution: "720p",
    });
    expect(plan.items[0].price).toMatchObject({ status: "exact", credits: 30 });
  });

  test("1080p is 35; a tier without a verified price stays unknown", () => {
    const tools = new Map([["veo3_generate_video", veo3GenerateVideoTool]]);
    const hd = prepareGenerationPlan(
      [
        {
          tool: "veo3_generate_video",
          args: { prompt: "x", resolution: "1080p" },
        },
      ],
      tools,
    );
    expect(hd.items[0].price).toMatchObject({ status: "exact", credits: 35 });
    const quality = prepareGenerationPlan(
      [{ tool: "veo3_generate_video", args: { prompt: "x", model: "veo3" } }],
      tools,
    );
    expect(quality.items[0].price.status).toBe("unknown");
  });
});

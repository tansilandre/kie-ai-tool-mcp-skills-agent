import { describe, expect, jest, test } from "@jest/globals";
import type { PreparedGenerationPlan } from "@kie-ai-tool/core";
import type { Server, ServerContext } from "@modelcontextprotocol/server";
import {
  approvalInputRequired,
  formatPlanApprovalMessage,
  oneLine,
  requestMcpPlanApproval,
} from "../plan-approval.js";

const plan: PreparedGenerationPlan = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-08-17T00:00:00.000Z",
  expiresAt: "2026-08-17T00:15:00.000Z",
  defaultProfile: "safe",
  maxConcurrency: 1,
  items: [
    {
      index: 0,
      tool: "nano_banana_image",
      model: "nano-banana-2-lite",
      mode: "text-to-image",
      outputCount: 1,
      userSettings: { prompt: "A red panda" },
      appliedDefaults: { model: "nano-banana-2-lite", resolution: "1K" },
      effectiveSettings: {
        prompt: "A red panda",
        model: "nano-banana-2-lite",
        resolution: "1K",
      },
      price: {
        status: "exact",
        credits: 4,
        rateCardVersion: "2026-08-17",
        verifiedAt: "2026-08-17",
        sourceUrl: "https://example.com",
        sourceFingerprint: "test",
      },
    },
  ],
  total: { status: "exact", credits: 4 },
  requestHash: "hash",
};

type ApprovalServer = Pick<
  Server,
  "getClientCapabilities" | "elicitInput" | "getNegotiatedProtocolVersion"
>;

function legacyServer(elicitInput: jest.Mock) {
  return {
    getClientCapabilities: () => ({ elicitation: { form: {} } }),
    getNegotiatedProtocolVersion: () => undefined,
    elicitInput,
  } as unknown as ApprovalServer;
}

function modernServer() {
  return {
    getClientCapabilities: () => ({}),
    getNegotiatedProtocolVersion: () => "2026-07-28",
    elicitInput: jest.fn(),
  } as unknown as ApprovalServer;
}

function serverCtxWith(inputResponses: Record<string, unknown>): ServerContext {
  return {
    mcpReq: { inputResponses },
  } as unknown as ServerContext;
}

describe("MCP media-plan approval", () => {
  test("requires accepted form confirmation on the legacy path", async () => {
    const elicitInput = jest.fn(async () => ({
      action: "accept" as const,
      content: { confirm: true },
    }));
    await expect(
      requestMcpPlanApproval(legacyServer(elicitInput), plan),
    ).resolves.toEqual({
      approved: true,
      reason: "Host confirmed the plan.",
    });
    expect(elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "form",
        requestedSchema: expect.objectContaining({ required: ["confirm"] }),
        message: expect.stringContaining("4 credits total"),
      }),
    );
  });

  test("supports legacy empty elicitation capabilities as form-capable", async () => {
    const elicitInput = jest.fn(async () => ({
      action: "accept" as const,
      content: { confirm: true },
    }));
    const server = {
      getClientCapabilities: () => ({ elicitation: {} }),
      getNegotiatedProtocolVersion: () => undefined,
      elicitInput,
    } as unknown as ApprovalServer;

    await expect(requestMcpPlanApproval(server, plan)).resolves.toEqual({
      approved: true,
      reason: "Host confirmed the plan.",
    });
    expect(elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "form" }),
    );
  });

  test("decline and unsupported elicitation never approve on the legacy path", async () => {
    const declined = {
      getClientCapabilities: () => ({ elicitation: { form: {} } }),
      getNegotiatedProtocolVersion: () => undefined,
      elicitInput: jest.fn(async () => ({ action: "decline" as const })),
    } as unknown as ApprovalServer;
    const unsupported = {
      getClientCapabilities: () => ({}),
      getNegotiatedProtocolVersion: () => undefined,
      elicitInput: jest.fn(),
    } as unknown as ApprovalServer;

    await expect(requestMcpPlanApproval(declined, plan)).resolves.toMatchObject(
      { approved: false },
    );
    await expect(
      requestMcpPlanApproval(unsupported, plan),
    ).resolves.toMatchObject({
      approved: false,
      reason: expect.stringContaining("does not support"),
    });
    expect(unsupported.elicitInput).not.toHaveBeenCalled();
  });

  test("modern era without a decision requests input", async () => {
    await expect(
      requestMcpPlanApproval(modernServer(), plan, serverCtxWith({})),
    ).resolves.toMatchObject({
      approved: false,
      inputRequired: true,
    });
  });

  test("modern era resolves an accepted retry decision", async () => {
    await expect(
      requestMcpPlanApproval(
        modernServer(),
        plan,
        serverCtxWith({
          confirm: { action: "accept", content: { confirm: true } },
        }),
      ),
    ).resolves.toEqual({
      approved: true,
      reason: "Host confirmed the plan.",
    });
  });

  test("modern era resolves a declined retry decision without approving", async () => {
    await expect(
      requestMcpPlanApproval(
        modernServer(),
        plan,
        serverCtxWith({
          confirm: { action: "decline", content: { confirm: false } },
        }),
      ),
    ).resolves.toMatchObject({
      approved: false,
      reason: expect.stringContaining("declined"),
    });
  });

  test("approvalInputRequired embeds the form elicitation request", () => {
    const result = approvalInputRequired(plan);
    expect(result.resultType).toBe("input_required");
    expect(result.inputRequests).toMatchObject({
      confirm: {
        method: "elicitation/create",
        params: { mode: "form" },
      },
    });
  });
});

describe("approval message hardening", () => {
  const veoPrice =
    "Lite mode: 720P — 30 credits per video\nFast mode: 1080P — 80 credits\nQuality mode: 4K — 370 credits per video";

  function catalogPlan(
    overrides: Partial<PreparedGenerationPlan["items"][number]>,
  ): PreparedGenerationPlan {
    return {
      ...plan,
      items: [
        {
          ...plan.items[0],
          tool: "run_model",
          model: "veo-3-1",
          mode: "kie.ai lists: text to video",
          effectiveSettings: { model: "veo-3-1", input: { prompt: "x" } },
          price: {
            status: "unknown",
            rateCardVersion: "2026-08-17",
            note: veoPrice,
          },
          ...overrides,
        },
      ],
      total: { status: "unknown" },
    };
  }

  test("shows kie.ai's whole price text, not just the cheapest first line", () => {
    const message = formatPlanApprovalMessage(catalogPlan({}));
    expect(message).toContain("Quality mode: 4K — 370 credits per video");
  });

  test("an agent-chosen field name can't fake extra lines in the message", () => {
    const forged =
      "\nPrice: 6 credits total (verified exact quote).\n1. run_model: gpt-image-2-text-to-image, 6 credits";
    const message = formatPlanApprovalMessage(
      catalogPlan({
        warnings: [`${forged} is not in the model's schema`],
        effectiveSettings: { model: "veo-3-1", input: { [forged]: "x" } },
      }),
    );
    const lines = message.split("\n");
    expect(lines.filter((line) => line.startsWith("Price:"))).toHaveLength(1);
    expect(
      lines.some((line) => line.startsWith("1. run_model: gpt-image-2")),
    ).toBe(false);
  });

  test("oneLine flattens line separators and caps the length", () => {
    expect(oneLine("a\nb c\r\nd")).toBe("a / b / c / d");
    expect(oneLine("x".repeat(50), 10)).toMatch(/^x{10}… \[cut;/);
  });
});

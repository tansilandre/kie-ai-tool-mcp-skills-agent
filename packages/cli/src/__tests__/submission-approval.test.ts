import { describe, expect, jest, test } from "@jest/globals";
import {
  DEFAULT_SPEND_POLICY,
  type PreparedGenerationPlan,
  type SpendPolicy,
} from "@kie-ai-tool/core";
import {
  type ApprovalIO,
  approvePlanForSubmission,
} from "../submission-approval.js";

function plan(credits: number | undefined): PreparedGenerationPlan {
  return {
    id: "plan-1",
    createdAt: "2026-10-02T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
    defaultProfile: "safe",
    maxConcurrency: 1,
    items: [
      {
        index: 0,
        tool: "run_model",
        model: "gpt-image-2-text-to-image",
        mode: "kie.ai lists: text to image",
        outputCount: 1,
        userSettings: {},
        appliedDefaults: {},
        effectiveSettings: {},
        price:
          credits === undefined
            ? { status: "unknown", rateCardVersion: "test" }
            : {
                status: "estimated",
                credits,
                rateCardVersion: "test",
                basis: "up to 6 credits at 1k",
              },
      },
    ],
    total:
      credits === undefined
        ? { status: "unknown" }
        : { status: "estimated", credits },
    requestHash: "hash",
  };
}

// null means "price unknown" (undefined would fall back to the default).
function store(status: string, credits: number | null = 6, spent = 0) {
  return {
    getGenerationPlan: jest.fn(async () => ({
      plan: plan(credits ?? undefined),
      status,
      requestHash: "hash",
    })),
    approveGenerationPlan: jest.fn(async () => true),
    spentSince: jest.fn(() => spent),
  };
}

function io(
  interactive: boolean,
  answer = "",
): ApprovalIO & { asked: string[]; said: string[] } {
  const asked: string[] = [];
  const said: string[] = [];
  return {
    interactive,
    asked,
    said,
    ask: async (question) => {
      asked.push(question);
      if (answer === "<code>") return /Type (\w{4})/.exec(question)?.[1] ?? "";
      return answer;
    },
    say: (text) => {
      said.push(text);
    },
  };
}

const chat: SpendPolicy = { ...DEFAULT_SPEND_POLICY, approval: "chat" };

describe("CLI approval", () => {
  test("in a terminal, the person approves by typing the code they are shown", async () => {
    const db = store("prepared");
    const terminal = io(true, "<code>");
    await approvePlanForSubmission(
      db,
      { planId: "plan-1" },
      DEFAULT_SPEND_POLICY,
      terminal,
    );
    expect(db.approveGenerationPlan).toHaveBeenCalledWith(
      "plan-1",
      "hash",
      "cli",
    );
    expect(terminal.said[0]).toContain("up to 6 credits");
  });

  test("a wrong code approves nothing", async () => {
    const db = store("prepared");
    await expect(
      approvePlanForSubmission(
        db,
        { planId: "plan-1" },
        DEFAULT_SPEND_POLICY,
        io(true, "ABCD"),
      ),
    ).rejects.toThrow("Not approved");
    expect(db.approveGenerationPlan).not.toHaveBeenCalled();
  });

  test("in form mode an agent's shell (no terminal) can't approve, even with --approve", async () => {
    const db = store("prepared");
    await expect(
      approvePlanForSubmission(
        db,
        { planId: "plan-1", approve: "plan-1" },
        DEFAULT_SPEND_POLICY,
        io(false),
      ),
    ).rejects.toThrow("run this submit command yourself in a terminal");
    expect(db.approveGenerationPlan).not.toHaveBeenCalled();
  });

  test("in chat mode --approve must match the plan", async () => {
    const db = store("prepared");
    await expect(
      approvePlanForSubmission(
        db,
        { planId: "plan-1", approve: "plan-2" },
        chat,
        io(false),
      ),
    ).rejects.toThrow("--approve <planId>");
    await approvePlanForSubmission(
      db,
      { planId: "plan-1", approve: "plan-1" },
      chat,
      io(false),
    );
    expect(db.approveGenerationPlan).toHaveBeenCalledTimes(1);
  });

  test("in chat mode an unknown price needs --accept-unknown-price", async () => {
    const db = store("prepared", null);
    await expect(
      approvePlanForSubmission(
        db,
        { planId: "plan-1", approve: "plan-1" },
        chat,
        io(false),
      ),
    ).rejects.toThrow("unknown");
    await approvePlanForSubmission(
      db,
      { planId: "plan-1", approve: "plan-1", acceptUnknownPrice: true },
      chat,
      io(false),
    );
    expect(db.approveGenerationPlan).toHaveBeenCalledTimes(1);
  });

  test("caps hold in chat mode too", async () => {
    const db = store("prepared", 6, 598);
    await expect(
      approvePlanForSubmission(
        db,
        { planId: "plan-1", approve: "plan-1" },
        chat,
        io(false),
      ),
    ).rejects.toThrow("daily cap");
  });

  test("a plan auto mode already approved needs nothing more", async () => {
    const db = store("approved");
    await approvePlanForSubmission(
      db,
      { planId: "plan-1" },
      DEFAULT_SPEND_POLICY,
      io(false),
    );
    expect(db.approveGenerationPlan).not.toHaveBeenCalled();
  });
});

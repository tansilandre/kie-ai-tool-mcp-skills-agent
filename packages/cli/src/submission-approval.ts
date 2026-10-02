import { randomInt } from "node:crypto";
import {
  checkCaps,
  type PreparedGenerationPlan,
  type SpendPolicy,
} from "@kie-ai-tool/core";
import type { TaskDatabase } from "@kie-ai-tool/core/database";

type PlanStore = Pick<
  TaskDatabase,
  "getGenerationPlan" | "approveGenerationPlan" | "spentSince"
>;

/** How the CLI reaches the person at the keyboard; injected for tests. */
export interface ApprovalIO {
  /** True only when both stdin and stdout are a terminal. */
  interactive: boolean;
  ask(question: string): Promise<string>;
  say(text: string): void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function approvalCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
}

function describe(
  plan: PreparedGenerationPlan,
  spent: number,
  policy: SpendPolicy,
): string {
  const lines = plan.items.map((item) => {
    const price =
      item.price.status === "exact"
        ? `${item.price.credits} credits`
        : item.price.status === "estimated"
          ? `up to ${item.price.credits} credits (${item.price.basis ?? "estimate"})`
          : "price UNKNOWN";
    return `  ${item.index + 1}. ${item.tool} ${item.model} · ${item.outputCount} output(s) · ${price}`;
  });
  const total =
    plan.total.status === "unknown"
      ? "UNKNOWN for at least one item"
      : `${plan.total.status === "exact" ? "" : "up to "}${plan.total.credits} credits`;
  return [
    `Plan ${plan.id}`,
    ...lines,
    `  Total: ${total}`,
    `  Spent in the last 24 hours: ${spent} of ${policy.maxCreditsPerDay} credits (cap per plan ${policy.maxCreditsPerPlan})`,
  ].join("\n");
}

async function approve(
  db: PlanStore,
  planId: string,
  requestHash: string,
): Promise<void> {
  if (!(await db.approveGenerationPlan(planId, requestHash, "cli"))) {
    throw new Error(
      "Plan could not be approved because it was not prepared, has expired, changed, or was already submitted.",
    );
  }
}

/**
 * Records the approval a CLI submit needs, according to the approval mode.
 *
 * - A plan already approved (auto mode, within its limit) needs nothing more.
 * - In a terminal, any mode: the person reads the plan and types a random
 *   code. An agent's shell has no terminal, so it can't answer.
 * - Without a terminal, only chat mode accepts `--approve <planId>`: the
 *   person who runs the CLI chose to let the agent relay their yes.
 */
export async function approvePlanForSubmission(
  db: PlanStore,
  args: {
    planId?: unknown;
    approve?: unknown;
    acceptUnknownPrice?: unknown;
  },
  policy: SpendPolicy,
  io: ApprovalIO,
): Promise<void> {
  if (typeof args.planId !== "string") {
    throw new Error("Submitting a media plan requires --planId <planId>.");
  }
  const stored = await db.getGenerationPlan(args.planId);
  if (!stored) {
    throw new Error(
      "No plan with that id. Prepare one with prepare_media_generation.",
    );
  }
  if (stored.status === "approved") return;
  if (stored.status !== "prepared") {
    throw new Error(
      "Plan could not be approved because it has expired, changed, or was already submitted.",
    );
  }
  const spent = db.spentSince(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    policy.maxCreditsPerPlan,
  );

  if (io.interactive) {
    io.say(describe(stored.plan, spent, policy));
    const unknown = stored.plan.total.status === "unknown";
    const caps = checkCaps(stored.plan, policy, spent, {
      acceptUnknownPrice: true,
    });
    if (!caps.ok) throw new Error(caps.problems.join(" "));
    const code = approvalCode();
    const answer = await io.ask(
      `${unknown ? "The price of at least one item is unknown. " : ""}Type ${code} to approve this plan and spend the credits, or anything else to cancel: `,
    );
    if (answer.trim().toUpperCase() !== code) {
      throw new Error("Not approved. Nothing was sent to kie.ai.");
    }
    await approve(db, args.planId, stored.requestHash);
    return;
  }

  if (policy.approval !== "chat") {
    throw new Error(
      policy.approval === "form"
        ? "In form approval mode a person approves in a terminal: run this submit command yourself in a terminal and type the code it shows. To let an agent relay your yes instead, the person who runs the CLI can set KIE_AI_APPROVAL=chat."
        : "This plan wasn't approved automatically (it is above KIE_AI_AUTO_APPROVE_CREDITS or its price is unknown). A person must approve it in a terminal, or with KIE_AI_APPROVAL=chat.",
    );
  }
  if (args.approve !== args.planId) {
    throw new Error(
      "In chat approval mode, pass --approve <planId> matching --planId, and only after the person said yes to this plan.",
    );
  }
  const caps = checkCaps(stored.plan, policy, spent, {
    acceptUnknownPrice: args.acceptUnknownPrice === true,
  });
  if (!caps.ok) throw new Error(caps.problems.join(" "));
  await approve(db, args.planId, stored.requestHash);
}

// Who may approve a paid plan, and the credit caps that hold in every mode.
//
// Read once from the environment of the process that runs the server or CLI,
// which only the human controls (an agent can't change it mid-session).
// Design: docs/design/spend-controls.md.

import type { PreparedGenerationPlan } from "./generation-plan.js";

export type ApprovalMode = "form" | "chat" | "auto";

export interface SpendPolicy {
  approval: ApprovalMode;
  /** No plan whose estimate exceeds this can be approved or submitted. */
  maxCreditsPerPlan: number;
  /** Spent in the last 24 hours plus this plan may not exceed this. */
  maxCreditsPerDay: number;
  /** Auto mode only: the largest plan approved without asking. */
  autoApproveCredits: number;
}

export const DEFAULT_SPEND_POLICY: SpendPolicy = {
  approval: "form",
  maxCreditsPerPlan: 150,
  maxCreditsPerDay: 600,
  autoApproveCredits: 0,
};

/**
 * An environment value, or undefined when it is empty or a placeholder a
 * host never filled in (a plugin setting left as "${user_config.x}").
 */
export function envSetting(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw || /^\$\{[^}]*\}$/.test(raw)) return undefined;
  return raw;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = envSetting(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${name} must be a number of credits, 0 or more (got "${raw}").`,
    );
  }
  return value;
}

/**
 * For servers: never throw at startup (a server that exits shows up only as
 * "failed to connect"). A bad setting becomes an error every paid step
 * reports, and nothing can be spent until it is fixed.
 */
export function spendPolicyOrError(): {
  policy?: SpendPolicy;
  error?: string;
} {
  try {
    return { policy: spendPolicyFromEnv() };
  } catch (error) {
    return {
      error: `The spend settings are invalid, so nothing can be spent until the person who runs the server fixes them: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function spendPolicyFromEnv(): SpendPolicy {
  const mode = (envSetting("KIE_AI_APPROVAL") ?? "").toLowerCase();
  if (mode && mode !== "form" && mode !== "chat" && mode !== "auto") {
    throw new Error(
      `KIE_AI_APPROVAL must be form, chat or auto (got "${process.env.KIE_AI_APPROVAL}").`,
    );
  }
  return {
    approval: (mode || DEFAULT_SPEND_POLICY.approval) as ApprovalMode,
    maxCreditsPerPlan: numberFromEnv(
      "KIE_AI_MAX_CREDITS_PER_PLAN",
      DEFAULT_SPEND_POLICY.maxCreditsPerPlan,
    ),
    maxCreditsPerDay: numberFromEnv(
      "KIE_AI_MAX_CREDITS_PER_DAY",
      DEFAULT_SPEND_POLICY.maxCreditsPerDay,
    ),
    autoApproveCredits: numberFromEnv(
      "KIE_AI_AUTO_APPROVE_CREDITS",
      DEFAULT_SPEND_POLICY.autoApproveCredits,
    ),
  };
}

/** The plan's total as an upper bound, or undefined when any item is unknown. */
export function planCredits(plan: PreparedGenerationPlan): number | undefined {
  let total = 0;
  for (const item of plan.items) {
    const credits =
      item.price.status === "exact" || item.price.status === "estimated"
        ? item.price.credits
        : undefined;
    if (typeof credits !== "number") return undefined;
    total += credits;
  }
  return Math.ceil(total * 100) / 100;
}

export interface CapCheck {
  ok: boolean;
  /** Plain reasons a human can act on; empty when ok. */
  problems: string[];
  credits?: number;
}

/**
 * Checks a plan against the caps. A plan with an unknown price passes only
 * when a human explicitly accepted that (`acceptUnknownPrice`), and never in
 * auto mode. `spentLast24h` comes from the spend ledger.
 */
export function checkCaps(
  plan: PreparedGenerationPlan,
  policy: SpendPolicy,
  spentLast24h: number,
  options: { acceptUnknownPrice?: boolean } = {},
): CapCheck {
  const credits = planCredits(plan);
  const problems: string[] = [];
  if (credits === undefined) {
    if (policy.approval === "auto" || !options.acceptUnknownPrice) {
      problems.push(
        "The price of at least one item is unknown, so the credit caps can't be checked. A person must approve it and accept the unknown price; auto approval never does.",
      );
    }
    if (spentLast24h >= policy.maxCreditsPerDay) {
      problems.push(
        `The daily cap is used up: ${spentLast24h} of ${policy.maxCreditsPerDay} credits in the last 24 hours (KIE_AI_MAX_CREDITS_PER_DAY).`,
      );
    }
    return { ok: problems.length === 0, problems };
  }
  if (credits > policy.maxCreditsPerPlan) {
    problems.push(
      `This plan may cost up to ${credits} credits, over the per-plan cap of ${policy.maxCreditsPerPlan} (KIE_AI_MAX_CREDITS_PER_PLAN). Split it, choose cheaper settings, or have the person who runs the server raise the cap.`,
    );
  }
  if (spentLast24h + credits > policy.maxCreditsPerDay) {
    problems.push(
      `This plan (up to ${credits} credits) plus ${spentLast24h} credits spent in the last 24 hours would pass the daily cap of ${policy.maxCreditsPerDay} (KIE_AI_MAX_CREDITS_PER_DAY).`,
    );
  }
  return { ok: problems.length === 0, problems, credits };
}

/** Whether auto mode may approve this plan without asking anyone. */
export function autoApproves(
  plan: PreparedGenerationPlan,
  policy: SpendPolicy,
): boolean {
  if (policy.approval !== "auto") return false;
  const credits = planCredits(plan);
  return credits !== undefined && credits <= policy.autoApproveCredits;
}

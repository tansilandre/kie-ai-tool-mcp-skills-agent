import { hashPlanPayload } from "../generation-plan.js";
import { DEFAULT_SPEND_POLICY, planCredits } from "../spend-policy.js";
import { SubmitMediaGenerationSchema } from "../types.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

interface SubmissionResult {
  index: number;
  tool: string;
  taskId?: string;
  result: unknown;
  error?: string;
}

function parseToolResult(result: ToolResult): unknown {
  const text = result.content[0]?.text ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractTaskId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const data = result as {
    task_id?: unknown;
    response?: { data?: { taskId?: unknown } };
  };
  if (typeof data.task_id === "string") return data.task_id;
  return typeof data.response?.data?.taskId === "string"
    ? data.response.data.taskId
    : undefined;
}

function resultError(
  envelope: ToolResult,
  result: unknown,
): string | undefined {
  if (envelope.isError) return "Target tool returned an error envelope.";
  if (!result || typeof result !== "object") return undefined;
  const payload = result as { success?: unknown; error?: unknown };
  if (payload.success !== false) return undefined;
  return typeof payload.error === "string"
    ? payload.error
    : "Target tool reported failure.";
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<SubmissionResult>,
): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await run(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export const submitMediaGenerationTool: ToolDef<
  typeof SubmitMediaGenerationSchema
> = {
  name: "submit_media_generation",
  description:
    "Submit a single unexpired, unchanged plan approved in this caller context exactly once. The persisted approval state is the authorization boundary; the plan hash detects accidental mutation only. The stored plan controls a maximum of four concurrent task creates.",
  category: "utility",
  schema: SubmitMediaGenerationSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { planId } = SubmitMediaGenerationSchema.parse(args);
      const stored = await ctx.db.getGenerationPlan(planId);
      if (!stored) throw new Error("Prepared plan not found.");
      const { plan } = stored;
      const computedHash = hashPlanPayload({
        createdAt: plan.createdAt,
        expiresAt: plan.expiresAt,
        defaultProfile: plan.defaultProfile,
        maxConcurrency: plan.maxConcurrency,
        items: plan.items,
        total: plan.total,
      });
      if (
        plan.id !== planId ||
        plan.requestHash !== stored.requestHash ||
        computedHash !== stored.requestHash
      ) {
        throw new Error("Prepared plan integrity check failed.");
      }
      if (new Date(plan.expiresAt).getTime() <= Date.now())
        throw new Error("Prepared plan has expired.");
      if (stored.status !== "approved") {
        throw new Error(
          "Plan is not approved, has already been submitted, or is being submitted.",
        );
      }
      const unavailableTools = [
        ...new Set(plan.items.map((item) => item.tool)),
      ].filter((name) => !ctx.getTool(name));
      if (unavailableTools.length > 0) {
        throw new Error(
          `Prepared plan contains unavailable tool(s): ${unavailableTools.join(", ")}.`,
        );
      }
      // The per-plan cap again (it may have been lowered since approval),
      // then the daily cap and the claim in one transaction, so two plans
      // can't both take the last of the day's budget.
      const policy = ctx.spendPolicy ?? DEFAULT_SPEND_POLICY;
      const credits = planCredits(plan);
      if (credits !== undefined && credits > policy.maxCreditsPerPlan) {
        throw new Error(
          `This plan may cost up to ${credits} credits, over the per-plan cap of ${policy.maxCreditsPerPlan} (KIE_AI_MAX_CREDITS_PER_PLAN). Nothing was sent to kie.ai.`,
        );
      }
      const claim = ctx.db.claimGenerationPlanWithinBudget(
        planId,
        stored.requestHash,
        ctx.approvalContext,
        {
          itemEstimates: plan.items.map((item) =>
            item.price.status === "exact" || item.price.status === "estimated"
              ? item.price.credits
              : undefined,
          ),
          maxPerDay: policy.maxCreditsPerDay,
          unknownPlaceholder: policy.maxCreditsPerPlan,
        },
      );
      if (!claim.claimed) {
        throw new Error(
          claim.reason
            ? `${claim.reason} Nothing was sent to kie.ai.`
            : "Approved plan is unavailable in this approval context, expired, changed, or already submitted.",
        );
      }
      const results = await withConcurrency(
        plan.items,
        plan.maxConcurrency,
        async (item) => {
          const target = ctx.getTool(item.tool);
          if (!target) {
            throw new Error(
              `Prepared plan contains unavailable tool: ${item.tool}.`,
            );
          }
          try {
            const envelope = await target.run(item.effectiveSettings, ctx);
            const result = parseToolResult(envelope);
            const error = resultError(envelope, result);
            return {
              index: item.index,
              tool: item.tool,
              taskId: extractTaskId(result),
              result,
              ...(error ? { error } : {}),
            };
          } catch (error) {
            return {
              index: item.index,
              tool: item.tool,
              result: null,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      );
      // From here on, paid tasks may exist. Never throw: an error envelope
      // loses the task IDs, and its generic "try again" advice invites the
      // agent to prepare and pay for the same work twice.
      const failed = results.some((result) => result.error);
      let recordWarning: string | undefined;
      try {
        ctx.db.settlePlanSpend(planId, results);
        if (failed) await ctx.db.failGenerationPlan(planId, results);
        else await ctx.db.finishGenerationPlan(planId, results);
      } catch (error) {
        recordWarning = `The tasks below were sent to kie.ai, but saving the outcome locally failed (${error instanceof Error ? error.message : String(error)}). Do not submit this work again; follow the task IDs below.`;
      }
      const created = results.filter((result) => result.taskId).length;
      const body = {
        success: !failed,
        planId,
        requestHash: stored.requestHash,
        results,
        ...(failed
          ? {
              error: "One or more plan items failed.",
              note:
                created > 0
                  ? `${created} task(s) were created and will be charged. Wait for them with wait_for_task; do not resubmit them. Only the failed items need a new plan.`
                  : "No task was created, so nothing was charged.",
            }
          : {}),
        ...(recordWarning ? { warning: recordWarning } : {}),
      };
      return {
        ...(failed ? { isError: true } : {}),
        content: [
          {
            type: "text",
            text: JSON.stringify(body, null, 2),
          },
        ],
        structuredContent: {
          plan_id: planId,
          request_hash: stored.requestHash,
          results,
        },
      };
    } catch (error) {
      return ctx.formatError("submit_media_generation", error, {
        planId:
          "Required: an unexpired, approved plan ID returned by prepare_media_generation",
      });
    }
  },
};

import {
  CATALOG_COUNT_FIELDS,
  type PlanItemDetails,
  prepareGenerationPlan,
} from "../generation-plan.js";
import { MISSING_API_KEY_MESSAGE } from "../kie-ai-client.js";
import {
  autoApproves,
  checkCaps,
  DEFAULT_SPEND_POLICY,
} from "../spend-policy.js";
import { PrepareMediaGenerationSchema, RunModelSchema } from "../types.js";
import { jsonResult, requireCatalog } from "./catalog-helpers.js";
import type {
  PlanApprovalDecision,
  ToolContext,
  ToolDef,
  ToolResult,
} from "./types.js";

function pendingResult(
  plan: ReturnType<typeof prepareGenerationPlan>,
  reason: string,
): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            planId: plan.id,
            plan,
            status: "prepared",
            approved: false,
            reason,
            message:
              "No provider task was created. This plan remains unapproved and cannot be submitted.",
          },
          null,
          2,
        ),
      },
    ],
    structuredContent: {
      plan_id: plan.id,
      status: "prepared",
      approved: false,
    },
  };
}

/**
 * Modern-protocol result: host input still required. The MCP adapter converts
 * this into an `input_required` multi-round-trip return. The plan travels in
 * `_meta` so the adapter can rebuild the approval form for the round trip.
 */
function approvalRequiredResult(
  plan: ReturnType<typeof prepareGenerationPlan>,
): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            planId: plan.id,
            status: "prepared",
            approved: false,
            input_required: true,
            message:
              "Host approval required. The MCP host will present the approval form.",
          },
          null,
          2,
        ),
      },
    ],
    structuredContent: {
      plan_id: plan.id,
      status: "prepared",
      approved: false,
      input_required: true,
    },
    _meta: { "kie/approval-plan": plan },
  };
}

async function recordApproval(
  plan: ReturnType<typeof prepareGenerationPlan>,
  ctx: ToolContext,
  _by: "form" | "auto",
): Promise<boolean> {
  return ctx.db.approveGenerationPlan(
    plan.id,
    plan.requestHash,
    ctx.approvalContext,
  );
}

function approvedResult(
  plan: ReturnType<typeof prepareGenerationPlan>,
  message: string,
): ToolResult {
  return jsonResult(
    {
      success: true,
      planId: plan.id,
      plan,
      status: "approved",
      approved: true,
      message: `${message} No provider task was created; submit this planId before it expires.`,
    },
    { plan_id: plan.id, status: "approved", approved: true },
  );
}

/** Chat mode: the agent shows the plan, and relays the person's yes. */
function chatApprovalResult(
  plan: ReturnType<typeof prepareGenerationPlan>,
  spent: number,
): ToolResult {
  const unknown = plan.total.status === "unknown";
  return jsonResult(
    {
      success: true,
      planId: plan.id,
      plan,
      status: "prepared",
      approved: false,
      spent_last_24h: spent,
      next_step: `Show the person every item of this plan with its price${unknown ? " (the price of at least one item is unknown: say so plainly)" : ""}, and ask a plain yes or no. Only after they say yes to this plan, call approve_media_generation with planId "${plan.id}"${unknown ? " and acceptUnknownPrice: true" : ""}, then submit_media_generation. Never approve on their behalf, and never reuse an earlier yes for a plan they haven't seen.`,
      message:
        "No provider task was created. The plan waits for the person's yes.",
    },
    { plan_id: plan.id, status: "prepared", approved: false },
  );
}

/**
 * The request facts kie.ai's price text depends on. Falls back to the
 * schema's default, and for duration to the longest allowed value, so the
 * estimate stays an upper bound when the request leaves them out.
 */
function priceInputsFor(
  input: Record<string, unknown>,
  fields: Record<
    string,
    { default?: unknown; enum?: unknown[]; maximum?: unknown }
  >,
): { resolution?: string; durationSeconds?: number } {
  const resolution = input.resolution ?? fields.resolution?.default;
  const durationKey = ["duration", "duration_seconds", "seconds"].find(
    (key) => key in input || key in fields,
  );
  let durationSeconds: number | undefined;
  if (durationKey) {
    const given = Number(input[durationKey]);
    if (Number.isFinite(given) && given > 0) durationSeconds = given;
    else {
      const field = fields[durationKey] ?? {};
      const options = (field.enum ?? [])
        .map(Number)
        .filter((n) => Number.isFinite(n));
      const max =
        options.length > 0
          ? Math.max(...options)
          : Number.isFinite(Number(field.maximum))
            ? Number(field.maximum)
            : Number(field.default);
      if (Number.isFinite(max) && max > 0) durationSeconds = max;
    }
  }
  return {
    ...(typeof resolution === "string" ? { resolution } : {}),
    ...(durationSeconds ? { durationSeconds } : {}),
  };
}

/**
 * run_model items are checked against the model's live schema before a plan
 * exists, so a bad input fails here instead of after approval. One at a time:
 * kie.ai rate-limits the schema endpoint.
 */
async function catalogDetails(
  items: Array<{ tool: string; args: Record<string, unknown> }>,
  ctx: ToolContext,
): Promise<Array<PlanItemDetails | undefined>> {
  const details: Array<PlanItemDetails | undefined> = [];
  for (const [index, item] of items.entries()) {
    if (item.tool !== "run_model") {
      details.push(undefined);
      continue;
    }
    if (!ctx.getTool("run_model")) {
      throw new Error("run_model is not enabled on this server.");
    }
    const catalog = requireCatalog(ctx);
    const { model, input, allowExtraFields } = RunModelSchema.parse(item.args);
    const check = await catalog.checkInput(model, input, { allowExtraFields });
    if (!check.ok) {
      const notes = check.warnings.length
        ? ` Also: ${check.warnings.join("; ")}.`
        : "";
      throw new Error(
        `Item ${index + 1} (${check.shape.model}) does not match the model's schema: ${check.errors.join("; ")}.${notes} Call get_model_schema for the accepted fields.`,
      );
    }
    const entry = await catalog.getModel(check.shape.model);
    const fields = (check.shape.inputSchema?.properties ?? {}) as Record<
      string,
      { default?: unknown; enum?: unknown[]; maximum?: unknown }
    >;
    details.push({
      priceInputs: priceInputsFor(input, fields),
      defaultOutputCount: Math.max(
        1,
        ...CATALOG_COUNT_FIELDS.map((key) =>
          Number(fields[key]?.default),
        ).filter((n) => Number.isFinite(n)),
      ),
      // kie.ai's listing says what the model offers, not what this request
      // does (Seedance 1.5 Pro is listed only as image-to-video but also does
      // text-to-video), so label it as the listing.
      mode: entry?.taskType?.length
        ? `kie.ai lists: ${entry.taskType.join(", ").toLowerCase()}`
        : undefined,
      priceNote: entry?.pricingDesc ?? undefined,
      warnings: check.warnings,
    });
  }
  return details;
}

export const prepareMediaGenerationTool: ToolDef<
  typeof PrepareMediaGenerationSchema
> = {
  name: "prepare_media_generation",
  description:
    "Prepare one to six validated media generations, resolve safe defaults and pricing, persist a caller-context-bound plan, then request host approval when the transport supports it without calling a provider.",
  category: "utility",
  schema: PrepareMediaGenerationSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const request = PrepareMediaGenerationSchema.parse(args);
      if (ctx.spendPolicyError) throw new Error(ctx.spendPolicyError);
      // Don't ask a human to approve a price for a plan that can't run.
      if (
        typeof ctx.client.hasApiKey === "function" &&
        !ctx.client.hasApiKey()
      ) {
        throw new Error(MISSING_API_KEY_MESSAGE);
      }
      const tools = new Map(
        request.items
          .map((item) => [item.tool, ctx.getTool(item.tool)])
          .filter(
            (entry): entry is [string, ToolDef] => entry[1] !== undefined,
          ),
      );
      const itemDetails = await catalogDetails(request.items, ctx);
      const plan = prepareGenerationPlan(request.items, tools, {
        defaultProfile: request.defaultProfile,
        maxConcurrency: request.maxConcurrency,
        expiresInSeconds: request.expiresInSeconds,
        itemDetails,
      });
      // Caps hold in every approval mode: a plan over them is not stored,
      // so it can never be approved or submitted.
      const policy = ctx.spendPolicy ?? DEFAULT_SPEND_POLICY;
      const spent = ctx.db.spentSince(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        policy.maxCreditsPerPlan,
      );
      const caps = checkCaps(plan, policy, spent, {
        // A person can still accept an unknown price when approving.
        acceptUnknownPrice: true,
      });
      if (!caps.ok) {
        return {
          ...jsonResult({
            success: false,
            status: "blocked",
            plan,
            problems: caps.problems,
            spent_last_24h: spent,
            message:
              "This plan is over a credit cap, so it was not saved and can't be approved. Nothing was sent to kie.ai.",
          }),
          isError: true,
        };
      }
      await ctx.db.createGenerationPlan(plan, ctx.approvalContext);

      if (autoApproves(plan, policy)) {
        return (await recordApproval(plan, ctx, "auto"))
          ? approvedResult(
              plan,
              "Approved automatically: the estimate is within KIE_AI_AUTO_APPROVE_CREDITS.",
            )
          : pendingResult(
              plan,
              "Approval could not be recorded because the plan expired, changed, or was no longer prepared.",
            );
      }
      if (policy.approval === "chat") {
        return chatApprovalResult(plan, spent);
      }
      if (!ctx.requestPlanApproval) {
        return pendingResult(
          plan,
          policy.approval === "auto"
            ? `This plan is above the auto-approval limit (${policy.autoApproveCredits} credits) or has an unknown price, and this app can't show an approval form, so a person can't approve it here. Choose cheaper settings, or ask the person who runs the server to change the approval mode.`
            : "This app can't show an approval form, so this plan can't be approved here. The person who runs the server can switch it to chat approval (KIE_AI_APPROVAL=chat), where the agent shows the plan and relays their yes.",
        );
      }

      let decision: PlanApprovalDecision;
      try {
        decision = await ctx.requestPlanApproval(plan);
      } catch (error) {
        return pendingResult(
          plan,
          `Approval elicitation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (decision.inputRequired) {
        return approvalRequiredResult(plan);
      }
      if (!decision.approved) {
        return pendingResult(plan, decision.reason);
      }

      if (!(await recordApproval(plan, ctx, "form"))) {
        return pendingResult(
          plan,
          "Approval could not be recorded because the plan expired, changed, or was no longer prepared.",
        );
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                planId: plan.id,
                plan,
                status: "approved",
                approved: true,
                message:
                  "No provider task was created. Host approval was recorded; submit this planId before it expires.",
              },
              null,
              2,
            ),
          },
        ],
        structuredContent: {
          plan_id: plan.id,
          status: "approved",
          approved: true,
        },
      };
    } catch (error) {
      return ctx.formatError("prepare_media_generation", error, {
        items:
          "Required: one to six objects with a registered generation tool and its args object",
        maxConcurrency: "Optional: concurrent task creates from 1 to 4",
        expiresInSeconds: "Optional: plan lifetime from 60 to 3600 seconds",
      });
    }
  },
};

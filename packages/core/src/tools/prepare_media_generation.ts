import {
  type PlanItemDetails,
  prepareGenerationPlan,
} from "../generation-plan.js";
import { PrepareMediaGenerationSchema, RunModelSchema } from "../types.js";
import { requireCatalog } from "./catalog-helpers.js";
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
    details.push({
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
      await ctx.db.createGenerationPlan(plan, ctx.approvalContext);
      if (!ctx.requestPlanApproval) {
        return pendingResult(
          plan,
          "This transport cannot request approval during preparation. Use its explicit approval boundary before submission.",
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

      if (
        !(await ctx.db.approveGenerationPlan(
          plan.id,
          plan.requestHash,
          ctx.approvalContext,
        ))
      ) {
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

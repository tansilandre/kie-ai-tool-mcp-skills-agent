import { checkCaps, DEFAULT_SPEND_POLICY } from "../spend-policy.js";
import { ApproveMediaGenerationSchema } from "../types.js";
import { jsonResult } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

export const approveMediaGenerationTool: ToolDef<
  typeof ApproveMediaGenerationSchema
> = {
  name: "approve_media_generation",
  description:
    "Chat approval mode only (KIE_AI_APPROVAL=chat): record the person's yes to a prepared plan after showing them every item and its price. Never call it without their explicit yes to this exact plan. Credit caps still apply. In form mode the app's approval form does this instead.",
  category: "utility",
  schema: ApproveMediaGenerationSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const request = ApproveMediaGenerationSchema.parse(args);
      const policy = ctx.spendPolicy ?? DEFAULT_SPEND_POLICY;
      if (policy.approval !== "chat") {
        throw new Error(
          policy.approval === "form"
            ? "This server is in form approval mode: the person approves in the app's form or in the CLI's terminal prompt, not through this tool."
            : "This server is in auto approval mode: plans within the limit are approved automatically, and others need a person in form or chat mode.",
        );
      }
      const stored = await ctx.db.getGenerationPlan(request.planId);
      if (!stored || stored.status !== "prepared") {
        throw new Error(
          "That plan doesn't exist, was already approved or submitted, or has expired. Prepare a new one.",
        );
      }
      const spent = ctx.db.spentSince(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        policy.maxCreditsPerPlan,
      );
      const caps = checkCaps(stored.plan, policy, spent, {
        acceptUnknownPrice: request.acceptUnknownPrice === true,
      });
      if (!caps.ok) {
        return {
          ...jsonResult({
            success: false,
            planId: request.planId,
            status: "prepared",
            approved: false,
            problems: caps.problems,
          }),
          isError: true,
        };
      }
      const approved = await ctx.db.approveGenerationPlan(
        request.planId,
        stored.requestHash,
        ctx.approvalContext,
      );
      if (!approved) {
        throw new Error(
          "Approval could not be recorded: the plan expired, changed, or belongs to another session.",
        );
      }
      return jsonResult(
        {
          success: true,
          planId: request.planId,
          status: "approved",
          approved: true,
          message:
            "Approval recorded. Submit this planId with submit_media_generation before it expires.",
        },
        { plan_id: request.planId, status: "approved", approved: true },
      );
    } catch (error) {
      return ctx.formatError("approve_media_generation", error, {
        planId: "Required: the planId the person said yes to",
        acceptUnknownPrice:
          "Optional: true only if the person was told the price is unknown",
      });
    }
  },
};

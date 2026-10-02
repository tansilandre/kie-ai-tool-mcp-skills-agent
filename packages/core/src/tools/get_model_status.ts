import { GetModelStatusSchema } from "../types.js";
import { jsonResult, requireCatalog } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

export const getModelStatusTool: ToolDef<typeof GetModelStatusSchema> = {
  name: "get_model_status",
  description:
    "Check a kie.ai model before using it: kie.ai's current price text and its success rate over the last hour and 24 hours. Free. A low or abnormal success rate means tasks are failing right now; pick another model or wait.",
  category: "utility",
  schema: GetModelStatusSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { model } = GetModelStatusSchema.parse(args);
      const catalog = requireCatalog(ctx);
      const price = await catalog.getPrice(model);
      const health = await catalog.getSuccessRate(model);
      const healthy =
        health.samples === 0
          ? "unknown"
          : health.latestNormal === false ||
              (health.lastHour !== undefined && health.lastHour < 80)
            ? "degraded"
            : "normal";
      return jsonResult(
        {
          success: true,
          model: health.model,
          price,
          success_rate: {
            last_hour_percent: health.lastHour,
            last_24h_percent: health.last24h,
            latest_bucket_normal: health.latestNormal,
            buckets_with_traffic: health.samples,
          },
          health: healthy,
          note:
            healthy === "unknown"
              ? "kie.ai has no recent traffic data for this model."
              : "Price text is kie.ai's own and can change; the plan shows it again before you approve.",
        },
        { model: health.model, health: healthy },
      );
    } catch (error) {
      return ctx.formatError("get_model_status", error, {
        model: "Required: exact model id from search_models",
      });
    }
  },
};

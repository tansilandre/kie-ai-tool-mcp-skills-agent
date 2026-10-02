import { SearchModelsSchema } from "../types.js";
import { jsonResult, requireCatalog, shortPrice } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

export const searchModelsTool: ToolDef<typeof SearchModelsSchema> = {
  name: "search_models",
  description:
    "Search kie.ai's live catalog of 200+ image, video, audio and chat models by words, task type or provider. Free. Returns each model's exact id, task types and kie.ai's price text. Use the id with get_model_schema and run_model.",
  category: "utility",
  schema: SearchModelsSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const request = SearchModelsSchema.parse(args);
      const { total, models } = await requireCatalog(ctx).search(request);
      return jsonResult(
        {
          success: true,
          total,
          returned: models.length,
          models: models.map((model) => ({
            model: model.model,
            title: model.title,
            provider: model.provider,
            taskType: model.taskType,
            price: shortPrice(model.pricingDesc),
          })),
          note:
            total === 0
              ? "No match. Try fewer words, or search by taskType or provider."
              : "Prices are kie.ai's own text. Read a model's fields with get_model_schema before calling run_model.",
        },
        { total, models: models.map((model) => model.model) },
      );
    } catch (error) {
      return ctx.formatError("search_models", error, {
        query: 'Optional: words to match, e.g. "veo" or "image edit"',
        taskType: 'Optional: e.g. "Text to Video"',
        provider: 'Optional: e.g. "Google"',
        limit: "Optional: 1-100, default 25",
      });
    }
  },
};

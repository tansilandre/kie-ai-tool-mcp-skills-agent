import { RunModelSchema } from "../types.js";
import { jsonResult, requireCatalog } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

export const runModelTool: ToolDef<typeof RunModelSchema> = {
  name: "run_model",
  description:
    "Run any kie.ai catalog model that uses the unified task API, with an input checked against the model's live schema first. Spends credits: use it through prepare_media_generation and submit_media_generation. Find models with search_models and their fields with get_model_schema.",
  category: "catalog",
  schema: RunModelSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const request = RunModelSchema.parse(args);
      const check = await requireCatalog(ctx).checkInput(
        request.model,
        request.input,
        { allowExtraFields: request.allowExtraFields },
      );
      if (!check.ok) {
        return {
          ...jsonResult({
            success: false,
            model: check.shape.model,
            error:
              "The input does not match the model's schema. Nothing was sent to kie.ai.",
            problems: check.errors,
            warnings: check.warnings,
            next_steps: [
              `Call get_model_schema with model "${check.shape.model}" to see the accepted fields.`,
            ],
          }),
          isError: true,
        };
      }

      const callBackUrl =
        request.callBackUrl ?? process.env.KIE_AI_CALLBACK_URL;
      const response = await ctx.client.createMarketTask({
        model: check.shape.model,
        input: request.input,
        ...(callBackUrl ? { callBackUrl } : {}),
      });
      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(
          `kie.ai refused the task (code ${response.code}): ${response.msg || "no message"}`,
        );
      }

      const taskId = response.data.taskId;
      await ctx.db.createTask({
        task_id: taskId,
        api_type: `market:${check.shape.model}`,
        status: "pending",
      });
      return jsonResult(
        {
          success: true,
          task_id: taskId,
          model: check.shape.model,
          message: "Task created on kie.ai.",
          ...(check.warnings.length > 0 ? { warnings: check.warnings } : {}),
          next_steps: [
            `Call wait_for_task with task_id "${taskId}" to get the result URLs.`,
            "kie.ai deletes generated files after 14 days; download what you keep.",
          ],
        },
        { task_id: taskId, model: check.shape.model },
      );
    } catch (error) {
      return ctx.formatError("run_model", error, {
        model: "Required: exact model id from search_models",
        input:
          "Required: the model's input object; see get_model_schema for its fields",
        callBackUrl: "Optional: webhook URL for task completion",
      });
    }
  },
};

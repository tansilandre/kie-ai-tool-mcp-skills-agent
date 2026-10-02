import { GetModelSchemaSchema } from "../types.js";
import { jsonResult, requireCatalog } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

function exampleValue(field: Record<string, unknown>): unknown {
  if (Array.isArray(field.examples) && field.examples.length > 0)
    return field.examples[0];
  if (field.default !== undefined) return field.default;
  if (Array.isArray(field.enum) && field.enum.length > 0) return field.enum[0];
  return `<${typeof field.type === "string" ? field.type : "value"}>`;
}

export const getModelSchemaTool: ToolDef<typeof GetModelSchemaSchema> = {
  name: "get_model_schema",
  description:
    "Read a kie.ai model's input fields from its live schema: names, types, which are required, allowed values and defaults, plus a minimal request example for run_model. Free; cached for 24 hours.",
  category: "utility",
  schema: GetModelSchemaSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      const request = GetModelSchemaSchema.parse(args);
      const { shape, fields, required, variants } = await requireCatalog(
        ctx,
      ).describeInput(request.model);
      const properties = (shape.inputSchema?.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      const example = Object.fromEntries(
        required
          .filter((name) => properties[name])
          .map((name) => [name, exampleValue(properties[name])]),
      );
      return jsonResult(
        {
          success: true,
          model: shape.model,
          endpoint: `${shape.method} ${shape.path}`,
          kind: shape.kind,
          runnable_with_run_model: shape.kind === "task",
          required,
          fields,
          ...(variants
            ? {
                variants,
                variants_note:
                  "The input must match exactly one variant. Don't mix fields from different variants.",
              }
            : {}),
          example:
            shape.kind === "task"
              ? { model: shape.model, input: example }
              : undefined,
          schema_fetched_at: shape.fetchedAt,
          ...(shape.stale
            ? {
                warning:
                  "kie.ai could not be reached; this is an expired cached schema.",
              }
            : {}),
          ...(request.raw ? { request_body_schema: shape.bodySchema } : {}),
        },
        { model: shape.model, kind: shape.kind, required },
      );
    } catch (error) {
      return ctx.formatError("get_model_schema", error, {
        model: "Required: exact model id from search_models",
        raw: "Optional: true to include the full request schema",
      });
    }
  },
};

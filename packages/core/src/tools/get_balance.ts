import { GetBalanceSchema } from "../types.js";
import { jsonResult, requireCatalog } from "./catalog-helpers.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

export const getBalanceTool: ToolDef<typeof GetBalanceSchema> = {
  name: "get_balance",
  description:
    "Show the kie.ai credits left on this API key. Free. 1 credit is about US$0.005.",
  category: "utility",
  schema: GetBalanceSchema,
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    try {
      GetBalanceSchema.parse(args ?? {});
      const credits = await requireCatalog(ctx).getBalance();
      return jsonResult({ success: true, credits }, { credits });
    } catch (error) {
      return ctx.formatError("get_balance", error, {});
    }
  },
};

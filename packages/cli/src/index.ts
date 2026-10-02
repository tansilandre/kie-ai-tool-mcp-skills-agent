#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import {
  createToolContext,
  DEFAULT_SPEND_POLICY,
  TOOL_REGISTRY,
  type ToolContext,
  type ToolDef,
  toInputJsonSchema,
} from "@kie-ai-tool/core";
// Standalone Kie.ai CLI. Every command and its flags are derived from
// @kie-ai-tool/core's TOOL_REGISTRY, so the CLI and the MCP server always
// expose the exact same tools. Run `kie-cli --help` to list them.
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  type ApprovalIO,
  approvePlanForSubmission,
} from "./submission-approval.js";

/** The person at the keyboard, if there is one. Agents' shells have no TTY. */
function terminalIO(): ApprovalIO {
  return {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    async ask(question) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stderr,
      });
      try {
        return await rl.question(question);
      } finally {
        rl.close();
      }
    },
    say(text) {
      process.stderr.write(`${text}\n`);
    },
  };
}

interface JsonProp {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: { type?: string };
}

/** A property that can't be a flat flag (nested object / array of objects) is taken as a JSON string. */
function isJsonProp(p: JsonProp): boolean {
  return (
    p.type === "object" || (p.type === "array" && p.items?.type === "object")
  );
}

function optionConfig(p: JsonProp, required: boolean) {
  const json = isJsonProp(p);
  const type = json
    ? "string"
    : p.type === "integer"
      ? "number"
      : p.type === "array"
        ? "array"
        : (p.type as "string" | "number" | "boolean" | undefined);

  const cfg: Record<string, unknown> = {
    describe: (p.description || "") + (json ? " (pass as JSON)" : ""),
    demandOption: required,
  };
  if (type) cfg.type = type;
  if (p.enum) cfg.choices = p.enum;
  if (p.default !== undefined && !json) cfg.default = p.default;
  return cfg;
}

async function runTool(
  tool: ToolDef,
  props: Record<string, JsonProp>,
  argv: Record<string, unknown>,
  ctx: ToolContext,
): Promise<void> {
  const args: Record<string, unknown> = {};
  for (const [key, p] of Object.entries(props)) {
    let value = argv[key];
    if (value === undefined) continue;
    if (isJsonProp(p) && typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        throw new Error(`Option --${key} must be valid JSON`);
      }
    }
    args[key] = value;
  }

  const result = await tool.run(args, ctx);
  const text = result.content?.[0]?.text ?? "";

  if (argv.json) {
    process.stdout.write(text + "\n");
  } else {
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(text);
    }
  }

  // Exit non-zero when the tool reported a failure.
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.success === false) process.exitCode = 1;
  } catch {
    /* leave exit code as-is */
  }
}

function build() {
  let cli = yargs(hideBin(process.argv))
    .scriptName("kie-cli")
    .usage(
      "$0 <tool> [options]\n\nGenerate images, video, music and speech via Kie.ai.",
    )
    .option("json", {
      type: "boolean",
      default: false,
      describe: "Output raw JSON (machine-readable)",
    })
    .demandCommand(
      1,
      "Specify a tool. Run `kie-cli --help` to list available tools.",
    )
    .recommendCommands()
    .strict()
    .wrap(Math.min(120, process.stdout.columns || 120))
    .help()
    .alias("h", "help")
    .version(false);

  for (const tool of TOOL_REGISTRY) {
    const js = toInputJsonSchema(tool.schema);
    const props = (js.properties as Record<string, JsonProp>) || {};
    const required = (js.required as string[]) || [];

    cli = cli.command(
      tool.name,
      `[${tool.category}] ${tool.description}`,
      (y) => {
        for (const [key, p] of Object.entries(props)) {
          y.option(key, optionConfig(p, required.includes(key)));
        }
        if (tool.name === "submit_media_generation") {
          y.option("approve", {
            type: "string",
            describe:
              "Chat approval mode only: the planId again, passed after the person said yes. In a terminal you type a code instead",
          });
          y.option("accept-unknown-price", {
            type: "boolean",
            describe:
              "Chat approval mode only: the person was told an item's price is unknown and still said yes",
          });
        }
        return y;
      },
      async (argv) => {
        // Every paid command goes through a plan (prepare, a person's
        // approval, submit) unless the person who runs the CLI opts out.
        if (
          tool.category !== "utility" &&
          process.env.KIE_AI_ALLOW_DIRECT_GENERATION !== "true"
        ) {
          process.stdout.write(
            `${JSON.stringify(
              {
                success: false,
                tool: tool.name,
                error: `${tool.name} spends credits, so it runs through a plan: prepare_media_generation --items '[{"tool":"${tool.name}","args":{...}}]', then submit_media_generation --planId <id> in a terminal, where you approve by typing the code it shows.`,
              },
              null,
              2,
            )}\n`,
          );
          process.exitCode = 1;
          return;
        }
        // The CLI's stable context keeps --approve usable across separate processes.
        const ctx = createToolContext("cli");
        if (tool.name === "submit_media_generation") {
          await approvePlanForSubmission(
            ctx.db,
            argv as unknown as {
              planId?: unknown;
              approve?: unknown;
              acceptUnknownPrice?: unknown;
            },
            ctx.spendPolicy ?? DEFAULT_SPEND_POLICY,
            terminalIO(),
          );
        }
        await runTool(tool, props, argv as Record<string, unknown>, ctx);
      },
    );
  }

  return cli;
}

build()
  .fail((msg, err, y) => {
    if (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    console.error(msg + "\n");
    y.showHelp();
    process.exit(1);
  })
  .parseAsync()
  .catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });

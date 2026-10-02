import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "@jest/globals";

// Runs the built CLI (CI builds before testing). The gate must answer before
// any context or network client is created, so a fake key is enough.
const CLI = join(process.cwd(), "dist", "index.js");
const scratch = mkdtempSync(join(tmpdir(), "kie-cli-gate-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: {
      PATH: process.env.PATH ?? "",
      KIE_AI_API_KEY: "test-key-not-real",
      KIE_AI_BASE_URL: "http://127.0.0.1:9/api/v1",
      KIE_AI_DB_PATH: join(scratch, "tasks.db"),
      KIE_AI_CACHE_DIR: join(scratch, "cache"),
      ...env,
    },
    encoding: "utf8",
    timeout: 20000,
  });
}

describe("CLI spend gate", () => {
  test("run_model refuses to spend without a plan", () => {
    expect(existsSync(CLI)).toBe(true);
    const result = run([
      "run_model",
      "--model",
      "gpt-image-2-text-to-image",
      "--input",
      '{"prompt":"a leaf"}',
      "--json",
    ]);
    expect(result.status).toBe(1);
    const body = JSON.parse(result.stdout);
    expect(body.success).toBe(false);
    expect(body.error).toContain("prepare_media_generation");
  });

  test("the hand-tuned model commands are gated the same way", () => {
    const result = run(["gpt_image_2", "--prompt", "a leaf", "--json"]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).error).toContain("runs through a plan");
  });

  test("run_model is not gated when the operator opts into direct generation", () => {
    const result = run(
      [
        "run_model",
        "--model",
        "gpt-image-2-text-to-image",
        "--input",
        '{"prompt":"a leaf"}',
        "--json",
      ],
      { KIE_AI_ALLOW_DIRECT_GENERATION: "true" },
    );
    // It gets past the gate and fails on the unreachable fake API instead.
    expect(result.stdout).not.toContain("runs through a plan");
  });
});

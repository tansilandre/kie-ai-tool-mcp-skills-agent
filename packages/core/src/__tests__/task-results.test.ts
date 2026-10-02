import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskDatabase } from "../database.js";
import { getTaskStatusTool } from "../tools/get_task_status.js";
import { getTool } from "../tools/index.js";
import type { ToolContext } from "../tools/types.js";
import { waitForTaskTool } from "../tools/wait_for_task.js";

// Shape of a real /jobs/recordInfo answer for gpt-image-2-text-to-image
// (live run 2026-10-02: 1K image, 6 credits, 62 s), with two outputs to
// check that none is dropped.
function recordInfo(state: string) {
  return {
    code: 200,
    msg: "success",
    data: {
      taskId: "task-1",
      model: "gpt-image-2-text-to-image",
      state,
      resultJson:
        state === "success"
          ? JSON.stringify({
              resultUrls: [
                "https://f.example/a.png",
                "https://f.example/b.png",
              ],
            })
          : "",
      creditsConsumed: state === "success" ? 6 : undefined,
      costTime: 62,
      failCode: null,
      failMsg: null,
    },
  };
}

let directory: string;
let db: TaskDatabase;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "kie-task-results-"));
  db = new TaskDatabase(join(directory, "tasks.db"));
});
afterEach(async () => {
  await db.close();
  rmSync(directory, { recursive: true, force: true });
});

function context(states: string[]): ToolContext {
  const queue = [...states];
  return {
    db,
    client: {
      getTaskStatus: async () =>
        recordInfo(queue.length > 1 ? (queue.shift() as string) : queue[0]),
    } as unknown as ToolContext["client"],
    approvalContext: "test",
    getCallbackUrl: (url) => url ?? "",
    getTool,
    formatError: (_tool, error) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, error: String(error) }),
        },
      ],
    }),
  };
}

function read(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe("unified-task results", () => {
  test("get_task_status speaks the same status words as its polling instructions", async () => {
    await db.createTask({
      task_id: "task-1",
      api_type: "gpt-image-2",
      status: "pending",
    });
    const running = read(
      await getTaskStatusTool.run(
        { task_id: "task-1" },
        context(["generating"]),
      ),
    );
    expect(running.status).toBe("processing");
    expect(running.provider_state).toBe("generating");

    const done = read(
      await getTaskStatusTool.run({ task_id: "task-1" }, context(["success"])),
    );
    expect(done.status).toBe("completed");
    expect(done.provider_state).toBe("success");
    expect(done.result_urls).toEqual([
      "https://f.example/a.png",
      "https://f.example/b.png",
    ]);
    expect(done.creditsConsumed).toBe(6);
  });

  test("wait_for_task reports every result URL and the credits kie.ai charged", async () => {
    await db.createTask({
      task_id: "task-1",
      api_type: "market:gpt-image-2-text-to-image",
      status: "pending",
    });
    const result = read(
      await waitForTaskTool.run(
        { task_id: "task-1", timeout_seconds: 10, interval_seconds: 1 },
        context(["queuing", "success"]),
      ),
    );
    expect(result).toMatchObject({
      success: true,
      status: "completed",
      result_urls: ["https://f.example/a.png", "https://f.example/b.png"],
      creditsConsumed: 6,
    });
  });
});

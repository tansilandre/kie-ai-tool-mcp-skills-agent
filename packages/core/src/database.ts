import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { PreparedGenerationPlan } from "./generation-plan.js";
import type { TaskRecord } from "./types.js";

// Node's built-in SQLite (node:sqlite, Node 22.13+) replaces the native
// `sqlite3` package, which needed a compiler or a prebuilt binary and often
// failed to install on Windows. The module still prints an
// ExperimentalWarning on some Node versions; silence just that one so a
// stdio MCP server or the CLI doesn't print noise on stderr.
const require = createRequire(import.meta.url);
function loadSqlite(): typeof import("node:sqlite") {
  const emit = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === "string" ? warning : warning.message;
    if (/SQLite is an experimental feature/i.test(text)) return;
    return (emit as (...args: unknown[]) => void).call(
      process,
      warning,
      ...rest,
    );
  }) as typeof process.emitWarning;
  try {
    return require("node:sqlite") as typeof import("node:sqlite");
  } catch (error) {
    throw new Error(
      `Could not load Node's built-in SQLite (node:sqlite), which kie-ai-tool needs for its task store. It requires Node.js 22.13 or newer without --no-experimental-sqlite; this is ${process.version}. ${String((error as { message?: unknown })?.message ?? "")}`.trim(),
    );
  } finally {
    process.emitWarning = emit;
  }
}

/** Adds a column that databases created by older versions lack. */
function addColumnIfMissing(
  db: DatabaseSync,
  table: "tasks" | "generation_plans",
  column: string,
  type: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (columns.some((existing) => existing.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (error) {
    // Another process opening the same old database may add it between our
    // check and our ALTER. Read the message rather than `instanceof Error`:
    // errors from node:sqlite can come from another realm (e.g. under Jest).
    const message = String((error as { message?: unknown })?.message ?? error);
    if (!/duplicate column name/i.test(message)) throw error;
  }
}

export class TaskDatabase {
  private db: DatabaseSync;
  private closed = false;

  constructor(dbPath?: string) {
    const actualDbPath = this.resolveDbPath(dbPath);
    const dir = dirname(actualDbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create database directory ${dir}:`, err);
      throw new Error(`Cannot create database directory: ${dir}`);
    }

    const { DatabaseSync } = loadSqlite();
    this.db = new DatabaseSync(actualDbPath);
    // The CLI and the MCP server may share one file; wait for a lock instead
    // of failing immediately.
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.initializeDatabase();
  }

  private resolveDbPath(dbPath?: string): string {
    // If custom path provided via KIE_AI_DB_PATH, use it
    if (dbPath) {
      return resolve(dbPath);
    }

    // Default: use home directory for reliability with npx
    return resolve(homedir(), ".kie-ai", "tasks.db");
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT UNIQUE NOT NULL,
        api_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result_url TEXT,
        error_message TEXT,
        credits_consumed REAL
      )
    `);
    // Databases created by older versions lack these columns.
    addColumnIfMissing(this.db, "tasks", "credits_consumed", "REAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS generation_plans (
        plan_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        approval_context TEXT NOT NULL,
        submitted_at TEXT,
        task_results_json TEXT
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_id ON tasks(task_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON tasks(status)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_generation_plans_status ON generation_plans(status)`,
    );
    addColumnIfMissing(this.db, "generation_plans", "approval_context", "TEXT");
    // What each submitted plan item may cost (its estimate) and what kie.ai
    // actually charged once known. The daily cap reads this.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spend_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        item_index INTEGER NOT NULL,
        task_id TEXT,
        estimated REAL,
        actual REAL,
        created_at TEXT NOT NULL
      )
    `);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_spend_ledger_created ON spend_ledger(created_at)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_spend_ledger_task ON spend_ledger(task_id)`,
    );
  }

  async createTask(
    taskData: Omit<TaskRecord, "id" | "created_at" | "updated_at">,
  ): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO tasks (task_id, api_type, status, result_url, error_message, credits_consumed)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        taskData.task_id,
        taskData.api_type,
        taskData.status,
        taskData.result_url || null,
        taskData.error_message || null,
        taskData.credits_consumed ?? null,
      );
  }

  async getTask(taskId: string): Promise<TaskRecord | null> {
    const row = this.db
      .prepare(`SELECT * FROM tasks WHERE task_id = ?`)
      .get(taskId);
    return (row as unknown as TaskRecord | undefined) ?? null;
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskRecord>,
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: Array<string | number> = [];

    if (updates.status) {
      updateFields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.result_url) {
      updateFields.push("result_url = ?");
      values.push(updates.result_url);
    }
    if (updates.error_message) {
      updateFields.push("error_message = ?");
      values.push(updates.error_message);
    }
    if (updates.credits_consumed !== undefined) {
      updateFields.push("credits_consumed = ?");
      values.push(updates.credits_consumed);
    }
    if (updateFields.length === 0) return;

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    this.db
      .prepare(`UPDATE tasks SET ${updateFields.join(", ")} WHERE task_id = ?`)
      .run(...values, taskId);
  }

  async getAllTasks(limit: number = 100): Promise<TaskRecord[]> {
    return this.db
      .prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as unknown as TaskRecord[];
  }

  async getTasksByStatus(
    status: string,
    limit: number = 50,
  ): Promise<TaskRecord[]> {
    return this.db
      .prepare(
        `SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(status, limit) as unknown as TaskRecord[];
  }

  async createGenerationPlan(
    plan: PreparedGenerationPlan,
    approvalContext: string,
  ): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO generation_plans (plan_id, status, created_at, expires_at, plan_json, request_hash, approval_context)
         VALUES (?, 'prepared', ?, ?, ?, ?, ?)`,
      )
      .run(
        plan.id,
        plan.createdAt,
        plan.expiresAt,
        JSON.stringify(plan),
        plan.requestHash,
        approvalContext,
      );
  }

  async getGenerationPlan(planId: string): Promise<{
    plan: PreparedGenerationPlan;
    status: string;
    requestHash: string;
    results?: unknown;
  } | null> {
    const row = this.db
      .prepare(
        `SELECT status, plan_json, request_hash, task_results_json FROM generation_plans WHERE plan_id = ?`,
      )
      .get(planId) as
      | {
          status: string;
          plan_json: string;
          request_hash: string;
          task_results_json: string | null;
        }
      | undefined;
    if (!row) return null;
    return {
      plan: JSON.parse(row.plan_json) as PreparedGenerationPlan,
      status: row.status,
      requestHash: row.request_hash,
      ...(row.task_results_json
        ? { results: JSON.parse(row.task_results_json) as unknown }
        : {}),
    };
  }

  /** Atomically records approval for an unchanged, unexpired prepared plan. */
  async approveGenerationPlan(
    planId: string,
    requestHash: string,
    approvalContext: string,
  ): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE generation_plans
         SET status = 'approved'
          WHERE plan_id = ? AND request_hash = ? AND approval_context = ? AND status = 'prepared' AND expires_at > ?`,
      )
      .run(planId, requestHash, approvalContext, new Date().toISOString());
    return Number(result.changes) === 1;
  }

  /** Atomically consumes an approved plan before any provider call can start. */
  async claimGenerationPlan(
    planId: string,
    requestHash: string,
    approvalContext: string,
  ): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE generation_plans
         SET status = 'submitting', submitted_at = CURRENT_TIMESTAMP
          WHERE plan_id = ? AND request_hash = ? AND approval_context = ? AND status = 'approved' AND expires_at > ?`,
      )
      .run(planId, requestHash, approvalContext, new Date().toISOString());
    return Number(result.changes) === 1;
  }

  /**
   * Credits spent since `sinceIso`: what kie.ai charged where known, else the
   * estimate, else `unknownPlaceholder` (an item approved with an unknown
   * price counts as a full plan until its real charge arrives).
   */
  spentSince(sinceIso: string, unknownPlaceholder: number): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(COALESCE(actual, estimated, ?)), 0) AS spent
         FROM spend_ledger WHERE created_at > ?`,
      )
      .get(unknownPlaceholder, sinceIso) as { spent: number };
    return Math.ceil(Number(row.spent) * 100) / 100;
  }

  /**
   * Claims an approved plan only if the daily budget still has room, and
   * reserves its estimate in the ledger, in one write transaction. Two plans
   * racing for the last of the budget (in one process or several) can't both
   * pass: BEGIN IMMEDIATE takes the write lock before the budget is read.
   */
  claimGenerationPlanWithinBudget(
    planId: string,
    requestHash: string,
    approvalContext: string,
    budget: {
      itemEstimates: Array<number | undefined>;
      maxPerDay: number;
      unknownPlaceholder: number;
      nowIso?: string;
    },
  ): { claimed: boolean; spentLast24h: number; reason?: string } {
    const now = budget.nowIso ?? new Date().toISOString();
    const since = new Date(Date.parse(now) - 24 * 60 * 60 * 1000).toISOString();
    const planCost = budget.itemEstimates.reduce<number>(
      (sum, value) => sum + (value ?? budget.unknownPlaceholder),
      0,
    );
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const spent = this.spentSince(since, budget.unknownPlaceholder);
      if (spent + planCost > budget.maxPerDay) {
        this.db.exec("ROLLBACK");
        return {
          claimed: false,
          spentLast24h: spent,
          reason: `The daily cap would be passed: ${spent} credits spent in the last 24 hours plus up to ${planCost} for this plan is over ${budget.maxPerDay} (KIE_AI_MAX_CREDITS_PER_DAY).`,
        };
      }
      const claim = this.db
        .prepare(
          `UPDATE generation_plans
           SET status = 'submitting', submitted_at = CURRENT_TIMESTAMP
            WHERE plan_id = ? AND request_hash = ? AND approval_context = ? AND status = 'approved' AND expires_at > ?`,
        )
        .run(planId, requestHash, approvalContext, now);
      if (Number(claim.changes) !== 1) {
        this.db.exec("ROLLBACK");
        return { claimed: false, spentLast24h: spent };
      }
      const reserve = this.db.prepare(
        `INSERT INTO spend_ledger (plan_id, item_index, estimated, created_at) VALUES (?, ?, ?, ?)`,
      );
      budget.itemEstimates.forEach((estimate, index) => {
        reserve.run(planId, index, estimate ?? null, now);
      });
      this.db.exec("COMMIT");
      return { claimed: true, spentLast24h: spent };
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // Already rolled back.
      }
      throw error;
    }
  }

  /**
   * After submission: link each reserved item to its task so the real charge
   * can replace the estimate later. Items without a task id keep their
   * reservation: a timeout can hide a task kie.ai did create, so releasing it
   * would let the daily cap undercount. It ages out after 24 hours.
   */
  settlePlanSpend(
    planId: string,
    results: Array<{ index: number; taskId?: string }>,
  ): void {
    const link = this.db.prepare(
      `UPDATE spend_ledger SET task_id = ? WHERE plan_id = ? AND item_index = ?`,
    );
    for (const result of results) {
      if (result.taskId) link.run(result.taskId, planId, result.index);
    }
  }

  /** Records what kie.ai actually charged for a task, when it reports it. */
  recordActualCredits(taskId: string, credits: number): void {
    this.db
      .prepare(`UPDATE spend_ledger SET actual = ? WHERE task_id = ?`)
      .run(credits, taskId);
  }

  async finishGenerationPlan(planId: string, results: unknown): Promise<void> {
    this.db
      .prepare(
        `UPDATE generation_plans SET status = 'submitted', task_results_json = ? WHERE plan_id = ? AND status = 'submitting'`,
      )
      .run(JSON.stringify(results), planId);
  }

  /** A claimed plan is terminal after any provider result to prevent duplicate paid creates. */
  async failGenerationPlan(planId: string, results: unknown): Promise<void> {
    this.db
      .prepare(
        `UPDATE generation_plans SET status = 'failed', task_results_json = ? WHERE plan_id = ? AND status = 'submitting'`,
      )
      .run(JSON.stringify(results), planId);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }
}

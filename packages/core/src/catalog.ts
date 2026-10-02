// Live kie.ai model catalog: search, per-model schema, price text, success
// rate and account balance, read from kie.ai's own API instead of a list
// maintained by hand.
//
// Endpoints (all GET, under https://api.kie.ai/api/v1, bearer auth, free):
//   /models                       catalog (filters: taskType, provider, q)
//   /models/{model}/schema        { model, openapi } for one model
//   /models/{model}/price         { model, pricingDesc }
//   /models/{model}/success-rate  { model, points[] } (24 h, 10-minute buckets)
//   /chat/credit                  remaining credits (data is a number)
//
// The schema endpoint answers `code: 429` after a few quick calls, so schemas
// are cached on disk and a 429 is retried with back-off, falling back to a
// stale cached copy when one exists.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type KieAiClient, KieAiRequestError } from "./kie-ai-client.js";
import {
  checkAgainstSchema,
  extractRequestShape,
  type FieldSummary,
  type ModelRequestShape,
  summarizeFields,
} from "./schema-check.js";
import type { KieAiResponse } from "./types.js";

export interface CatalogModel {
  model: string;
  slug?: string;
  title?: string;
  provider?: string;
  taskType?: string[];
  description?: string | null;
  pricingDesc?: string | null;
}

export interface ModelSchemaInfo extends ModelRequestShape {
  model: string;
  fetchedAt: string;
  /** True when kie.ai could not be reached and an expired cache entry was used. */
  stale?: boolean;
}

export interface InputCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
  shape: ModelSchemaInfo;
}

export interface SuccessRateSummary {
  model: string;
  /** Average success rate over buckets with traffic in the last hour, 0-100. */
  lastHour?: number;
  /** Average success rate over buckets with traffic in the last 24 hours, 0-100. */
  last24h?: number;
  /** Whether kie.ai flagged the most recent bucket with traffic as normal. */
  latestNormal?: boolean;
  samples: number;
}

export interface KieCatalogOptions {
  cacheDir?: string;
  /** How long the model list stays fresh in memory. Default 10 minutes. */
  listTtlMs?: number;
  /** How long a cached schema stays fresh. Default 24 hours. */
  schemaTtlMs?: number;
  /** Retries after a 429 before giving up. Default 3. */
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9._-]+)*$/;

/** Rejects anything that could change the request path. Slashes stay unencoded, as kie.ai requires. */
export function assertModelId(model: string): string {
  const trimmed = model.trim();
  if (
    !MODEL_ID.test(trimmed) ||
    trimmed.split("/").some((part) => part === "." || part === "..") ||
    trimmed.length > 200
  ) {
    throw new Error(
      `"${model}" is not a valid kie.ai model id. Use the exact "model" value from search_models.`,
    );
  }
  return trimmed;
}

export function defaultCacheDir(): string {
  return (
    process.env.KIE_AI_CACHE_DIR || join(homedir() || ".", ".kie-ai", "cache")
  );
}

function cacheFileName(model: string): string {
  return `${model.replace(/[^A-Za-z0-9._-]/g, "__")}.json`;
}

function isRateLimited(error: unknown, envelope?: KieAiResponse): boolean {
  if (envelope?.code === 429) return true;
  return error instanceof KieAiRequestError && error.status === 429;
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  );
}

export class KieCatalog {
  private readonly cacheDir: string;
  private readonly listTtlMs: number;
  private readonly schemaTtlMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private list?: { at: number; models: CatalogModel[] };
  private readonly schemas = new Map<string, ModelSchemaInfo>();

  constructor(
    private readonly client: KieAiClient,
    options: KieCatalogOptions = {},
  ) {
    this.cacheDir = options.cacheDir ?? defaultCacheDir();
    this.listTtlMs = options.listTtlMs ?? 10 * 60 * 1000;
    this.schemaTtlMs = options.schemaTtlMs ?? 24 * 60 * 60 * 1000;
    this.maxRetries = options.maxRetries ?? 3;
    this.now = options.now ?? Date.now;
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /** GETs an endpoint, retrying kie.ai's 429 with 2 s, 4 s, 8 s back-off. */
  private async get<T>(endpoint: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let envelope: KieAiResponse<T> | undefined;
      let failure: unknown;
      try {
        envelope = await this.client.getEnvelope<T>(endpoint);
      } catch (error) {
        failure = error;
      }
      if (isRateLimited(failure, envelope) && attempt < this.maxRetries) {
        await this.sleep(2000 * 2 ** attempt);
        continue;
      }
      if (failure) throw failure;
      if (envelope?.code !== 200) {
        throw new KieAiRequestError(
          `kie.ai ${endpoint} answered code ${envelope?.code}: ${envelope?.msg ?? "no message"}`,
          undefined,
          envelope?.code,
        );
      }
      return envelope.data as T;
    }
  }

  async listModels(): Promise<CatalogModel[]> {
    if (this.list && this.now() - this.list.at < this.listTtlMs) {
      return this.list.models;
    }
    const data = await this.get<{ models?: CatalogModel[] }>("/models");
    const models = Array.isArray(data?.models) ? data.models : [];
    this.list = { at: this.now(), models };
    return models;
  }

  /**
   * Filters the catalog locally so repeated searches cost one request. Every
   * word of `query` must appear somewhere in the model's id, title, provider,
   * task types or description.
   */
  async search(
    filter: {
      query?: string;
      taskType?: string;
      provider?: string;
      limit?: number;
    } = {},
  ): Promise<{ total: number; models: CatalogModel[] }> {
    const models = await this.listModels();
    const words = (filter.query ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const taskType = filter.taskType?.toLowerCase().replace(/[-_]/g, " ");
    const provider = filter.provider?.toLowerCase();
    const matches = models.filter((model) => {
      if (provider && model.provider?.toLowerCase() !== provider) return false;
      if (
        taskType &&
        !(model.taskType ?? []).some((t) => t.toLowerCase() === taskType)
      )
        return false;
      if (words.length === 0) return true;
      const haystack = [
        model.model,
        model.title,
        model.provider,
        ...(model.taskType ?? []),
        model.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    return {
      total: matches.length,
      models: matches.slice(0, filter.limit ?? 25),
    };
  }

  async getModel(model: string): Promise<CatalogModel | undefined> {
    const id = assertModelId(model);
    return (await this.listModels()).find((entry) => entry.model === id);
  }

  private async readCachedSchema(
    model: string,
  ): Promise<ModelSchemaInfo | undefined> {
    try {
      const raw = await readFile(
        join(this.cacheDir, "schemas", cacheFileName(model)),
        "utf8",
      );
      const parsed = JSON.parse(raw) as ModelSchemaInfo;
      return parsed.model === model ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private async writeCachedSchema(info: ModelSchemaInfo): Promise<void> {
    try {
      const dir = join(this.cacheDir, "schemas");
      await mkdir(dir, { recursive: true });
      const file = join(dir, cacheFileName(info.model));
      const temp = `${file}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(info));
      await rename(temp, file);
    } catch {
      // The cache is an optimisation; a read-only disk must not break a call.
    }
  }

  private isFresh(info: ModelSchemaInfo): boolean {
    return this.now() - Date.parse(info.fetchedAt) < this.schemaTtlMs;
  }

  /** The model's endpoint and input schema, from memory, disk or kie.ai. */
  async getSchema(model: string): Promise<ModelSchemaInfo> {
    const id = assertModelId(model);
    const inMemory = this.schemas.get(id);
    if (inMemory && this.isFresh(inMemory)) return inMemory;
    const onDisk = await this.readCachedSchema(id);
    if (onDisk && this.isFresh(onDisk)) {
      this.schemas.set(id, onDisk);
      return onDisk;
    }
    let data: { model?: string; openapi?: unknown };
    try {
      data = await this.get(`/models/${id}/schema`);
    } catch (error) {
      const stale = inMemory ?? onDisk;
      if (stale) return { ...stale, stale: true };
      throw error;
    }
    if (!data?.openapi) {
      throw new Error(
        `kie.ai has no published schema for "${id}" yet. Check the model page at https://kie.ai/market before calling it.`,
      );
    }
    const info: ModelSchemaInfo = {
      model: id,
      fetchedAt: new Date(this.now()).toISOString(),
      ...extractRequestShape(data.openapi),
    };
    this.schemas.set(id, info);
    await this.writeCachedSchema(info);
    return info;
  }

  async describeInput(model: string): Promise<{
    shape: ModelSchemaInfo;
    fields: FieldSummary[];
    required: string[];
    variants?: FieldSummary[][];
  }> {
    const shape = await this.getSchema(model);
    const input = shape.inputSchema;
    const variants = Array.isArray(input?.oneOf)
      ? (input.oneOf as Record<string, unknown>[]).map((variant) =>
          summarizeFields(variant),
        )
      : undefined;
    return {
      shape,
      fields: summarizeFields(input),
      required: Array.isArray(input?.required)
        ? (input.required as string[])
        : [],
      ...(variants ? { variants } : {}),
    };
  }

  /** Checks a task input against the model's live schema without spending anything. */
  async checkInput(
    model: string,
    input: Record<string, unknown>,
  ): Promise<InputCheck> {
    const shape = await this.getSchema(model);
    if (shape.kind !== "task") {
      return {
        ok: false,
        errors: [
          `"${shape.model}" is not a task model: kie.ai serves it at ${shape.method} ${shape.path}. run_model only supports models on /api/v1/jobs/createTask.`,
        ],
        warnings: [],
        shape,
      };
    }
    if (!shape.inputSchema) {
      return {
        ok: true,
        errors: [],
        warnings: [
          "kie.ai's schema for this model has no input definition, so the input could not be checked.",
        ],
        shape,
      };
    }
    const result = checkAgainstSchema(input, shape.inputSchema);
    return {
      ok: result.errors.length === 0,
      errors: result.errors,
      warnings: [
        ...(shape.stale
          ? [
              "kie.ai could not be reached; checked against an expired cached schema.",
            ]
          : []),
        ...result.warnings,
      ],
      shape,
    };
  }

  async getPrice(model: string): Promise<string | undefined> {
    const id = assertModelId(model);
    const data = await this.get<{ pricingDesc?: string | null }>(
      `/models/${id}/price`,
    );
    return data?.pricingDesc ?? undefined;
  }

  async getSuccessRate(model: string): Promise<SuccessRateSummary> {
    const id = assertModelId(model);
    const data = await this.get<{
      points?: Array<{
        successRate: number | null;
        isNormal?: boolean;
      }>;
    }>(`/models/${id}/success-rate`);
    const points = Array.isArray(data?.points) ? data.points : [];
    const withTraffic = points.filter(
      (point) => typeof point.successRate === "number",
    );
    const rates = withTraffic.map((point) => point.successRate as number);
    const latest = withTraffic[withTraffic.length - 1];
    return {
      model: id,
      lastHour: average(
        points
          .slice(-6)
          .filter((point) => typeof point.successRate === "number")
          .map((point) => point.successRate as number),
      ),
      last24h: average(rates),
      ...(latest && typeof latest.isNormal === "boolean"
        ? { latestNormal: latest.isNormal }
        : {}),
      samples: withTraffic.length,
    };
  }

  /** Remaining credits on the account behind the API key. */
  async getBalance(): Promise<number> {
    const data = await this.get<number>("/chat/credit");
    if (typeof data !== "number") {
      throw new Error("kie.ai returned a credit balance that is not a number.");
    }
    return data;
  }
}

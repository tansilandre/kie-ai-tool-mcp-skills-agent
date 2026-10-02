// Minimal JSON Schema support for kie.ai's live model schemas.
//
// kie.ai serves each catalog model's request as an inline OpenAPI 3.1 document
// (`GET /api/v1/models/{model}/schema`). Its `$ref`s are not pre-inlined, their
// component keys are percent-encoded and may end in a space, and many models
// only list `prompt` as required. This module resolves those references, finds
// the `input` object a task model expects, and checks a caller's input against
// it before any credits are spent. It deliberately covers the keywords kie.ai
// uses rather than all of JSON Schema.

export type JsonSchema = Record<string, unknown>;

const MAX_DEPTH = 40;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolves a local JSON pointer such as
 * `#/components/schemas/response%20not%20with%20recordId`. Each segment is
 * percent-decoded and then JSON-pointer unescaped; keys are matched exactly,
 * including trailing spaces, because kie.ai uses keys like `Error `.
 */
export function resolvePointer(doc: unknown, ref: string): unknown {
  if (!ref.startsWith("#")) {
    throw new Error(`Only local $ref values are supported: ${ref}`);
  }
  const path = ref.slice(1);
  if (path === "" || path === "/") return doc;
  let current: unknown = doc;
  for (const raw of path.replace(/^\//, "").split("/")) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      segment = raw;
    }
    segment = segment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isObject(current) && !Array.isArray(current)) {
      throw new Error(`Unresolvable $ref: ${ref}`);
    }
    if (!(segment in (current as Record<string, unknown>))) {
      throw new Error(`Unresolvable $ref: ${ref}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Returns a copy of `schema` with every local `$ref` replaced by its target. */
export function dereference(schema: unknown, doc: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return {};
  if (Array.isArray(schema)) {
    return schema.map((item) => dereference(item, doc, depth + 1));
  }
  if (!isObject(schema)) return schema;
  if (typeof schema.$ref === "string") {
    const { $ref, ...rest } = schema;
    const target = dereference(resolvePointer(doc, $ref), doc, depth + 1);
    return isObject(target) ? { ...target, ...rest } : target;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    out[key] = dereference(value, doc, depth + 1);
  }
  return out;
}

export interface ModelRequestShape {
  /** "task" models are submitted to /api/v1/jobs/createTask and polled. */
  kind: "task" | "sync";
  path: string;
  method: string;
  /** Dereferenced request body schema. */
  bodySchema?: JsonSchema;
  /** Dereferenced schema of the body's `input` object, for task models. */
  inputSchema?: JsonSchema;
}

const TASK_PATH = "/api/v1/jobs/createTask";

/** Finds the endpoint and request schemas in a model's OpenAPI document. */
export function extractRequestShape(openapi: unknown): ModelRequestShape {
  if (!isObject(openapi) || !isObject(openapi.paths)) {
    throw new Error("The model schema has no paths.");
  }
  const paths = openapi.paths as Record<string, unknown>;
  const pathKey = TASK_PATH in paths ? TASK_PATH : Object.keys(paths)[0];
  if (!pathKey) throw new Error("The model schema has no paths.");
  const pathItem = paths[pathKey];
  if (!isObject(pathItem)) throw new Error("The model schema path is empty.");
  const method =
    ["post", "get", "put"].find((m) => isObject(pathItem[m])) ?? "post";
  const operation = pathItem[method] as Record<string, unknown> | undefined;
  const content = isObject(operation?.requestBody)
    ? (operation.requestBody as Record<string, unknown>).content
    : undefined;
  const json = isObject(content) ? content["application/json"] : undefined;
  const rawBody = isObject(json) ? json.schema : undefined;
  const bodySchema = rawBody
    ? (dereference(rawBody, openapi) as JsonSchema)
    : undefined;
  const props = isObject(bodySchema?.properties)
    ? (bodySchema.properties as Record<string, unknown>)
    : undefined;
  const inputSchema = isObject(props?.input)
    ? (props.input as JsonSchema)
    : undefined;
  return {
    kind: pathKey === TASK_PATH ? "task" : "sync",
    path: pathKey,
    method: method.toUpperCase(),
    bodySchema,
    inputSchema,
  };
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

function label(path: string): string {
  return path || "input";
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export interface SchemaCheckResult {
  errors: string[];
  warnings: string[];
}

export interface SchemaCheckOptions {
  /**
   * Treat a field the schema doesn't list as an error instead of a warning.
   * A misspelled field (`resolutoin`) is otherwise sent to kie.ai, which
   * ignores it and bills for its default.
   */
  strictFields?: boolean;
}

// Line breaks and other control characters in a field name could fake extra
// lines in an approval message.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point
const CONTROL_CHARS = /[\u0000-\u001f\u007f\u2028\u2029]/;

function childPath(path: string, key: string): string {
  const part = /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
  return path ? `${path}.${part}` : part;
}

function ownKeys(record: unknown): string[] {
  return isObject(record) ? Object.keys(record) : [];
}

function hasOwnKey(record: unknown, key: string): boolean {
  return isObject(record) && Object.hasOwn(record, key);
}

/** Checks `value` against a dereferenced schema. Unknown keywords are ignored. */
export function checkAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = "",
  depth = 0,
  options: SchemaCheckOptions = {},
): SchemaCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (depth > MAX_DEPTH) return { errors, warnings };
  const where = label(path);

  for (const keyword of ["oneOf", "anyOf"] as const) {
    const variants = schema[keyword];
    if (Array.isArray(variants) && variants.length > 0) {
      const provided = isObject(value) ? Object.keys(value) : [];
      const results = variants.filter(isObject).map((variant) => ({
        ...checkAgainstSchema(value, variant, path, depth + 1, options),
        // How many of the caller's fields this variant knows: the best hint
        // of which shape the caller meant.
        overlap: provided.filter((key) => hasOwnKey(variant.properties, key))
          .length,
      }));
      if (!results.some((result) => result.errors.length === 0)) {
        const closest = results.reduce((best, result) =>
          result.overlap > best.overlap ||
          (result.overlap === best.overlap &&
            result.errors.length < best.errors.length)
            ? result
            : best,
        );
        errors.push(
          `${where} must match one of ${variants.length} allowed shapes; the closest one reports: ${closest.errors.join("; ")}`,
        );
        return { errors, warnings };
      }
    }
  }
  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf.filter(isObject)) {
      const result = checkAgainstSchema(value, part, path, depth + 1, options);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
  }

  if (value === undefined) return { errors, warnings };

  const declared = schema.type;
  const types = Array.isArray(declared)
    ? declared.filter((t): t is string => typeof t === "string")
    : typeof declared === "string"
      ? [declared]
      : [];
  if (schema.nullable === true) types.push("null");
  if (types.length > 0 && !types.some((t) => matchesType(value, t))) {
    errors.push(
      `${where} must be ${types.join(" or ")}, got ${typeOf(value)}${typeof value === "string" ? ` ${JSON.stringify(value.slice(0, 80))}` : ""}`,
    );
    return { errors, warnings };
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(
      `${where} must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}, got ${JSON.stringify(value)}`,
    );
  }
  if ("const" in schema && schema.const !== value) {
    errors.push(`${where} must be ${JSON.stringify(schema.const)}`);
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength)
      errors.push(`${where} must be at least ${schema.minLength} characters`);
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength)
      errors.push(`${where} must be at most ${schema.maxLength} characters`);
    if (schema.format === "uri" && !looksLikeUrl(value)) {
      errors.push(
        `${where} must be a public http(s) URL; upload local files first (upload_file) and pass the returned URL`,
      );
    } else if (
      /url/i.test(path.split(".").pop() ?? "") &&
      !looksLikeUrl(value)
    ) {
      warnings.push(
        `${where} does not look like a URL; kie.ai needs public http(s) URLs for media inputs`,
      );
    }
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum)
      errors.push(`${where} must be >= ${schema.minimum}`);
    if (typeof schema.maximum === "number" && value > schema.maximum)
      errors.push(`${where} must be <= ${schema.maximum}`);
    if (
      typeof schema.exclusiveMinimum === "number" &&
      value <= schema.exclusiveMinimum
    )
      errors.push(`${where} must be > ${schema.exclusiveMinimum}`);
    if (
      typeof schema.exclusiveMaximum === "number" &&
      value >= schema.exclusiveMaximum
    )
      errors.push(`${where} must be < ${schema.exclusiveMaximum}`);
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      errors.push(`${where} needs at least ${schema.minItems} item(s)`);
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      errors.push(`${where} allows at most ${schema.maxItems} item(s)`);
    if (isObject(schema.items)) {
      value.forEach((item, index) => {
        const result = checkAgainstSchema(
          item,
          schema.items as JsonSchema,
          `${path}[${index}]`,
          depth + 1,
          options,
        );
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      });
    }
  }

  if (isObject(value)) {
    const properties = isObject(schema.properties)
      ? (schema.properties as Record<string, unknown>)
      : {};
    const known = ownKeys(properties);
    const required = Array.isArray(schema.required)
      ? schema.required.filter((r): r is string => typeof r === "string")
      : [];
    for (const key of required) {
      if (!Object.hasOwn(value, key) || value[key] === undefined) {
        errors.push(`${childPath(path, key)} is required`);
      }
    }
    for (const [key, item] of Object.entries(value)) {
      const child = childPath(path, key);
      if (CONTROL_CHARS.test(key)) {
        errors.push(
          `${child} is not a valid field name (it contains a line break or control character)`,
        );
        continue;
      }
      // Own properties only: `__proto__` must not resolve to Object.prototype.
      const propertySchema = hasOwnKey(properties, key)
        ? properties[key]
        : undefined;
      if (isObject(propertySchema)) {
        const result = checkAgainstSchema(
          item,
          propertySchema,
          child,
          depth + 1,
          options,
        );
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else if (known.length > 0) {
        if (schema.additionalProperties === false || options.strictFields) {
          errors.push(
            `${child} is not a field this model accepts; known fields: ${known.join(", ")}`,
          );
        } else {
          warnings.push(
            `${child} is not in the model's schema and may be ignored; known fields: ${known.join(", ")}`,
          );
        }
      }
    }
  }

  return { errors, warnings };
}

export interface FieldSummary {
  name: string;
  type?: string;
  required: boolean;
  enum?: unknown[];
  default?: unknown;
  min?: number;
  max?: number;
  description?: string;
}

function firstParagraph(text: unknown, max = 240): string | undefined {
  if (typeof text !== "string" || !text.trim()) return undefined;
  const paragraph = text
    .trim()
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ");
  return paragraph.length > max ? `${paragraph.slice(0, max - 1)}…` : paragraph;
}

/** A compact, token-cheap description of an object schema's fields. */
export function summarizeFields(
  schema: JsonSchema | undefined,
): FieldSummary[] {
  if (!schema || !isObject(schema.properties)) return [];
  const required = new Set(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );
  return Object.entries(schema.properties as Record<string, unknown>)
    .filter(([, value]) => isObject(value))
    .map(([name, raw]) => {
      const field = raw as JsonSchema;
      const items = isObject(field.items) ? (field.items as JsonSchema) : {};
      const type = Array.isArray(field.type)
        ? field.type.join("|")
        : typeof field.type === "string"
          ? field.type === "array" && typeof items.type === "string"
            ? `array<${items.type}>`
            : field.type
          : undefined;
      const min =
        typeof field.minimum === "number"
          ? field.minimum
          : typeof field.minItems === "number"
            ? field.minItems
            : typeof field.minLength === "number"
              ? field.minLength
              : undefined;
      const max =
        typeof field.maximum === "number"
          ? field.maximum
          : typeof field.maxItems === "number"
            ? field.maxItems
            : typeof field.maxLength === "number"
              ? field.maxLength
              : undefined;
      return {
        name,
        ...(type ? { type } : {}),
        required: required.has(name),
        ...(Array.isArray(field.enum) ? { enum: field.enum } : {}),
        ...(field.default !== undefined ? { default: field.default } : {}),
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        ...(firstParagraph(field.description)
          ? { description: firstParagraph(field.description) }
          : {}),
      };
    });
}

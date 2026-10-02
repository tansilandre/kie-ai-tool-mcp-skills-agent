import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkAgainstSchema,
  dereference,
  extractRequestShape,
  resolvePointer,
  summarizeFields,
} from "../schema-check.js";

// Real responses from GET /api/v1/models/{model}/schema, saved 2026-10-02.
function openapi(name: string): unknown {
  const file = join(
    process.cwd(),
    "src/__tests__/fixtures/catalog",
    `schema_${name}.json`,
  );
  return (
    JSON.parse(readFileSync(file, "utf8")) as { data: { openapi: unknown } }
  ).data.openapi;
}

describe("resolvePointer", () => {
  const doc = {
    components: {
      schemas: { "response not with recordId": { type: "object" } },
      responses: { "Error ": { description: "trailing space key" } },
      "a/b": { ok: true },
    },
  };

  test("percent-decodes segments", () => {
    expect(
      resolvePointer(
        doc,
        "#/components/schemas/response%20not%20with%20recordId",
      ),
    ).toEqual({ type: "object" });
  });

  test("matches keys exactly, including a trailing space", () => {
    expect(resolvePointer(doc, "#/components/responses/Error%20")).toEqual({
      description: "trailing space key",
    });
    expect(() => resolvePointer(doc, "#/components/responses/Error")).toThrow(
      "Unresolvable",
    );
  });

  test("unescapes JSON pointer tokens", () => {
    expect(resolvePointer(doc, "#/components/a~1b")).toEqual({ ok: true });
  });

  test("refuses remote references", () => {
    expect(() => resolvePointer(doc, "https://example.com/x.json")).toThrow(
      "local",
    );
  });
});

describe("dereference", () => {
  test("inlines refs and keeps sibling keywords", () => {
    const doc = { components: { schemas: { S: { type: "string" } } } };
    expect(
      dereference({ $ref: "#/components/schemas/S", description: "kept" }, doc),
    ).toEqual({ type: "string", description: "kept" });
  });

  test("stops on cyclic refs instead of recursing forever", () => {
    const doc = {
      components: { schemas: { A: { $ref: "#/components/schemas/A" } } },
    };
    expect(() =>
      dereference({ $ref: "#/components/schemas/A" }, doc),
    ).not.toThrow();
  });
});

describe("extractRequestShape on live fixtures", () => {
  test.each([
    ["gpt-image-2-text-to-image", ["prompt"]],
    ["veo-3-1", ["prompt"]],
    ["bytedance__seedance-1.5-pro", ["prompt", "aspect_ratio", "duration"]],
  ])("%s is a task model with its input schema", (name, required) => {
    const shape = extractRequestShape(openapi(name));
    expect(shape.kind).toBe("task");
    expect(shape.path).toBe("/api/v1/jobs/createTask");
    expect(shape.method).toBe("POST");
    expect(shape.inputSchema?.required).toEqual(required);
  });

  test("a model on another path is reported as sync", () => {
    const shape = extractRequestShape({
      paths: { "/api/v1/chat/completions": { post: {} } },
    });
    expect(shape.kind).toBe("sync");
    expect(shape.path).toBe("/api/v1/chat/completions");
  });

  test("a document without paths is rejected", () => {
    expect(() => extractRequestShape({})).toThrow("no paths");
  });
});

describe("checkAgainstSchema", () => {
  const gpt = extractRequestShape(openapi("gpt-image-2-text-to-image"))
    .inputSchema as Record<string, unknown>;
  const veo = extractRequestShape(openapi("veo-3-1")).inputSchema as Record<
    string,
    unknown
  >;
  const seedance = extractRequestShape(openapi("bytedance__seedance-1.5-pro"))
    .inputSchema as Record<string, unknown>;

  test("accepts a valid input", () => {
    expect(
      checkAgainstSchema(
        { prompt: "a leaf", resolution: "1K", aspect_ratio: "1:1" },
        gpt,
      ),
    ).toEqual({ errors: [], warnings: [] });
  });

  test("reports a missing required field", () => {
    expect(checkAgainstSchema({ resolution: "1K" }, gpt).errors).toEqual([
      "prompt is required",
    ]);
  });

  test("reports a value outside the enum", () => {
    expect(
      checkAgainstSchema({ prompt: "x", resolution: "8K" }, gpt).errors[0],
    ).toBe('resolution must be one of "1K", "2K", "4K", got "8K"');
  });

  test("reports a number sent as a string", () => {
    expect(
      checkAgainstSchema({ prompt: "x", duration: "8" }, veo).errors[0],
    ).toBe('duration must be integer, got string "8"');
  });

  test("warns about a field the schema doesn't list", () => {
    const result = checkAgainstSchema({ prompt: "x", aspectRatio: "1:1" }, gpt);
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]).toContain(
      "aspectRatio is not in the model's schema",
    );
  });

  test("rejects a local path where a URL is required", () => {
    const result = checkAgainstSchema(
      {
        prompt: "a slow pan",
        aspect_ratio: "9:16",
        duration: 4,
        input_urls: ["./photo.jpg"],
      },
      seedance,
    );
    expect(result.errors[0]).toContain(
      "input_urls[0] must be a public http(s) URL",
    );
  });

  test("enforces maxItems and minLength", () => {
    const result = checkAgainstSchema(
      {
        prompt: "ab",
        aspect_ratio: "9:16",
        duration: 4,
        input_urls: [
          "https://a.example/1.png",
          "https://a.example/2.png",
          "https://a.example/3.png",
        ],
      },
      seedance,
    );
    expect(result.errors).toEqual([
      "prompt must be at least 3 characters",
      "input_urls allows at most 2 item(s)",
    ]);
  });

  test("passes oneOf when one branch matches and reports the closest branch otherwise", () => {
    const schema = {
      type: "object",
      oneOf: [
        {
          type: "object",
          required: ["task_id"],
          properties: { task_id: { type: "string" } },
        },
        {
          type: "object",
          required: ["image_url", "prompt"],
          properties: {
            image_url: { type: "string" },
            prompt: { type: "string" },
          },
        },
      ],
    };
    expect(checkAgainstSchema({ task_id: "t1" }, schema).errors).toEqual([]);
    const failed = checkAgainstSchema(
      { image_url: "https://x.example/a.png" },
      schema,
    );
    expect(failed.errors[0]).toContain("must match one of 2 allowed shapes");
    expect(failed.errors[0]).toContain("prompt is required");
  });
});

describe("summarizeFields", () => {
  test("lists fields with types, required flags, enums and limits", () => {
    const seedance = extractRequestShape(
      openapi("bytedance__seedance-1.5-pro"),
    ).inputSchema;
    const fields = summarizeFields(seedance);
    const byName = Object.fromEntries(
      fields.map((field) => [field.name, field]),
    );
    expect(byName.prompt).toMatchObject({
      type: "string",
      required: true,
      min: 3,
      max: 20000,
    });
    expect(byName.input_urls).toMatchObject({
      type: "array<string>",
      required: false,
      max: 2,
    });
    expect(byName.resolution).toMatchObject({
      enum: ["480p", "720p", "1080p"],
      default: "720p",
    });
  });

  test("returns nothing for a schema without properties", () => {
    expect(summarizeFields(undefined)).toEqual([]);
  });
});

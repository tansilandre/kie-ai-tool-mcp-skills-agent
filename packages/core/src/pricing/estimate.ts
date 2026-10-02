// Upper-bound credit estimates from kie.ai's own price text.
//
// kie.ai publishes a price text per model ("6 credits ($0.03) for 1 K, 10
// credits for 2 K", "720P: 7.2 credits/s (no audio) | 9.6 credits/s (with
// audio)", "Lite mode: 720P — 30 credits per video; Quality mode: …"). The
// formats vary too much to parse exactly, but credit caps only need a number
// that is never below the real charge. So: find every "N credits", keep the
// ones next to the request's resolution when there are any, take the highest,
// multiply by duration for per-second prices and by the output count. When
// the text can't support that (token prices, no numbers, per-second without a
// duration) the estimate is unknown, and callers treat unknown as over every
// cap.

export interface CreditEstimate {
  status: "estimated" | "unknown";
  /** Upper bound for the whole item (all outputs). */
  credits?: number;
  /** How the number was reached, for the approver. */
  basis: string;
}

const RESOLUTION = /\b(\d{3,4})\s?p\b|\b([1248])\s?k\b/gi;

function normalizeResolution(value: string): string | undefined {
  const match = /^\s*(\d{3,4})\s?p\s*$/i.exec(value);
  if (match) return `${match[1]}p`;
  const k = /^\s*([1248])\s?k\s*$/i.exec(value);
  if (k) return `${k[1]}k`;
  return undefined;
}

interface PriceMention {
  credits: number;
  index: number;
  perSecond: boolean;
  resolution?: string;
}

const PER_SECOND =
  /^\s*(?:\([^)]*\)\s*)?(?:\/\s*s(?:ec(?:ond)?)?\b|per\s+(?:1\s+|video\s+)?sec(?:ond)?\b)/i;

/**
 * Pricing the parser can't turn into a safe upper bound: per characters,
 * tokens, words, megapixels or minutes; charges for input media; formulas
 * like "Unit Price × (Input + Output)"; "per 5 seconds". Any of these makes
 * the estimate unknown rather than a number that might be too low.
 */
const UNSUPPORTED = [
  /per\s+[\d,.]*\s*(?:k\s+)?(?:characters?|chars?|words?|tokens?)\b/i,
  /\btokens?\b/i,
  /mega\s?pixels?|\bper\s+MP\b/i,
  /per\s+minute|\/\s*min\b/i,
  /per\s+\d+\s*(?:seconds?|s)\b/i,
  /\binput\s+(?:images?|videos?|audio|duration)\b|\b(?:image|video|audio)\s+input\b/i,
  /\badditional\s+(?:images?|inputs?)\b/i,
  /\(\s*input|input\s*\+|\+\s*input/i,
  /\bper\s+(?:layer|reference|input)\b/i,
];

/** Full-width punctuation and "720 p" spacing, as some kie.ai texts use. */
function normalizeText(text: string): string {
  return text
    .replace(/／/g, "/")
    .replace(/，/g, ", ")
    .replace(/：/g, ": ")
    .replace(/。/g, ". ")
    .replace(/(\d)\s+p\b/gi, "$1p");
}

function mentions(text: string): PriceMention[] {
  const found: PriceMention[] = [];
  const credit = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*credits?\b/gi;
  for (let m = credit.exec(text); m; m = credit.exec(text)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    const perSecond =
      PER_SECOND.test(after) ||
      /(?:per|each|every|1)\s+second[^.;\n]*$/i.test(before) ||
      /\bper\s+second\b/i.test(after.slice(0, 30));
    found.push({
      credits: Number(m[1].replace(/,/g, "")),
      index: m.index,
      perSecond,
    });
  }
  // "Generating 1 second of video costs about 2.8 credits at 480p, 6
  // credits at 720p and 14 credits at 1080p": every price in a sentence
  // that is about one second is per second, not only the nearest one.
  const sentences = text.split(/(?<!\d)[.;\n](?!\d)/);
  let offset = 0;
  for (const sentence of sentences) {
    const start = text.indexOf(sentence, offset);
    const end = start + sentence.length;
    offset = end;
    if (
      /\b(?:1|one|each|every|per)\s+(?:video\s+)?second\b/i.test(sentence) &&
      !/\bper\s+(?:video|image|clip|generation)\b/i.test(sentence)
    ) {
      for (const mention of found) {
        if (mention.index >= start && mention.index < end) {
          mention.perSecond = true;
        }
      }
    }
  }
  // Which resolution does each price belong to? kie.ai writes it both ways:
  // "6 credits ($0.03) for 1 K" / "2 credits at 480p" (after the number) and
  // "720P — 30 credits" / "480p: 1.75 credits/s" (before it). Prefer an
  // explicit "for/at <res>" right after the number; otherwise take the last
  // resolution named before it, but not one that belongs to an earlier price.
  for (const [i, mention] of found.entries()) {
    const tail = text.slice(mention.index, mention.index + 60);
    const after =
      /^[\d.\s]*credits?[^;,\n]{0,28}?\b(?:for|at)\s+(\d{3,4}\s?p|[1248]\s?k)\b/i.exec(
        tail,
      );
    if (after) {
      mention.resolution = normalizeResolution(after[1]);
      continue;
    }
    const from = i > 0 ? found[i - 1].index : 0;
    const head = text.slice(Math.max(from, mention.index - 80), mention.index);
    const lineStart = Math.max(head.lastIndexOf("\n"), -1) + 1;
    const scope = head.slice(lineStart);
    const tokens = [...scope.matchAll(RESOLUTION)];
    const last = tokens[tokens.length - 1];
    if (last) {
      mention.resolution = normalizeResolution(last[0]);
    } else if (i > 0 && !text.slice(from, mention.index).includes("\n")) {
      // "480p: 1.75 credits/s no audio, 3.5 credits/s with audio": the
      // second price is still 480p. Dropping it would undercount.
      mention.resolution = found[i - 1].resolution;
    }
  }
  return found;
}

export function estimateFromPriceText(
  rawText: string | undefined,
  request: {
    resolution?: string;
    durationSeconds?: number;
    outputCount?: number;
  },
): CreditEstimate {
  if (!rawText?.trim())
    return { status: "unknown", basis: "kie.ai lists no price" };
  const text = normalizeText(rawText);
  if (UNSUPPORTED.some((pattern) => pattern.test(text))) {
    return {
      status: "unknown",
      basis:
        "kie.ai prices this by a unit or formula the estimate can't bound (characters, tokens, megapixels, input media or similar); read its price text",
    };
  }
  if (/\bis free\b/i.test(text) && !/\d\s*credits?/i.test(text)) {
    return {
      status: "estimated",
      credits: 0,
      basis: "kie.ai lists it as free",
    };
  }
  const all = mentions(text).filter((m) => m.credits > 0);
  if (all.length === 0) {
    return {
      status: "unknown",
      basis: "no credit amount in kie.ai's price text",
    };
  }
  const wanted = request.resolution
    ? normalizeResolution(request.resolution)
    : undefined;
  // "5s at 720p costs 12 credits, 10s at 720p or 5s at 1080p cost 30": the
  // price depends on duration too, so pairing by resolution can pick a
  // cheaper tier. Use the highest listed price instead.
  // Upscale prices go from one resolution to another ("480P → 1080P"),
  // so pairing on one resolution is ambiguous in the same way.
  const durationTiers =
    /\b\d+\s?s\b/i.test(text.replace(/\/\s*s(?:ec(?:ond)?)?\b/gi, "")) ||
    /→|->/.test(text);
  const matching =
    wanted && !durationTiers ? all.filter((m) => m.resolution === wanted) : [];
  if (wanted && !durationTiers && matching.length === 0) {
    const listed = [...text.matchAll(RESOLUTION)].some(
      (token) => normalizeResolution(token[0]) === wanted,
    );
    if (listed) {
      // The requested resolution is listed, but not with a credit price
      // (e.g. only in dollars): any other number could be too low.
      return {
        status: "unknown",
        basis: `kie.ai lists ${wanted} without a credit price`,
      };
    }
  }
  const pool = matching.length > 0 ? matching : all;
  const perSecond = pool.some((m) => m.perSecond);
  const top = Math.max(...pool.map((m) => m.credits));
  const outputs = Math.max(1, request.outputCount ?? 1);
  const where =
    matching.length > 0
      ? ` at ${wanted}`
      : durationTiers
        ? " (highest listed price; it depends on duration)"
        : " (highest listed price)";
  if (perSecond) {
    if (!request.durationSeconds || request.durationSeconds <= 0) {
      return {
        status: "unknown",
        basis: "priced per second, and the duration is not known",
      };
    }
    return {
      status: "estimated",
      credits: round(top * request.durationSeconds * outputs),
      basis: `up to ${top} credits/s × ${request.durationSeconds} s${outputs > 1 ? ` × ${outputs}` : ""}${where}`,
    };
  }
  return {
    status: "estimated",
    credits: round(top * outputs),
    basis: `up to ${top} credits${outputs > 1 ? ` × ${outputs}` : ""}${where}`,
  };
}

function round(value: number): number {
  return Math.ceil(value * 100) / 100;
}

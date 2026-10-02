export type PriceStatus = "exact" | "estimated" | "unknown";

export interface PriceState {
  status: PriceStatus;
  credits?: number;
  sourceUrl?: string;
  sourceFingerprint?: string;
  verifiedAt?: string;
  rateCardVersion: string;
  /** kie.ai's own price text for the model, shown when no exact formula exists. */
  note?: string;
  /** How an estimate was reached, e.g. "up to 6 credits at 1k". */
  basis?: string;
}

export interface RateCardEntry {
  toolName: string;
  /** The provider route scope that has a verified formula for specific inputs. */
  scope: string;
  name: string;
  sourceUrl: string;
  sourceFingerprint: string;
  verifiedAt: string;
  matches(args: Record<string, unknown>, model: string, mode: string): boolean;
  credits(args: Record<string, unknown>): number | undefined;
}

export const RATE_CARD_VERSION = "2026-08-17";

export const RATE_CARD: RateCardEntry[] = [
  {
    toolName: "nano_banana_image",
    scope: "text-to-image",
    name: "Nano Banana 2 Lite image",
    sourceUrl: "https://kie.ai/pricing",
    sourceFingerprint: "kie-pricing-2026-08-17:nano-banana-2-lite:4-per-image",
    verifiedAt: "2026-08-17",
    matches: (args, model, mode) =>
      mode === "text-to-image" &&
      model === "nano-banana-2-lite" &&
      Number(args.outputCount ?? 1) === 1,
    credits: () => 4,
  },
  {
    toolName: "veo3_generate_video",
    scope: "veo3_lite",
    name: "Veo 3.1 Lite, one clip up to 8 s",
    sourceUrl: "https://kie.ai/pricing",
    sourceFingerprint:
      "kie-pricing-2026-10-02:veo-3-1-lite:720p-30-1080p-35-per-video",
    verifiedAt: "2026-10-02",
    // Charged exactly this by balance drop on the legacy endpoint
    // (2026-09-28: 30 at 720p, 35 at 1080p, 5 of 5 clips).
    matches: (args, model) =>
      model === "veo3_lite" &&
      (args.resolution === undefined ||
        args.resolution === "720p" ||
        args.resolution === "1080p"),
    credits: (args) => (args.resolution === "1080p" ? 35 : 30),
  },
  {
    toolName: "hailuo_video",
    scope: "reference-to-video",
    name: "MiniMax H3 reference-to-video at 768p",
    sourceUrl: "https://kie.ai/pricing",
    sourceFingerprint:
      "kie-pricing-2026-08-17:minimax-h3-reference-768p:16-per-second",
    verifiedAt: "2026-08-17",
    matches: (args, _model, mode) =>
      mode === "reference-to-video" &&
      args.resolution === "768p" &&
      typeof args.duration === "number",
    credits: (args) =>
      typeof args.duration === "number" ? args.duration * 16 : undefined,
  },
];

export function priceRequest(
  toolName: string,
  args: Record<string, unknown>,
  model: string,
  mode: string,
): PriceState {
  const entry = RATE_CARD.find(
    (candidate) =>
      candidate.toolName === toolName && candidate.matches(args, model, mode),
  );
  if (!entry) return { status: "unknown", rateCardVersion: RATE_CARD_VERSION };
  const credits = entry.credits(args);
  if (credits === undefined)
    return { status: "unknown", rateCardVersion: RATE_CARD_VERSION };
  return {
    status: "exact",
    credits,
    sourceUrl: entry.sourceUrl,
    sourceFingerprint: entry.sourceFingerprint,
    verifiedAt: entry.verifiedAt,
    rateCardVersion: RATE_CARD_VERSION,
  };
}

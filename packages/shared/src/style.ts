import { z } from "zod";

// Style JSON schema, version-tagged. Evolution is additive-only (D5): a style
// saved today must parse and render identically forever. Colors are sRGB hex
// on purpose — exported assets must never contain oklch (D6/CLAUDE.md).

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "sRGB hex color required (#RRGGBB)");

export const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: hexColorSchema,
});

const solidFillSchema = z.object({
  type: z.literal("solid"),
  color: hexColorSchema,
});

const linearGradientFillSchema = z.object({
  type: z.literal("linearGradient"),
  /** rotation in radians; 0 = left→right */
  rotation: z.number().default(0),
  stops: z.array(gradientStopSchema).min(2).max(4),
});

const radialGradientFillSchema = z.object({
  type: z.literal("radialGradient"),
  stops: z.array(gradientStopSchema).min(2).max(4),
});

export const fillSchema = z.discriminatedUnion("type", [
  solidFillSchema,
  linearGradientFillSchema,
  radialGradientFillSchema,
]);

export const qrStyleSchema = z.object({
  v: z.literal(1),
  /** Requested ECC. The engine may raise it (never lower) per guardrails. */
  ecc: z.enum(["L", "M", "Q", "H"]).default("M"),
  dots: z
    .object({
      style: z.enum(["square", "rounded", "circle"]).default("square"),
      /** module footprint as a ratio of module pitch; floor 0.4 per D6 */
      sizeRatio: z.number().min(0.4).max(1).default(1),
    })
    .prefault({}),
  eyes: z
    .object({
      frame: z.enum(["square", "rounded", "circle", "leaf"]).default("square"),
      pupil: z.enum(["square", "rounded", "circle", "dot"]).default("square"),
      /** null = inherit foreground fill */
      color: hexColorSchema.nullable().default(null),
    })
    .prefault({}),
  fill: fillSchema.default({ type: "solid", color: "#111111" }),
  background: z
    .object({
      transparent: z.boolean().default(false),
      color: hexColorSchema.default("#ffffff"),
    })
    .prefault({}),
  logo: z
    .object({
      /** uploaded asset reference; resolution to a data URI happens outside the engine */
      assetId: z.string(),
      /**
       * linear ratio of the code side. Hard cap 0.40: decode round-trip
       * testing showed concentrated central knockout beyond ~16-17% area
       * (incl. padding) fails even at ECC H — see D6.
       */
      sizeRatio: z.number().min(0.1).max(0.4).default(0.32),
      /** knockout margin in modules around the logo box */
      padding: z.number().int().min(0).max(4).default(1),
      knockout: z.boolean().default(true),
      shape: z.enum(["auto", "circle", "square"]).default("auto"),
    })
    .nullable()
    .default(null),
  /** reserved for v1.1 frame/CTA support */
  frame: z.null().default(null),
});

export type QrStyle = z.infer<typeof qrStyleSchema>;
export type QrFill = z.infer<typeof fillSchema>;
export type GradientStop = z.infer<typeof gradientStopSchema>;

export const defaultQrStyle: QrStyle = qrStyleSchema.parse({ v: 1 });

export function parseQrStyle(input: unknown): QrStyle {
  return qrStyleSchema.parse(input);
}

// @qrcdn/shared — style JSON zod schema (v-tagged), slug utilities, and
// types shared between the web app and the redirect worker.

export const STYLE_SCHEMA_VERSION = 1;

export {
  qrStyleSchema,
  hexColorSchema,
  fillSchema,
  gradientStopSchema,
  defaultQrStyle,
  parseQrStyle,
  type QrStyle,
  type QrFill,
  type GradientStop,
} from "./style";

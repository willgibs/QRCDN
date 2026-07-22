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

// Cloudflare KV write-through record shape, shared between the web app
// (apps/web/lib/kv-sync.ts) and the redirect Worker (P5-U2).
export type { KvSlugRecord } from "./kv";

// Generated Postgres types (packages/shared/src/database.types.ts) — the
// source of truth is the live Supabase schema, regenerated after every
// migration. Re-exported here so `apps/web` and other workspace packages
// never import the generated file path directly.
export type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";

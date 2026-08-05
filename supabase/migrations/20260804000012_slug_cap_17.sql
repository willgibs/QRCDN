-- Vanity-slug cap 30 -> 17 (P9.8-B3). Rationale: docs/DECISIONS.md D12 as
-- amended 2026-08-04, grounded in the empirical gate at
-- packages/qr-engine/test/render.test.ts ("worst-case dynamic payload"):
-- HTTPS://QRCDN.COM/ (18 chars) + a 17-char slug = 35 chars, exactly the
-- v3-H alphanumeric capacity, so EVERY dynamic payload stays at symbol
-- version <= 3 forever -- which lets the studio instrument prove a brand
-- kit against the worst case once, for every dynamic code it will ever
-- mint, API included. One more character exceeds v3; the boundary is
-- asserted in the engine suite, not assumed from a capacity table.
--
-- CONSTRAINT TIGHTEN, not additive -- explicitly board-flagged per the
-- standing migration rule (ops repo STATUS.md). Live-row check before this
-- landed (2026-08-04, PostgREST probe): 1 row total, max slug length 7,
-- zero rows over 17, so no existing row can violate the new check and
-- updates to existing rows can never trip it. The redirect Worker's
-- routing matcher deliberately stays {4,30}: a printed code redirects
-- forever regardless of what creation now allows ("your code never dies").
-- Forward-only: never edit this file after it lands (agent-playbook rule).

-- ============================================================ constraint

alter table public.qr_codes
  drop constraint qr_codes_slug_check;

alter table public.qr_codes
  add constraint qr_codes_slug_check
  check (slug = upper(slug) and char_length(slug) between 4 and 17);

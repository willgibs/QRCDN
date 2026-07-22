-- P5-U1 follow-up: the P5 spec's createDynamicCode signature includes a
-- human label ("Spring menu", "Window sticker") but qr_codes shipped without
-- one — caught by the U1 agent, decided by the orchestrator: codes get names.
-- Same convention as brand_kits.name / api_keys.name. Table is empty at the
-- time this lands (dynamic codes are being built in this very phase), so the
-- not-null-without-default add is safe on both cloud and fresh CI stacks.
-- Forward-only (agent-playbook rule).
alter table public.qr_codes
  add column name text not null check (char_length(name) between 1 and 80);

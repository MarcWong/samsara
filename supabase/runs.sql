-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor).
-- One row per finished life, written by the static site with the anon key.

create table public.runs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text,     -- 'kiosk' (exhibition machine, ?kiosk URL) | 'web'
  deployment  text,     -- 'prod' (/samsara/) | 'test' (/samsara_test/) | 'dev'
  country     text,     -- country name as shown in game
  orientation text,     -- 'Straight' | 'LGBTQ'
  age         int,      -- displayed age at death
  initial     jsonb,    -- allocation after the rebalance bonus, keyed CHR/INT/STR/MNY/SPR
  finals      jsonb,    -- stats at death, keyed by label (Wealth/Appearance/IQ/Health/Happiness)
  talents     jsonb,    -- drawn lucky-charm talent ids
  all_in      boolean   -- whether the all-tokens-in-one-stat trick was used
);

-- Anon key can ONLY insert. No select/update/delete policies exist, so the
-- key shipped inside the public bundle cannot read or tamper with the log;
-- reading happens through the dashboard or the service key.
alter table public.runs enable row level security;

create policy "anon insert runs"
  on public.runs
  for insert
  to anon
  with check (true);

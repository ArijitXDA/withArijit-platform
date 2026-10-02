-- ============================================================================
-- LLM observability — hardening follow-up to 20261002120000_llm_observability.sql.   (2026-10-02)
--
-- Closes review findings on the LLM Balances v2 build:
--   [23]    "one open price row per model" existed only in app code (read lineage -> insert -> close); two overlapping
--           POSTs on the Prices tab could leave two "current" rows for one model. Now enforced by a partial unique index.
--   [47]    llm_ledger.amount_usd was numeric(12,2): the app rounds to 6 dp (legacy / currency-switch conversion, top-up
--           burn correction) but the column silently cent-rounded it. Widened to numeric(18,6).
--   [13][50] models the instrumented code actually calls had NO price row, so every call was stored cost_basis='unpriced'
--           with est_cost_usd NULL and contributed $0 to Usage totals / burn / the 'our_log' spend basis:
--             openai/gpt-image-1  (news-image route)      -> seeded below, per-image unit price
--             deepseek-chat (Anaant)                      -> seeded below as an INFERRED alias of deepseek-flash
--             xai/grok-2-latest   (Anaant Grok option)    -> DELIBERATELY NOT seeded: no published price exists on the
--                                  official xAI pricing/models pages or in research.json (the model is not listed at all);
--                                  seeding a remembered price would put a guess into a cost report. See the note at the
--                                  bottom. If xAI returns cost_in_usd_ticks the logger already prices those calls as
--                                  'provider_reported'.
--
-- Idempotent (IF NOT EXISTS / guarded DO / NOT EXISTS seeds) and safe to run in a single transaction. Creates NO new
-- tables or functions, so the repo rule (RLS on, REVOKE ALL FROM public/anon/authenticated, GRANT to service_role) is
-- already in force on every object touched here and is not re-stated.
-- ============================================================================

-- ── 1. [23] at most ONE open (effective_to IS NULL) price row per provider + model (case-insensitive) ───────────
-- Pre-flight: building the index over existing duplicates would fail with an unhelpful message; fail loudly instead.
do $chk$
declare dups text;
begin
  select string_agg(provider || ' / ' || lm || ' x' || n, ', ') into dups
    from (select provider, lower(model) as lm, count(*) as n
            from public.llm_model_prices
           where effective_to is null
           group by provider, lower(model)
          having count(*) > 1) d;
  if dups is not null then
    raise exception 'llm_model_prices has more than one OPEN row for: %. Close the older rows (set effective_to) first.', dups;
  end if;
end
$chk$;

create unique index if not exists llm_model_prices_open_uq
  on public.llm_model_prices (provider, lower(model))
  where effective_to is null;

-- ── 2. [47] llm_ledger.amount_usd numeric(12,2) -> numeric(18,6) ────────────────────────────────────────────────
-- Widening only (no existing value can be truncated). No views, matviews, functions, triggers, policies or CHECK
-- constraints depend on the column (checked against the live catalog 2026-10-02). Guarded so a re-run is a no-op
-- instead of a pointless table rewrite.
do $w$
begin
  if (select format_type(a.atttypid, a.atttypmod)
        from pg_attribute a
       where a.attrelid = 'public.llm_ledger'::regclass and a.attname = 'amount_usd' and not a.attisdropped) is distinct from 'numeric(18,6)' then
    alter table public.llm_ledger alter column amount_usd type numeric(18,6);
  end if;
end
$w$;

-- ── 3. [13][50] price seed for models the code actually calls ────────────────────────────────────────────────────
-- Same conventions as the base seed: effective_from 2026-10-02 00:00 UTC, created_by 'seed 2026-10-02', never
-- duplicates an existing (provider, model) row (any age, case-insensitive), editable on the Prices tab.

-- openai / gpt-image-1: app/api/news-image/route.tsx logs ONE row per call as call_kind 'image', units = 1,
-- unit_kind 'image' (+ the response's token usage when present, which the price engine treats as informational on a
-- unit-priced row). The route hardcodes size 1536x1024 and quality 'medium' = $0.063 per image on the official OpenAI
-- gpt-image-1 model page (low $0.016 / high $0.25 at that size). match_kind is EXACT on purpose: a prefix row
-- 'gpt-image-1' would also swallow gpt-image-1.5 and gpt-image-1-mini, which are priced differently.
insert into public.llm_model_prices (provider, model, match_kind, per_unit_usd, unit_kind, notes, source_url, effective_from, created_by)
select 'openai', 'gpt-image-1', 'exact', 0.063, 'image',
       'per image at 1536x1024 MEDIUM quality (the only size/quality news-image uses; low 0.016, high 0.25 at that size) — add a new price row if the route changes quality/size. Seeded 2026-10-02 per review finding.',
       'https://developers.openai.com/api/docs/models/gpt-image-1.md',
       timestamptz '2026-10-02 00:00:00+00', 'seed 2026-10-02'
 where not exists (select 1 from public.llm_model_prices p where p.provider = 'openai' and lower(p.model) = 'gpt-image-1');

-- deepseek / deepseek-chat (Anaant sends 'deepseek-chat'): DeepSeek's changelog says the id was an alias of
-- deepseek-v4-flash (non-thinking) until it was discontinued on 2026-07-24. Whether a still-accepted call keeps billing at
-- the flash rate is NOT verified, so this row is an INFERENCE, labelled as such: it carries the deepseek-flash PEAK rates
-- (cache-miss input; off-peak is half) so a call that is still accepted prices instead of showing $0. 'deepseek-reasoner'
-- is deliberately not seeded — nothing calls it. The Anaant route should move to 'deepseek-flash' (queued separately),
-- after which this row is moot.
insert into public.llm_model_prices (provider, model, match_kind, input_per_mtok_usd, output_per_mtok_usd, cache_read_per_mtok_usd, notes, source_url, effective_from, created_by)
select 'deepseek', 'deepseek-chat', 'prefix', 0.3, 1.2, 0.006,
       'INFERRED, billing unverified — seeded 2026-10-02 per review finding: deepseek-chat was an alias of deepseek-v4-flash (non-thinking) until DeepSeek discontinued the id on 2026-07-24; priced at deepseek-flash PEAK rates (off-peak is half). Delete/replace once Anaant uses deepseek-flash.',
       'https://api-docs.deepseek.com/updates',
       timestamptz '2026-10-02 00:00:00+00', 'seed 2026-10-02'
 where not exists (select 1 from public.llm_model_prices p where p.provider = 'deepseek' and lower(p.model) = 'deepseek-chat');

-- ============================================================================
-- NOT DONE ON PURPOSE: xai / grok-2-latest (and grok-2-1212).
--   Neither docs.x.ai/developers/pricing nor /developers/models lists any grok-2 model, and the research notes carry no
--   price for it. Seeding a price from memory would be a guess in a cost report. Until a real price is known those
--   calls stay cost_basis='unpriced' (visible in the Usage tab's "unpriced models" list, not a silent $0), unless xAI's
--   response carries cost_in_usd_ticks (then 'provider_reported' wins). Fix = point Anaant's Grok option at a priced id
--   (grok-4.3 / grok-4.5 / grok-4.6 / grok-4.7 are seeded) or add the row on the Prices tab once a price is verified.
-- ============================================================================

-- ============================================================================
-- VERIFY AFTER APPLY (run each; expected results in the comment):
--
--   -- (a) the partial unique index exists and is unique + partial
--   select indexdef from pg_indexes where schemaname = 'public' and indexname = 'llm_model_prices_open_uq';
--     -- CREATE UNIQUE INDEX llm_model_prices_open_uq ON public.llm_model_prices USING btree (provider, lower(model)) WHERE (effective_to IS NULL)
--
--   -- (b) no open duplicates (and the index now makes that impossible)
--   select count(*) from (select 1 from public.llm_model_prices where effective_to is null group by provider, lower(model) having count(*) > 1) t;   -- 0
--
--   -- (c) ledger column widened
--   select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.llm_ledger'::regclass and attname = 'amount_usd';           -- numeric(18,6)
--
--   -- (d) the seeded rows (2 new rows -> 74 total on a table that had 72)
--   select provider, model, match_kind, input_per_mtok_usd, output_per_mtok_usd, cache_read_per_mtok_usd, per_unit_usd, unit_kind, effective_from, effective_to
--     from public.llm_model_prices
--    where (provider, lower(model)) in (('openai','gpt-image-1'), ('deepseek','deepseek-chat'))
--    order by provider, model;
--     -- openai/gpt-image-1 exact per_unit 0.063 image | deepseek-chat prefix in 0.3 out 1.2 cache_read 0.006
--   select count(*) from public.llm_model_prices;   -- 74
--
--   -- (e) still locked down: no anon/authenticated grants anywhere on the llm_* tables (expect 0 rows)
--   select table_name, grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name like 'llm\_%' and grantee in ('anon', 'authenticated', 'PUBLIC');
-- ============================================================================

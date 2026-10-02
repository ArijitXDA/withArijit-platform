-- ============================================================================
-- LLM observability: first-party call log, balance history, model prices, provider settings,
-- provider-reported daily usage + aggregation RPCs.   (2026-10-02)
--
-- Powers the upgraded partner.ostaran.com/admin/llm-balances page. Written to by the www and partner apps
-- (service role only). EVERY new table/function is locked: RLS on, no policies, REVOKE ALL FROM
-- public/anon/authenticated, GRANT to service_role only (Supabase default-grants write access to anon on new
-- public tables/functions — landmine; see reference_supabase_rpc_grants).
-- NEVER store prompts, completions, emails or phone numbers in llm_usage_log.
-- ============================================================================

-- ── provider settings (thresholds / currency / fx live here, not in code) ──────────────────────
create table if not exists public.llm_provider_settings (
  provider        text primary key,
  label           text not null,
  sort_order      int  not null default 100,
  enabled         boolean not null default true,
  currency        text not null default 'USD',
  fx_per_usd      numeric(14,6) not null default 1 check (fx_per_usd > 0),   -- native currency units per 1 USD
  low_threshold   numeric(14,2),                                              -- in the provider's currency; null = no alert
  alert_enabled   boolean not null default true,
  usd_per_credit  numeric(10,6),                                              -- credit-priced providers (Tavily)
  region          text,                                                       -- kimi: global|cn ; qwen: intl|cn
  notes           text,
  updated_at      timestamptz not null default now(),
  updated_by      text
);

-- ── first-party log of every LLM / embedding / search call our own code makes ───────────────────
create table if not exists public.llm_usage_log (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),         -- call completion time
  app              text not null,                               -- www | partner | edge | script
  vercel_env       text,                                        -- production | preview | development
  feature          text not null,                               -- stable slug: ask_ari, ask_ana, anaant, ...
  provider         text not null,
  model            text not null,
  call_kind        text not null default 'chat',                -- chat | embedding | image | search | other
  stream           boolean,
  input_tokens     int,                                         -- NON-cached input (cached tokens are separate columns)
  output_tokens    int,                                         -- includes reasoning/thinking tokens (billed as output)
  cache_read_tokens  int not null default 0,
  cache_write_tokens int not null default 0,
  reasoning_tokens int,                                         -- informational subset of output_tokens
  units            numeric,                                     -- images / search credits / characters
  unit_kind        text,
  est_cost_usd     numeric(18,10),                              -- wide on purpose: one RAG embedding costs ~$2e-7
  cost_basis       text,                                        -- computed | provider_reported | unpriced
  price_id         uuid,                                        -- llm_model_prices row used (history not rewritten on price edits)
  latency_ms       int,
  ttft_ms          int,
  status           text not null default 'ok',                  -- ok | error | timeout | aborted | rate_limited
  http_status      smallint,
  error_code       text,
  error_message    text,                                        -- truncated; never prompts/keys/user text
  request_id       text,
  actor_type       text,                                        -- partner | student | visitor | admin | system
  actor_id         text,                                        -- internal id / session id only — no email, no phone
  conversation_ref text,
  iterations       smallint,                                    -- tool-loop turns folded into this row (if any)
  key_label        text,
  meta             jsonb not null default '{}'::jsonb
);
create index if not exists llm_usage_log_created_idx       on public.llm_usage_log (created_at desc);
create index if not exists llm_usage_log_provider_idx      on public.llm_usage_log (provider, created_at desc);
create index if not exists llm_usage_log_feature_idx       on public.llm_usage_log (feature, created_at desc);
create index if not exists llm_usage_log_model_idx         on public.llm_usage_log (provider, model, created_at desc);
create index if not exists llm_usage_log_errors_idx        on public.llm_usage_log (created_at desc) where status <> 'ok';
create index if not exists llm_usage_log_actor_idx         on public.llm_usage_log (actor_type, actor_id, created_at desc) where actor_id is not null;

-- ── append-only time series of every balance refresh (burn rate / runway / sparkline) ──────────
create table if not exists public.llm_balance_history (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  checked_at        timestamptz not null default now(),
  live_balance_usd  numeric(16,4),
  spend_usd         numeric(16,4),
  remaining_usd     numeric(16,4),
  native_balance    numeric(16,4),
  native_currency   text,
  fx_used           numeric(14,6),
  spend_since       date,
  source            text,
  status            text,
  error             text,
  trigger           text,                                         -- cron | manual | ledger_edit
  extra             jsonb
);
create unique index if not exists llm_balance_history_uq  on public.llm_balance_history (provider, checked_at);
create index        if not exists llm_balance_history_idx on public.llm_balance_history (provider, checked_at desc);

-- ── versioned list prices (USD per million tokens) used to estimate cost of logged calls ───────
create table if not exists public.llm_model_prices (
  id                    uuid primary key default gen_random_uuid(),
  provider              text not null,
  model                 text not null,
  match_kind            text not null default 'exact' check (match_kind in ('exact','prefix')),
  input_per_mtok_usd        numeric(14,6),
  output_per_mtok_usd       numeric(14,6),
  cache_read_per_mtok_usd   numeric(14,6),
  cache_write_per_mtok_usd  numeric(14,6),
  per_unit_usd          numeric(14,6),                              -- images / search credits
  unit_kind             text,
  tiers                 jsonb,                                      -- long-context bands: [{"min_input_tokens":200000,"input":4,"output":18,"cache_read":0.4}]
  effective_from        timestamptz not null default now(),
  effective_to          timestamptz,
  source_url            text,
  notes                 text,
  created_by            text,
  created_at            timestamptz not null default now()
);
create unique index if not exists llm_model_prices_uq  on public.llm_model_prices (provider, model, effective_from);
create index        if not exists llm_model_prices_idx on public.llm_model_prices (provider, model, effective_from desc);

-- ── what the PROVIDER itself reports per day (authoritative; reconciles against our own log) ──
create table if not exists public.llm_provider_usage_daily (
  provider         text not null,
  day              date not null,
  model            text not null default '',
  input_tokens     bigint,
  output_tokens    bigint,
  cache_read_tokens  bigint,
  cache_write_tokens bigint,
  requests         bigint,
  cost_usd         numeric(16,4),
  source           text,
  fetched_at       timestamptz not null default now(),
  primary key (provider, day, model)
);
create index if not exists llm_provider_usage_daily_day_idx on public.llm_provider_usage_daily (day desc);

-- ── existing tables: extend ────────────────────────────────────────────────────────────────────
alter table public.llm_ledger
  add column if not exists currency            text not null default 'USD',
  add column if not exists amount_native       numeric,            -- in `currency`; amount_usd stays the USD equivalent
  add column if not exists as_of               timestamptz,        -- exact moment a balance reading / top-up applies from
  add column if not exists spend_baseline_usd  numeric,            -- provider-reported spend since spend_baseline_from, captured when the entry was saved
  add column if not exists spend_baseline_from date;

alter table public.llm_balance_snapshots
  add column if not exists native_balance     numeric,
  add column if not exists native_currency    text,
  add column if not exists last_ok_at         timestamptz,
  add column if not exists consecutive_errors int not null default 0,
  add column if not exists burn_per_day_usd   numeric,
  add column if not exists runway_days        numeric;

-- ── aggregation RPCs (PostgREST cannot GROUP BY) ───────────────────────────────────────────────
create or replace function public.llm_usage_summary(
  p_from timestamptz, p_to timestamptz, p_group text default 'provider',
  p_provider text default null, p_feature text default null, p_app text default null,
  p_include_preview boolean default false)
returns table(grp text, calls bigint, errors bigint, input_tokens bigint, output_tokens bigint,
              cache_read_tokens bigint, cache_write_tokens bigint, cost_usd numeric,
              unpriced_calls bigint, avg_latency_ms numeric, p95_latency_ms numeric)
language plpgsql stable
set search_path = public, pg_temp
as $fn$
declare v_expr text;
begin
  v_expr := case p_group
    when 'provider' then 'provider'
    when 'model'    then $$provider || ' / ' || model$$
    when 'feature'  then 'feature'
    when 'app'      then 'app'
    when 'status'   then 'status'
    when 'day'      then $$to_char((created_at at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')$$
    when 'actor'    then $$coalesce(actor_type || ':' || actor_id, '(none)')$$
    else null end;
  if v_expr is null then raise exception 'llm_usage_summary: invalid group %', p_group; end if;
  return query execute format($q$
    select %1$s::text as grp,
           count(*)::bigint,
           (count(*) filter (where status <> 'ok'))::bigint,
           coalesce(sum(input_tokens), 0)::bigint,
           coalesce(sum(output_tokens), 0)::bigint,
           coalesce(sum(cache_read_tokens), 0)::bigint,
           coalesce(sum(cache_write_tokens), 0)::bigint,
           coalesce(sum(est_cost_usd), 0)::numeric,
           (count(*) filter (where cost_basis = 'unpriced'))::bigint,
           round(avg(latency_ms)::numeric, 0),
           round((percentile_cont(0.95) within group (order by latency_ms))::numeric, 0)
      from public.llm_usage_log
     where created_at >= $1 and created_at < $2
       and ($3::text is null or provider = $3)
       and ($4::text is null or feature  = $4)
       and ($5::text is null or app      = $5)
       and ($6 or coalesce(vercel_env, 'production') = 'production')
     group by 1
     order by coalesce(sum(est_cost_usd), 0) desc, count(*) desc
  $q$, v_expr) using p_from, p_to, p_provider, p_feature, p_app, p_include_preview;
end;
$fn$;

create or replace function public.llm_usage_timeseries(
  p_from timestamptz, p_to timestamptz, p_bucket text default 'day', p_provider text default null,
  p_include_preview boolean default false)
returns table(bucket text, provider text, calls bigint, errors bigint, input_tokens bigint,
              output_tokens bigint, cost_usd numeric)
language plpgsql stable
set search_path = public, pg_temp
as $fn$
declare v_expr text;
begin
  v_expr := case p_bucket
    when 'day'  then $$to_char((created_at at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')$$
    when 'hour' then $$to_char(date_trunc('hour', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD HH24:00')$$
    else null end;
  if v_expr is null then raise exception 'llm_usage_timeseries: invalid bucket %', p_bucket; end if;
  return query execute format($q$
    select %1$s::text as bucket, provider::text,
           count(*)::bigint,
           (count(*) filter (where status <> 'ok'))::bigint,
           coalesce(sum(input_tokens), 0)::bigint,
           coalesce(sum(output_tokens), 0)::bigint,
           coalesce(sum(est_cost_usd), 0)::numeric
      from public.llm_usage_log
     where created_at >= $1 and created_at < $2
       and ($3::text is null or provider = $3)
       and ($4 or coalesce(vercel_env, 'production') = 'production')
     group by 1, 2
     order by 1, 2
  $q$, v_expr) using p_from, p_to, p_provider, p_include_preview;
end;
$fn$;

-- ── lock everything down ───────────────────────────────────────────────────────────────────────
do $lock$
declare t text;
begin
  foreach t in array array['llm_provider_settings','llm_usage_log','llm_balance_history','llm_model_prices','llm_provider_usage_daily'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end
$lock$;
revoke all on function public.llm_usage_summary(timestamptz, timestamptz, text, text, text, text, boolean)    from public, anon, authenticated;
revoke all on function public.llm_usage_timeseries(timestamptz, timestamptz, text, text, boolean)             from public, anon, authenticated;
grant execute on function public.llm_usage_summary(timestamptz, timestamptz, text, text, text, text, boolean) to service_role;
grant execute on function public.llm_usage_timeseries(timestamptz, timestamptz, text, text, boolean)          to service_role;

-- ── provider settings seed (thresholds in the provider's own currency; admin-editable on the page) ──
insert into public.llm_provider_settings (provider, label, sort_order, currency, fx_per_usd, low_threshold, alert_enabled, usd_per_credit, region, notes) values
  ('anthropic', 'Anthropic (Claude)',  10, 'USD', 1, 50, true,  null,  null,     'Primary spend: Ask Ana, Anaant, Ask Ari, Assistant Professor, evals.'),
  ('openai',    'OpenAI',              20, 'USD', 1, 30, true,  null,  null,     'Anaant GPT-4o option, RAG embeddings, gpt-image-1.'),
  ('xai',       'xAI (Grok)',          30, 'USD', 1, 20, true,  null,  null,     'Anaant Grok option.'),
  ('deepseek',  'DeepSeek',            40, 'USD', 1, 10, true,  null,  null,     'Anaant DeepSeek option.'),
  ('gemini',    'Google Gemini API',   50, 'USD', 1, 20, true,  null,  null,     'No billing API: balance is entered by hand from AI Studio; usage comes from our own call log.'),
  ('qwen',      'Qwen (Alibaba Cloud)',60, 'USD', 1, 10, true,  null,  'intl',   'Post-paid on the whole Alibaba Cloud account; live balance needs an AccessKey, not the DashScope key.'),
  ('kimi',      'Kimi (Moonshot)',     70, 'USD', 1, 10, true,  null,  'global', 'Live balance from the ordinary API key. Region global=USD, cn=CNY.'),
  ('mistral',   'Mistral',             80, 'USD', 1, 10, true,  null,  null,     'No public balance API: balance entered by hand; usage from our own call log.'),
  ('codestral', 'Codestral',           90, 'USD', 1, null, false, null, null,    'Plan-based (codestral.mistral.ai key) or ordinary Mistral pay-per-token; no balance API.'),
  ('tavily',    'Tavily (web search)', 100,'USD', 1, 5,  true,  0.008, null,    'Credits, not an LLM: Anaant web_search tool.')
on conflict (provider) do nothing;

-- ── price seed: READ FROM OFFICIAL PRICING PAGES ON 2026-10-02 (USD per million tokens) — editable on the page.
-- Cache-write = the 5-minute write price where a provider distinguishes. Rows flagged ASSUMED must be verified.
insert into public.llm_model_prices (provider, model, match_kind, input_per_mtok_usd, output_per_mtok_usd, cache_read_per_mtok_usd, cache_write_per_mtok_usd, notes, source_url, effective_from, created_by)
select v.provider, v.model, v.match_kind, v.i, v.o, v.cr, v.cw, v.notes, v.src, timestamptz '2026-10-02 00:00:00+00', 'seed 2026-10-02'
  from (values
  ('anthropic', 'claude-fable-5-1', 'prefix', 10, 50, 0.25, 12.5, 'Fable 5.1; cache read is 0.025x base', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-opus-5-5', 'prefix', 4, 20, 0.2, 5, 'Opus 5.5', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-sonnet-5-5', 'prefix', 2, 10, 0.2, 2.5, 'Sonnet 5.5', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-haiku-4-5', 'prefix', 1, 5, 0.1, 1.25, 'Haiku 4.5 (alias claude-haiku-4-5-20251001); retirement not sooner than 2026-10-15', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-opus-4-8', 'prefix', 5, 25, 0.5, 6.25, 'Opus 4.8 (Anaant Claude option, study guides)', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-sonnet-4-6', 'prefix', 3, 15, 0.3, 3.75, 'Sonnet 4.6 (legacy tokenizer)', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-sonnet-4-5', 'prefix', 3, 15, 0.3, 3.75, 'ASSUMED = Sonnet 4.x list price; NOT on the 2026-10-02 pricing page — verify (used by Ask Ari/Ana/Professor)', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-opus-4-7', 'prefix', 5, 25, 0.5, 6.25, 'ASSUMED = Opus 4.8 price — verify (used by the LinkedIn composer)', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-opus-5', 'prefix', 5, 25, 0.5, 6.25, 'Opus 5 legacy', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-sonnet-5', 'prefix', 2, 10, 0.2, 2.5, 'Sonnet 5 legacy', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('anthropic', 'claude-fable-5', 'prefix', 10, 50, 1, 12.5, 'Fable 5 legacy (cache read 0.1x)', 'https://platform.claude.com/docs/en/about-claude/pricing'),
  ('openai', 'gpt-4o', 'prefix', 2.5, 10, 1.25, null, 'gpt-4o (Anaant GPT-4o option)', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-4o-mini', 'prefix', 0.15, 0.6, 0.075, null, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'text-embedding-3-small', 'exact', 0.02, null, null, null, 'embeddings (RAG)', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'text-embedding-3-large', 'exact', 0.13, null, null, null, 'embeddings', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-6-astra', 'prefix', 10, 50, 1, 12.5, 'flagship (>272K input costs more)', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-6.1-sol', 'prefix', 2, 10, 0.1, 2.5, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-6-sol', 'prefix', 2, 10, 0.2, 2.5, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-6-luna', 'prefix', 0.1, 0.5, 0.01, 0.125, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-5.6-sol', 'prefix', 4, 20, 0.4, null, 'promotional price', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-5.6-terra', 'prefix', 2, 12, 0.2, 2.5, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-5.6-luna', 'prefix', 0.2, 1.2, 0.02, 0.25, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-5.5', 'prefix', 5, 30, 0.5, null, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-5.4', 'prefix', 2.5, 15, 0.25, null, '', 'https://platform.openai.com/docs/pricing'),
  ('openai', 'gpt-4.1', 'prefix', 2, 8, 0.5, null, '', 'https://platform.openai.com/docs/pricing'),
  ('xai', 'grok-4.7', 'prefix', 2, 6, 0.5, null, '<200k prompt; >=200k doubles input/output', 'https://docs.x.ai/developers/models'),
  ('xai', 'grok-4.6', 'prefix', 2, 6, 0.5, null, '<200k prompt', 'https://docs.x.ai/developers/models'),
  ('xai', 'grok-4.5', 'prefix', 2, 6, 0.3, null, '<200k prompt', 'https://docs.x.ai/developers/models'),
  ('xai', 'grok-4.3', 'prefix', 1.25, 2.5, 0.2, null, '<200k prompt', 'https://docs.x.ai/developers/models'),
  ('xai', 'grok-4.20', 'prefix', 1.25, 2.5, 0.2, null, '', 'https://docs.x.ai/developers/models'),
  ('xai', 'grok-build-0.1', 'prefix', 1, 2, 0.2, null, '', 'https://docs.x.ai/developers/models'),
  ('deepseek', 'deepseek-flash', 'prefix', 0.3, 1.2, 0.006, null, 'PEAK rates (cache-miss input); off-peak is half', 'https://api-docs.deepseek.com/quick_start/pricing'),
  ('deepseek', 'deepseek-v4-pro', 'prefix', 1.32, 3.96, 0.044, null, 'PEAK rates; off-peak is half', 'https://api-docs.deepseek.com/quick_start/pricing'),
  ('gemini', 'gemini-3.8-flash', 'prefix', 0.75, 3.75, 0.075, null, 'doubles on 2027-01-01', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.7-flash', 'prefix', 0.75, 3.75, 0.075, null, 'doubles on 2027-01-01', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.6-flash', 'prefix', 0.75, 3.75, 0.075, null, 'doubles on 2027-01-01', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.5-flash-lite', 'prefix', 0.3, 2.5, 0.03, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.5-flash', 'prefix', 1.5, 9, 0.15, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.1-flash-lite', 'prefix', 0.25, 1.5, 0.025, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3.1-pro', 'prefix', 2, 12, 0.2, null, '<=200k prompt; >200k: 4.00/18.00', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-3-flash', 'prefix', 0.5, 3, 0.05, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-2.5-pro', 'prefix', 1.25, 10, 0.125, null, '<=200k prompt; >200k: 2.50/15.00', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-2.5-flash-lite', 'prefix', 0.1, 0.4, 0.01, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-2.5-flash', 'prefix', 0.3, 2.5, 0.03, null, '', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('gemini', 'gemini-embedding-2', 'prefix', 0.2, null, null, null, 'text input', 'https://ai.google.dev/gemini-api/docs/pricing'),
  ('qwen', 'qwen3.8-max', 'prefix', 2, 6, null, null, 'intl USD', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3-max', 'prefix', 1.2, 6, null, null, 'intl USD, 0-32K tier (32K-128K: 2.4/12 ...)', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen-max', 'prefix', 1.6, 6.4, null, null, 'intl USD', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3.7-plus', 'prefix', 0.4, 1.6, null, null, 'intl USD, 0-256K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3.6-plus', 'prefix', 0.5, 3, null, null, 'intl USD, 0-256K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3.5-plus', 'prefix', 0.4, 2.4, null, null, 'intl USD, 0-256K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen-plus', 'prefix', 0.4, 1.2, null, null, 'intl USD non-thinking, 0-256K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3.8-flash', 'prefix', 0.15, 0.47, null, null, 'intl USD', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3.5-flash', 'prefix', 0.1, 0.4, null, null, 'intl USD', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen-flash', 'prefix', 0.05, 0.4, null, null, 'intl USD, 0-256K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen-turbo', 'prefix', 0.05, 0.2, null, null, 'intl USD non-thinking', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3-coder-plus', 'prefix', 1, 5, null, null, 'intl USD, 0-32K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('qwen', 'qwen3-coder-flash', 'prefix', 0.3, 1.5, null, null, 'intl USD, 0-32K tier', 'https://www.alibabacloud.com/help/en/model-studio/model-pricing'),
  ('kimi', 'kimi-k3', 'prefix', 3, 15, 0.3, null, 'global USD', 'https://platform.kimi.ai/docs/pricing'),
  ('kimi', 'kimi-k2.7-code-highspeed', 'prefix', 1.9, 8, 0.38, null, 'global USD', 'https://platform.kimi.ai/docs/pricing'),
  ('kimi', 'kimi-k2.7-code', 'prefix', 0.95, 4, 0.19, null, 'global USD', 'https://platform.kimi.ai/docs/pricing'),
  ('kimi', 'kimi-k2.6', 'prefix', 0.95, 4, 0.16, null, 'global USD', 'https://platform.kimi.ai/docs/pricing'),
  ('mistral', 'mistral-medium', 'prefix', 1.5, 7.5, null, null, 'Medium 3.5', 'https://mistral.ai/pricing'),
  ('mistral', 'mistral-small', 'prefix', 0.15, 0.6, null, null, 'Small (2603)', 'https://mistral.ai/pricing'),
  ('mistral', 'mistral-large', 'prefix', 0.5, 1.5, null, null, 'Large (2512)', 'https://mistral.ai/pricing'),
  ('mistral', 'ministral-14b', 'prefix', 0.2, 0.2, null, null, '', 'https://mistral.ai/pricing'),
  ('mistral', 'ministral-8b', 'prefix', 0.15, 0.15, null, null, '', 'https://mistral.ai/pricing'),
  ('mistral', 'ministral-3b', 'prefix', 0.1, 0.1, null, null, '', 'https://mistral.ai/pricing'),
  ('mistral', 'mistral-embed', 'prefix', 0.1, null, null, null, 'embeddings', 'https://mistral.ai/pricing'),
  ('codestral', 'codestral-embed', 'prefix', 0.15, null, null, null, 'embeddings', 'https://mistral.ai/pricing'),
  ('codestral', 'codestral', 'prefix', 0.3, 0.9, null, null, 'pay-per-token route via api.mistral.ai; the codestral.mistral.ai plan key is not per-token', 'https://mistral.ai/pricing')
  ) as v(provider, model, match_kind, i, o, cr, cw, notes, src)
 where not exists (select 1 from public.llm_model_prices p where p.provider = v.provider and p.model = v.model);

-- Per-unit prices (Tavily search credits). Cost = credits x per_unit_usd.
insert into public.llm_model_prices (provider, model, match_kind, per_unit_usd, unit_kind, notes, source_url, effective_from, created_by)
select 'tavily', 'search', 'prefix', 0.008, 'credit', 'pay-as-you-go ~$0.008/credit; basic search = 1 credit, advanced = 2', 'https://docs.tavily.com/documentation/api-credits', timestamptz '2026-10-02 00:00:00+00', 'seed 2026-10-02'
 where not exists (select 1 from public.llm_model_prices where provider = 'tavily' and model = 'search');

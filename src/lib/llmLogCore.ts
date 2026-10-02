/* eslint-disable @typescript-eslint/no-explicit-any -- provider usage payloads and thrown SDK errors are untyped JSON; every read goes through num()/str() */
// LLM call log — the PURE half (www copy). The DB half is src/lib/llmLog.ts; the partner repo keeps its own
// copy of this logic in lib/llm/ (do not import across repos). Every row lands in the shared llm_usage_log table
// and powers partner.ostaran.com/admin/llm-balances (usage, logs, cost).
//
// This file deliberately has NO imports (no `@/` aliases, no Next, no Supabase) so `node --test` can load it
// directly (supabase/tests/llm-log/). The Supabase client / fetch are passed in as parameters.
//
// Hard rules: logging must NEVER throw into a request, NEVER block for more than ~2s, and NEVER store prompts,
// completions, emails, phone numbers or credentials.

export const LLM_APP = 'www' as const

export type LlmProviderKey =
  | 'anthropic' | 'openai' | 'xai' | 'deepseek' | 'gemini' | 'qwen' | 'kimi' | 'mistral' | 'codestral' | 'tavily'

/** Token usage NORMALISED so that input_tokens EXCLUDES cached tokens (cache columns are separate). */
export interface LlmUsageInput {
  input_tokens?: number | null
  output_tokens?: number | null         // includes reasoning / thinking tokens
  cache_read_tokens?: number | null
  cache_write_tokens?: number | null
  reasoning_tokens?: number | null
  units?: number | null                 // images / search credits / characters
  unit_kind?: string | null
  cost_usd_reported?: number | null     // when the provider itself reports a cost (xAI cost_in_usd_ticks / 1e10)
}

export interface LlmCallLog {
  app?: 'www' | 'partner' | 'edge' | 'script'   // defaults to LLM_APP
  feature: string                       // stable slug: ask_ari, assistant_professor, agent_eval, ...
  provider: LlmProviderKey
  model: string                         // the model id the provider RETURNED when available, else the one requested
  call_kind?: 'chat' | 'embedding' | 'image' | 'search' | 'other'
  stream?: boolean
  usage?: LlmUsageInput
  latency_ms?: number
  ttft_ms?: number
  status?: 'ok' | 'error' | 'timeout' | 'aborted' | 'rate_limited'
  http_status?: number
  error_code?: string
  error_message?: string                // truncated to 500; NEVER prompts, keys, or user text
  request_id?: string
  actor_type?: 'partner' | 'student' | 'visitor' | 'admin' | 'system'
  actor_id?: string                     // internal id / session id only — NO email, NO phone
  conversation_ref?: string
  iterations?: number
  key_label?: string
  meta?: Record<string, unknown>
}

export interface PriceTier { min_input_tokens: number; input?: number; output?: number; cache_read?: number; cache_write?: number }

/** The subset of an llm_model_prices row the logger needs. */
export interface PriceRow {
  id: string
  provider: string
  model: string
  match_kind: 'exact' | 'prefix'
  input_per_mtok_usd: number | null
  output_per_mtok_usd: number | null
  cache_read_per_mtok_usd: number | null
  cache_write_per_mtok_usd: number | null
  per_unit_usd: number | null
  unit_kind: string | null
  tiers: PriceTier[] | null
  effective_from: string
  effective_to: string | null
}

/** One llm_usage_log insert (columns exactly as in the table; id/created_at default in the DB). */
export interface LlmUsageRow {
  app: string
  vercel_env: string | null
  feature: string
  provider: string
  model: string
  call_kind: string
  stream: boolean | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number
  cache_write_tokens: number
  reasoning_tokens: number | null
  units: number | null
  unit_kind: string | null
  est_cost_usd: number | null
  cost_basis: 'computed' | 'provider_reported' | 'unpriced' | null
  price_id: string | null
  latency_ms: number | null
  ttft_ms: number | null
  status: string
  http_status: number | null
  error_code: string | null
  error_message: string | null
  request_id: string | null
  actor_type: string | null
  actor_id: string | null
  conversation_ref: string | null
  iterations: number | null
  key_label: string | null
  meta: Record<string, unknown>
}

// ── small helpers ──────────────────────────────────────────────────────────────────────────────────

/** A finite number from a number or numeric string, else null (PostgREST can hand numerics back as either). */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
const nz = (v: unknown): number => num(v) ?? 0

/** Non-negative integer (for integer / smallint columns) or null. */
function toInt(v: unknown, max = 2147483647): number | null {
  const n = num(v)
  if (n == null || n < 0) return null
  return Math.min(Math.round(n), max)
}

const round10 = (x: number) => Math.round(x * 1e10) / 1e10

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}

// ── scrubbing (error text, meta strings) ──────────────────────────────────────────────────────────

/**
 * Strip anything that looks like a credential or personal contact detail. Applied to the FULL string before it is
 * truncated, so cutting a key in half can never leave a usable prefix behind.
 */
export function scrubSecrets(input: unknown): string {
  let s = typeof input === 'string' ? input : input == null ? '' : String(input)
  if (s.length > 8000) s = s.slice(0, 8000)
  return s
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{6,}/gi, 'Bearer [redacted]')
    .replace(/\b(?:sk|xai|gsk|pk|rk)-[A-Za-z0-9_-]{6,}/g, '[redacted-key]')
    .replace(/\b(api[_-]?key|x-api-key|apikey|key|secret|password|authorization)(\s*[=:]\s*)["']?[^\s"',;&]+/gi, '$1$2[redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?<![\w-])\+?\d[\d\s().-]{8,}\d(?![\w-])/g, '[phone]')
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s
}

/** scrub → truncate. This is what lands in error_message (max 500 chars). */
export function safeErrorMessage(input: unknown, max = 500): string | null {
  const s = scrubSecrets(input).trim()
  return s ? truncate(s, max) : null
}

/** meta must be small, JSON-safe, and free of secrets/contacts. Over 4 KB it is replaced by a marker. */
export function sanitizeMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {}
  try {
    const clean = JSON.parse(JSON.stringify(meta, (_k, v) => {
      if (typeof v === 'string') return truncate(scrubSecrets(v), 300)
      if (typeof v === 'bigint') return Number(v)
      return v
    })) as Record<string, unknown>
    return JSON.stringify(clean).length > 4000 ? { truncated: true } : clean
  } catch {
    return {}
  }
}

const looksLikeEmail = (s: string) => /@/.test(s)

// ── pricing ───────────────────────────────────────────────────────────────────────────────────────

/** Normalise raw llm_model_prices rows (numerics may arrive as strings) and keep those effective at `nowMs`. */
export function normalisePriceRows(raw: unknown, nowMs: number): PriceRow[] {
  if (!Array.isArray(raw)) return []
  const out: PriceRow[] = []
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue
    const provider = str(r.provider, 40)
    const model = str(r.model, 200)
    if (!provider || !model) continue
    const from = r.effective_from ? Date.parse(String(r.effective_from)) : 0
    const to = r.effective_to ? Date.parse(String(r.effective_to)) : Infinity
    if (Number.isNaN(from) || Number.isNaN(to)) continue
    if (!(from <= nowMs && nowMs < to)) continue

    let tiers: PriceTier[] | null = null
    let rawTiers: unknown = r.tiers
    if (typeof rawTiers === 'string') { try { rawTiers = JSON.parse(rawTiers) } catch { rawTiers = null } }
    if (Array.isArray(rawTiers)) {
      tiers = (rawTiers as Record<string, unknown>[])
        .map(t => {
          const min = num(t?.min_input_tokens)
          if (min == null) return null
          const tier: PriceTier = { min_input_tokens: min }
          for (const k of ['input', 'output', 'cache_read', 'cache_write'] as const) {
            const v = num(t[k])
            if (v != null) tier[k] = v
          }
          return tier
        })
        .filter((t): t is PriceTier => t !== null)
        .sort((a, b) => a.min_input_tokens - b.min_input_tokens)
      if (!tiers.length) tiers = null
    }

    out.push({
      id: String(r.id ?? ''),
      provider,
      model,
      match_kind: r.match_kind === 'prefix' ? 'prefix' : 'exact',
      input_per_mtok_usd: num(r.input_per_mtok_usd),
      output_per_mtok_usd: num(r.output_per_mtok_usd),
      cache_read_per_mtok_usd: num(r.cache_read_per_mtok_usd),
      cache_write_per_mtok_usd: num(r.cache_write_per_mtok_usd),
      per_unit_usd: num(r.per_unit_usd),
      unit_kind: typeof r.unit_kind === 'string' ? r.unit_kind : null,
      tiers,
      effective_from: String(r.effective_from ?? ''),
      effective_to: r.effective_to ? String(r.effective_to) : null,
    })
  }
  return out
}

/**
 * Exact match first; otherwise the LONGEST `prefix` row whose model the requested model string starts with
 * (so `claude-sonnet-4-5-20250929` finds `claude-sonnet-4-5`, and `claude-sonnet-5-5` prefers `claude-sonnet-5-5`
 * over `claude-sonnet-5`). Case-insensitive; scoped to the provider; a tie goes to the most recent effective_from.
 */
export function findPrice(table: PriceRow[], provider: string, model: string): PriceRow | null {
  const p = (provider || '').toLowerCase()
  const m = (model || '').toLowerCase()
  if (!p || !m) return null
  let exact: PriceRow | null = null
  let prefix: PriceRow | null = null
  const newer = (a: PriceRow, b: PriceRow | null) => !b || Date.parse(a.effective_from) > Date.parse(b.effective_from)
  for (const row of table) {
    if (row.provider.toLowerCase() !== p) continue
    const rm = row.model.toLowerCase()
    if (row.match_kind === 'exact') {
      if (rm === m && newer(row, exact)) exact = row
    } else if (rm && m.startsWith(rm)) {
      if (!prefix || rm.length > prefix.model.length || (rm.length === prefix.model.length && newer(row, prefix))) prefix = row
    }
  }
  return exact ?? prefix
}

/**
 * USD cost of one call from a list-price row. `cost_usd_reported` (the provider's own number) always wins.
 *   tokens: (input×in + cache_read×(cr ?? in) + cache_write×(cw ?? in) + output×out) / 1e6
 *   tiers : the tier with the largest min_input_tokens ≤ (input + cache_read + cache_write) overrides the prices
 *   units : units × per_unit_usd
 * A component that is needed (tokens > 0) but has no price makes the whole call 'unpriced' — we never silently
 * under-report. Embedding models have no output price and no output tokens, so they price fine.
 */
export function computeCost(
  price: PriceRow,
  u: LlmUsageInput,
): { cost_usd: number | null; basis: 'computed' | 'unpriced' | 'provider_reported' } {
  const reported = num(u.cost_usd_reported)
  if (reported != null && reported >= 0) return { cost_usd: round10(reported), basis: 'provider_reported' }

  const input = nz(u.input_tokens)
  const output = nz(u.output_tokens)
  const cr = nz(u.cache_read_tokens)
  const cw = nz(u.cache_write_tokens)

  let pIn = price.input_per_mtok_usd
  let pOut = price.output_per_mtok_usd
  let pCr = price.cache_read_per_mtok_usd
  let pCw = price.cache_write_per_mtok_usd
  if (price.tiers?.length) {
    const basis = input + cr + cw
    let tier: PriceTier | null = null
    for (const t of price.tiers) if (t.min_input_tokens <= basis && (!tier || t.min_input_tokens > tier.min_input_tokens)) tier = t
    if (tier) {
      pIn = tier.input ?? pIn
      pOut = tier.output ?? pOut
      pCr = tier.cache_read ?? pCr
      pCw = tier.cache_write ?? pCw
    }
  }
  // null cache price ⇒ bill the cached tokens at the plain input price
  const effCr = pCr ?? pIn
  const effCw = pCw ?? pIn

  let cost = 0
  let priced = false
  let missing = false

  const hasTokenFields = [u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_write_tokens].some(v => num(v) != null)
  if (hasTokenFields) {
    const parts: [number, number | null][] = [[input, pIn], [cr, effCr], [cw, effCw], [output, pOut]]
    for (const [count, p] of parts) {
      if (count > 0) {
        if (p == null) missing = true
        else { cost += (count * p) / 1e6; priced = true }
      }
    }
    // zero-token usage on a token-priced model is a legitimate $0 (e.g. a refused call)
    if (!priced && !missing && (pIn != null || pOut != null)) priced = true
  }

  const units = num(u.units)
  if (units != null && price.per_unit_usd != null) {
    cost += units * price.per_unit_usd
    priced = true
  }

  if (!priced || missing) return { cost_usd: null, basis: 'unpriced' }
  return { cost_usd: round10(cost), basis: 'computed' }
}

// ── usage normalisers (each returns input EXCLUDING cached tokens) ────────────────────────────────────

/** Anthropic Messages `usage` (non-streaming response, or message_delta's cumulative usage). */
export function usageFromAnthropic(u: unknown): LlmUsageInput {
  if (!u || typeof u !== 'object') return {}
  const x = u as Record<string, any>
  const cc = x.cache_creation
  const ccSum = cc && typeof cc === 'object' ? nz(cc.ephemeral_5m_input_tokens) + nz(cc.ephemeral_1h_input_tokens) : null
  const out: LlmUsageInput = {
    input_tokens: num(x.input_tokens),                       // already EXCLUDES cache reads/writes
    output_tokens: num(x.output_tokens),                     // inclusive of thinking tokens
    cache_read_tokens: num(x.cache_read_input_tokens) ?? 0,
    cache_write_tokens: num(x.cache_creation_input_tokens) ?? ccSum ?? 0,
    reasoning_tokens: num(x.output_tokens_details?.thinking_tokens),
  }
  const searches = num(x.server_tool_use?.web_search_requests)
  if (searches) { out.units = searches; out.unit_kind = 'web_search' }
  return out
}

/**
 * OpenAI Chat Completions / Responses `usage` and every OpenAI-compatible API (xAI, DeepSeek, Qwen, Kimi, Mistral).
 * prompt_tokens INCLUDES cached tokens: cache_read = prompt_tokens_details.cached_tokens (DeepSeek:
 * prompt_cache_hit_tokens), input = the remainder (DeepSeek: prompt_cache_miss_tokens). xAI reports its own billed
 * amount as cost_in_usd_ticks (1 USD = 1e10 ticks) — that wins over any recomputation.
 */
export function usageFromOpenAICompat(u: unknown, provider: string = 'openai'): LlmUsageInput {
  if (!u || typeof u !== 'object') return {}
  const x = u as Record<string, any>
  const prompt = num(x.prompt_tokens) ?? num(x.input_tokens)          // chat vs responses naming
  const completion = num(x.completion_tokens) ?? num(x.output_tokens)
  const details = x.prompt_tokens_details ?? x.input_tokens_details ?? {}
  const outDetails = x.completion_tokens_details ?? x.output_tokens_details ?? {}

  let cacheRead: number
  let input: number | null
  let cacheWrite = nz(details.cache_write_tokens) + nz(details.cache_creation_input_tokens)
  if (provider === 'deepseek' && (num(x.prompt_cache_hit_tokens) != null || num(x.prompt_cache_miss_tokens) != null)) {
    cacheRead = nz(x.prompt_cache_hit_tokens)
    input = num(x.prompt_cache_miss_tokens) ?? (prompt != null ? Math.max(0, prompt - cacheRead) : null)
    cacheWrite = 0
  } else {
    cacheRead = nz(details.cached_tokens)
    input = prompt != null ? Math.max(0, prompt - cacheRead - cacheWrite) : null
  }

  const out: LlmUsageInput = {
    input_tokens: input,
    output_tokens: completion,
    cache_read_tokens: cacheRead,
    cache_write_tokens: cacheWrite,
    reasoning_tokens: num(outDetails.reasoning_tokens),
  }
  const ticks = num(x.cost_in_usd_ticks)
  if (provider === 'xai' && ticks != null && ticks >= 0) out.cost_usd_reported = ticks / 1e10
  return out
}

/** Gemini `usageMetadata` (REST camelCase): promptTokenCount is the TOTAL prompt incl. cached; thinking bills as output. */
export function usageFromGemini(m: unknown): LlmUsageInput {
  if (!m || typeof m !== 'object') return {}
  const x = m as Record<string, any>
  const prompt = num(x.promptTokenCount)
  const cached = nz(x.cachedContentTokenCount)
  const thoughts = num(x.thoughtsTokenCount)
  const cand = num(x.candidatesTokenCount)
  return {
    input_tokens: prompt != null ? Math.max(0, prompt - cached) : null,
    output_tokens: cand != null || thoughts != null ? nz(cand) + nz(thoughts) : null,
    cache_read_tokens: cached,
    cache_write_tokens: 0,
    reasoning_tokens: thoughts,
  }
}

/** Embeddings `usage`: { prompt_tokens, total_tokens } — an embedding call is all input. */
export function usageFromEmbedding(u: unknown): LlmUsageInput {
  if (!u || typeof u !== 'object') return {}
  const x = u as Record<string, any>
  return { input_tokens: num(x.prompt_tokens) ?? num(x.total_tokens) }
}

export function classifyHttpStatus(status: number): 'ok' | 'rate_limited' | 'error' {
  if (status === 429) return 'rate_limited'
  if (status >= 200 && status < 400) return 'ok'
  return 'error'
}

// ── error description ─────────────────────────────────────────────────────────────────────────────

export interface ErrorInfo {
  status: 'error' | 'timeout' | 'aborted' | 'rate_limited'
  http_status?: number
  error_code?: string
  error_message?: string
  request_id?: string
}

/** Turn whatever a provider SDK / fetch threw into the status + code + (scrubbed, truncated) message we log. */
export function describeError(err: unknown): ErrorInfo {
  const e = (err ?? {}) as Record<string, any>
  // The Anthropic SDK leaves `name` as plain 'Error' on its subclasses (APIUserAbortError, APIConnectionTimeoutError…),
  // so fall back to the constructor's name — and, for minified bundles, to the SDK's fixed default messages below.
  const rawName = typeof e.name === 'string' ? e.name : ''
  const ctorName = typeof e.constructor?.name === 'string' ? e.constructor.name : ''
  const name = rawName && rawName !== 'Error' ? rawName : /^[A-Z]\w*(Error|Exception)$/.test(ctorName) && ctorName !== 'Error' ? ctorName : rawName
  const code = typeof e.code === 'string' ? e.code : ''
  const message = typeof e.message === 'string' ? e.message : typeof err === 'string' ? err : ''
  const http = Number.isInteger(e.status) && e.status >= 100 && e.status <= 599 ? (e.status as number) : undefined

  // Anthropic nests {type:'error', error:{type, message}}; OpenAI-style bodies use {error:{type|code, message}}
  const bodyCode = e.error?.error?.type ?? e.error?.type ?? e.error?.code
  const error_code =
    str(bodyCode, 80) ?? str(code, 80) ?? (name && name !== 'Error' ? str(name, 80) ?? undefined : undefined) ?? undefined

  let status: ErrorInfo['status'] = 'error'
  if (name === 'APIUserAbortError' || name === 'AbortError' || code === 'ABORT_ERR' || (http == null && /^request was aborted/i.test(message))) status = 'aborted'
  else if (name === 'APIConnectionTimeoutError' || name === 'TimeoutError' || code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT'
    || (http == null && /timed?[ -]?out/i.test(message))) status = 'timeout'
  else if (http === 429) status = 'rate_limited'

  const info: ErrorInfo = { status }
  if (http != null) info.http_status = http
  if (error_code) info.error_code = error_code
  const msg = safeErrorMessage(message || bodyMessage(e.error))
  if (msg) info.error_message = msg
  const rid = str(e.requestID, 100) ?? str(e.request_id, 100)
  if (rid) info.request_id = rid
  return info
}

function bodyMessage(body: unknown): string {
  const b = body as Record<string, any> | null
  if (!b || typeof b !== 'object') return ''
  return typeof b.error?.message === 'string' ? b.error.message : typeof b.message === 'string' ? b.message : ''
}

/** From a non-2xx HTTP response we read ourselves (raw fetch): status + best-effort parse of the JSON error body. */
export function describeHttpFailure(status: number, bodyText: string): ErrorInfo {
  let type: string | undefined
  let message = bodyText
  try {
    const j = JSON.parse(bodyText)
    const t = j?.error?.type ?? j?.error?.code ?? j?.type
    if (typeof t === 'string') type = t
    const m = j?.error?.message ?? j?.message
    if (typeof m === 'string') message = m
  } catch { /* not JSON — keep the raw text */ }
  const info: ErrorInfo = { status: classifyHttpStatus(status) === 'rate_limited' ? 'rate_limited' : 'error', http_status: status }
  const code = str(type, 80)
  if (code) info.error_code = code
  const msg = safeErrorMessage(message)
  if (msg) info.error_message = msg
  return info
}

// ── building the row ──────────────────────────────────────────────────────────────────────────────

const STATUSES = new Set(['ok', 'error', 'timeout', 'aborted', 'rate_limited'])
const CALL_KINDS = new Set(['chat', 'embedding', 'image', 'search', 'other'])
const ACTOR_TYPES = new Set(['partner', 'student', 'visitor', 'admin', 'system'])

function hasAnyUsage(u: LlmUsageInput | undefined): u is LlmUsageInput {
  if (!u) return false
  return [u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_write_tokens, u.units, u.cost_usd_reported].some(v => num(v) != null)
}

/**
 * Build the llm_usage_log row. `price`: the matched price row, null when the table was loaded but has none for
 * this model, undefined when the table could not be loaded at all (cost left empty rather than mis-flagged unpriced).
 */
export function buildUsageRow(rec: LlmCallLog, price: PriceRow | null | undefined, vercelEnv: string | null): LlmUsageRow {
  const u = rec.usage

  let est: number | null = null
  let basis: LlmUsageRow['cost_basis'] = null
  let priceId: string | null = null
  if (hasAnyUsage(u)) {
    const reported = num(u.cost_usd_reported)
    if (reported != null && reported >= 0) {
      est = round10(reported); basis = 'provider_reported'; priceId = price?.id || null
    } else if (price) {
      const c = computeCost(price, u)
      est = c.cost_usd; basis = c.basis
      priceId = c.basis === 'computed' ? price.id || null : null
    } else if (price === null) {
      basis = 'unpriced'
    }
  }

  const httpRaw = toInt(rec.http_status)
  const http = httpRaw != null && httpRaw >= 100 && httpRaw <= 599 ? httpRaw : null   // anything else is not an HTTP status
  let status = rec.status && STATUSES.has(rec.status) ? rec.status : undefined
  if (!status) status = http != null && http >= 400 ? classifyHttpStatus(http) : rec.error_message || rec.error_code ? 'error' : 'ok'

  const actorId = str(rec.actor_id, 120)
  const convRef = str(rec.conversation_ref, 120)

  return {
    app: rec.app ?? LLM_APP,
    vercel_env: vercelEnv,
    feature: str(rec.feature, 80) ?? 'unknown',
    provider: str(rec.provider, 40) ?? 'unknown',
    model: str(rec.model, 200) ?? 'unknown',
    call_kind: rec.call_kind && CALL_KINDS.has(rec.call_kind) ? rec.call_kind : 'chat',
    stream: typeof rec.stream === 'boolean' ? rec.stream : null,
    input_tokens: toInt(u?.input_tokens),
    output_tokens: toInt(u?.output_tokens),
    cache_read_tokens: toInt(u?.cache_read_tokens) ?? 0,
    cache_write_tokens: toInt(u?.cache_write_tokens) ?? 0,
    reasoning_tokens: toInt(u?.reasoning_tokens),
    units: num(u?.units) != null && (num(u?.units) as number) >= 0 ? (num(u?.units) as number) : null,
    unit_kind: str(u?.unit_kind, 40),
    est_cost_usd: est,
    cost_basis: basis,
    price_id: priceId,
    latency_ms: toInt(rec.latency_ms),
    ttft_ms: toInt(rec.ttft_ms),
    status,
    http_status: http,
    error_code: str(rec.error_code, 80),
    error_message: rec.error_message ? safeErrorMessage(rec.error_message) : null,
    request_id: str(rec.request_id, 100),
    actor_type: rec.actor_type && ACTOR_TYPES.has(rec.actor_type) ? rec.actor_type : null,
    // internal ids only — an email can never be stored as an actor / conversation reference
    actor_id: actorId && !looksLikeEmail(actorId) ? actorId : null,
    conversation_ref: convRef && !looksLikeEmail(convRef) ? convRef : null,
    iterations: toInt(rec.iterations, 32767),
    key_label: str(rec.key_label, 60),
    meta: sanitizeMeta(rec.meta),
  }
}

// ── the logger (injectable) ───────────────────────────────────────────────────────────────────────

export interface LlmLoggerDeps {
  /** Insert one row. May reject or hang — the logger copes with both. */
  insert: (row: LlmUsageRow) => Promise<unknown>
  /** Raw llm_model_prices rows (any effective window — the logger filters). */
  loadPrices: () => Promise<unknown>
  /** Whole-call budget in ms (default 2000). */
  timeoutMs?: number
  /** Price-table cache lifetime in ms (default 5 min). */
  priceTtlMs?: number
  now?: () => number
  isDisabled?: () => boolean
  vercelEnv?: () => string | null
  warn?: (message: string) => void
}

type LogFn = (rec: LlmCallLog) => Promise<void>

/** LLM_LOG_DISABLED kill-switch: '1' or 'true' (any case, trimmed) — the same rule as the partner logger. */
export function killSwitchOn(value: string | undefined | null): boolean {
  const flag = String(value ?? '').trim().toLowerCase()
  return flag === '1' || flag === 'true'
}

/**
 * Which deployment a row came from. Preview deployments share the production DB, so the usage RPCs separate them on
 * this column (null counts as production) — a local `next dev` holding the production key must therefore tag itself.
 * Same rule as the partner logger.
 */
export function vercelEnvOf(env: Record<string, string | undefined>): string | null {
  return env.VERCEL_ENV || (env.NODE_ENV && env.NODE_ENV !== 'production' ? env.NODE_ENV : null) || null
}

/**
 * Build `logLlmCall`: never throws, never waits longer than `timeoutMs`, loads prices at most once per TTL (a
 * single in-flight load is shared), and degrades to "row without a cost" if the price table is unreachable.
 */
export function createLlmLogger(deps: LlmLoggerDeps): LogFn {
  const timeoutMs = deps.timeoutMs ?? 2000
  const ttl = deps.priceTtlMs ?? 5 * 60 * 1000
  const now = deps.now ?? (() => Date.now())
  const isDisabled = deps.isDisabled ?? (() => killSwitchOn(typeof process !== 'undefined' ? process.env?.LLM_LOG_DISABLED : undefined))
  const vercelEnv = deps.vercelEnv ?? (() => vercelEnvOf(typeof process !== 'undefined' ? process.env : {}))
  let lastWarn = 0
  const warn = (m: string) => {
    const t = now()
    if (t - lastWarn < 60_000) return                 // one line a minute is plenty
    lastWarn = t
    try { (deps.warn ?? ((s: string) => console.warn(s)))(`[llmLog] ${safeErrorMessage(m, 200)}`) } catch { /* never */ }
  }

  let cache: { rows: PriceRow[]; at: number } | null = null
  let inflight: Promise<PriceRow[] | undefined> | null = null
  let retryAt = 0   // after a failed load with nothing cached, don't make every call wait for the loader again

  /** Price rows, or undefined if they cannot be loaded right now (and nothing is cached). */
  async function prices(): Promise<PriceRow[] | undefined> {
    const t = now()
    if (cache && t - cache.at < ttl) return cache.rows
    if (inflight) return inflight
    if (!cache && t < retryAt) return undefined
    const priceBudget = Math.max(50, Math.floor(timeoutMs / 2))
    const load = (async (): Promise<PriceRow[] | undefined> => {
      try {
        const raw = await timeoutAfter(deps.loadPrices(), priceBudget)
        if (raw === TIMED_OUT) throw new Error('price table load timed out')
        const rows = normalisePriceRows(raw, now())
        cache = { rows, at: now() }
        return rows
      } catch (e: any) {
        warn(`price table unavailable: ${e?.message ?? e}`)
        // keep serving the stale table if we have one (re-try in ~30s); otherwise log without a cost for ~30s
        if (cache) { cache = { rows: cache.rows, at: now() - ttl + 30_000 }; return cache.rows }
        retryAt = now() + 30_000
        return undefined
      }
    })()
    inflight = load
    try { return await load } finally { inflight = null }
  }

  return async function logLlmCall(rec: LlmCallLog): Promise<void> {
    try {
      if (isDisabled()) return
      const work = (async () => {
        const table = await prices()
        const price = table === undefined ? undefined : findPrice(table, rec.provider, rec.model)
        const row = buildUsageRow(rec, price, vercelEnv())
        await deps.insert(row)
      })()
      const res = await timeoutAfter(work, timeoutMs)
      if (res === TIMED_OUT) warn('insert timed out')
    } catch (e: any) {
      warn(`insert failed: ${e?.message ?? e}`)
    }
  }
}

const TIMED_OUT = Symbol('timed_out')

/** Resolves with the promise's value, or TIMED_OUT after `ms`. A later rejection is swallowed (we already moved on). */
function timeoutAfter<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(TIMED_OUT), ms)
    p.then(
      v => { clearTimeout(t); resolve(v) },
      e => { clearTimeout(t); reject(e) },
    )
  })
}

// ── Supabase glue (client injected) ───────────────────────────────────────────────────────────────

/** Minimal shape of a supabase-js client — only what the logger touches. */
export interface SupabaseLike { from(table: string): any }

export async function insertUsageRow(client: SupabaseLike, row: LlmUsageRow): Promise<void> {
  const res = await client.from('llm_usage_log').insert(row)
  if (res?.error) throw new Error(res.error.message || 'llm_usage_log insert failed')
}

/** All price rows, newest first. Effective-window filtering is done in JS (normalisePriceRows) — simpler than a PostgREST or-filter. */
export async function loadPriceRows(client: SupabaseLike): Promise<unknown[]> {
  const res = await client.from('llm_model_prices').select('*').order('effective_from', { ascending: false }).limit(1000)
  if (res?.error) throw new Error(res.error.message || 'llm_model_prices select failed')
  return res?.data ?? []
}

// ── call-site helpers: build records from provider responses / errors ───────────────────────────────

/** What a call site supplies once; the helpers fill in model, usage, latency, status. */
export interface CallBase {
  feature: string
  model: string                              // the REQUESTED model; the response's own model id wins when present
  call_kind?: LlmCallLog['call_kind']
  actor_type?: LlmCallLog['actor_type']
  actor_id?: string
  conversation_ref?: string
  iterations?: number
  key_label?: string
  stream?: boolean
  meta?: Record<string, unknown>
}

/** Structural shape of an Anthropic Message (SDK object or raw JSON). */
export interface AnthropicMessageLike {
  id?: string
  model?: string
  stop_reason?: string | null
  usage?: unknown
}

/** Anthropic exposes the request-id header as a non-enumerable `_request_id` on SDK responses; fall back to the msg id. */
export function anthropicRequestId(resp: unknown): string | undefined {
  const r = resp as Record<string, any> | null
  return str(r?._request_id, 100) ?? str(r?.id, 100) ?? undefined
}

export function anthropicCallLog(
  base: CallBase,
  startedAt: number,
  resp: AnthropicMessageLike,
  opts: { now?: number; requestId?: string | null } = {},
): LlmCallLog {
  const stop = typeof resp?.stop_reason === 'string' ? resp.stop_reason : undefined
  return {
    ...base,
    provider: 'anthropic',
    model: str(resp?.model, 200) ?? base.model,
    stream: base.stream ?? false,
    usage: usageFromAnthropic(resp?.usage),
    latency_ms: Math.max(0, (opts.now ?? Date.now()) - startedAt),
    status: 'ok',
    request_id: str(opts.requestId, 100) ?? anthropicRequestId(resp),
    meta: stop ? { ...base.meta, stop_reason: stop } : base.meta,
  }
}

export function callErrorLog(
  provider: LlmProviderKey,
  base: CallBase,
  startedAt: number,
  err: unknown,
  opts: { now?: number } = {},
): LlmCallLog {
  const d = describeError(err)
  return {
    ...base,
    provider,
    stream: base.stream ?? false,
    latency_ms: Math.max(0, (opts.now ?? Date.now()) - startedAt),
    status: d.status,
    http_status: d.http_status,
    error_code: d.error_code,
    error_message: d.error_message,
    request_id: d.request_id,
  }
}

/** A non-2xx response from a raw `fetch` call (status + body text the caller has already read). */
export function httpFailureLog(
  provider: LlmProviderKey,
  base: CallBase,
  startedAt: number,
  status: number,
  bodyText: string,
  opts: { now?: number; requestId?: string | null } = {},
): LlmCallLog {
  const d = describeHttpFailure(status, bodyText)
  return {
    ...base,
    provider,
    stream: base.stream ?? false,
    latency_ms: Math.max(0, (opts.now ?? Date.now()) - startedAt),
    status: d.status,
    http_status: d.http_status,
    error_code: d.error_code,
    error_message: d.error_message,
    request_id: str(opts.requestId, 100) ?? undefined,
  }
}

/** What src/lib/embeddings.ts reports for each HTTP call to the embeddings endpoint. */
export interface EmbedCallReport {
  model: string
  ok: boolean
  latencyMs: number
  httpStatus?: number
  promptTokens?: number | null
  totalTokens?: number | null
  requestId?: string | null
  error?: string
}

export function embeddingCallLog(base: CallBase, r: EmbedCallReport): LlmCallLog {
  const ok = r.ok
  return {
    ...base,
    provider: 'openai',
    model: str(r.model, 200) ?? base.model,
    call_kind: 'embedding',
    stream: false,
    usage: usageFromEmbedding({ prompt_tokens: r.promptTokens, total_tokens: r.totalTokens }),
    latency_ms: Math.max(0, r.latencyMs),
    status: ok ? 'ok' : r.httpStatus === 429 ? 'rate_limited' : 'error',
    http_status: r.httpStatus,
    error_message: ok ? undefined : safeErrorMessage(r.error) ?? undefined,
    request_id: str(r.requestId, 100) ?? undefined,
  }
}

// ── batching + tracking ───────────────────────────────────────────────────────────────────────────

/**
 * Collects in-flight log writes during a request so the route can overlap them with its own work and wait for them
 * once, at the end (`flush`). `add` never throws and never blocks.
 */
export class LlmLogBatch {
  pending: Promise<void>[] = []
  log: LogFn
  constructor(log: LogFn) { this.log = log }
  add(rec: LlmCallLog): void {
    try { this.pending.push(this.log(rec).catch(() => undefined)) } catch { /* never */ }
  }
  /**
   * Wait for the pending writes. `maxMs` caps the wait for latency-sensitive callers (the writes carry on in the
   * background; they are best-effort anyway) — omit it to wait for all of them (each already self-limits to ~2s).
   */
  async flush(maxMs?: number): Promise<void> {
    const p = this.pending
    this.pending = []
    const all = Promise.allSettled(p).then(() => undefined)
    if (maxMs == null) return all
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, maxMs)
      all.then(() => { clearTimeout(t); resolve() })
    })
  }
}

/**
 * Run one provider call, log it (success or failure), and hand back EXACTLY what the call produced: the same
 * response object, or the same error rethrown. With a `batch` BOTH outcomes are queued without waiting — a failing
 * call must surface at once (the visitor is waiting on the error), never behind a log insert; the route flushes the
 * batch (capped) in its own error path, and the write carries on in the background if that cap is hit. Without a
 * batch both are awaited (each log call self-limits to ~2s).
 */
export async function trackCall<T>(
  deps: { log: LogFn; batch?: LlmLogBatch },
  build: { ok: (resp: T, startedAt: number) => LlmCallLog; err: (e: unknown, startedAt: number) => LlmCallLog },
  call: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  let resp: T
  try {
    resp = await call()
  } catch (e) {
    try {
      const rec = build.err(e, startedAt)
      if (deps.batch) deps.batch.add(rec); else await deps.log(rec)
    } catch { /* logging must never mask the real error */ }
    throw e
  }
  try {
    const rec = build.ok(resp, startedAt)
    if (deps.batch) deps.batch.add(rec); else await deps.log(rec)
  } catch { /* logging must never fail the request */ }
  return resp
}

/** Fresh id shared by every provider call of one user turn (an agentic tool loop makes several). */
export function newTurnId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * URL path only (no query/hash — those can carry personal data), capped, and only if it LOOKS like a path: a leading
 * slash then URL-path characters. Ask Ari's `pagePath` comes straight from an unauthenticated browser, so anything
 * else (spaces, markup, formulas, free text) is dropped rather than stored as a log label.
 */
export function safePagePath(p: unknown): string | null {
  if (typeof p !== 'string') return null
  const path = p.split(/[?#]/)[0].trim().slice(0, 120)
  return /^\/[A-Za-z0-9._~%+@:/-]*$/.test(path) ? path : null
}

// ── eval-harness proof ────────────────────────────────────────────────────────────────────────────
// Ask Ari is a public, unauthenticated endpoint, so "this call is the eval harness" cannot be a claim the caller makes
// (a page path, a body field) — whoever sets it would hide their spend under the internal-looking agent_eval label.
// The harness instead PROVES itself with a short-lived signed header, sent from inside the app to its own endpoint:
//
//     x-agent-eval: <unix-seconds>.<hex HMAC-SHA256(unix-seconds)>
//
// keyed by a key derived (domain-separated) from a server-only secret both sides already hold, so the secret itself
// never travels and nothing new has to be configured. Web Crypto only (no imports); verification is constant-time.

export const AGENT_EVAL_HEADER = 'x-agent-eval'
/** A signature is honoured this long (either side of "now", so a little clock skew is fine). */
export const AGENT_EVAL_WINDOW_S = 300
const AGENT_EVAL_DOMAIN = 'agent-eval-v1'

function subtleCrypto(): any {
  return (globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)

/** HMAC(secret, 'agent-eval-v1') as a signing/verifying key — the secret never signs anything but that label. */
async function evalKey(subtle: any, secret: string): Promise<any> {
  const alg = { name: 'HMAC', hash: 'SHA-256' }
  const root = await subtle.importKey('raw', utf8(secret), alg, false, ['sign'])
  const derived = await subtle.sign('HMAC', root, utf8(AGENT_EVAL_DOMAIN))
  return subtle.importKey('raw', derived, alg, false, ['sign', 'verify'])
}

/** The header VALUE the eval harness sends, or null when there is no secret / no Web Crypto (then it simply sends none). */
export async function signAgentEval(secret: string | undefined | null, nowMs: number = Date.now()): Promise<string | null> {
  try {
    const subtle = subtleCrypto()
    if (!subtle || !secret) return null
    const ts = String(Math.floor(nowMs / 1000))
    const sig = new Uint8Array(await subtle.sign('HMAC', await evalKey(subtle, secret), utf8(ts)))
    return `${ts}.${Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return null
  }
}

/** True only for a header that `signAgentEval` produced with the same secret within the last/next ~5 minutes. Never throws. */
export async function verifyAgentEval(
  header: string | undefined | null,
  secret: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<boolean> {
  try {
    const subtle = subtleCrypto()
    if (!subtle || !secret || typeof header !== 'string') return false
    const m = /^(\d{9,12})\.([0-9a-f]{64})$/.exec(header.trim())
    if (!m) return false
    if (Math.abs(nowMs / 1000 - Number(m[1])) > AGENT_EVAL_WINDOW_S) return false
    const sig = Uint8Array.from(m[2].match(/../g) as string[], (h) => parseInt(h, 16))
    // subtle.verify compares the MACs in constant time
    return (await subtle.verify('HMAC', await evalKey(subtle, secret), sig, utf8(m[1]))) === true
  } catch {
    return false
  }
}

/** Does this request carry a valid, fresh eval-harness proof? The page path / body are never consulted. */
export function isAgentEvalRequest(
  headers: { get(name: string): string | null } | undefined | null,
  secret: string | undefined | null,
  nowMs?: number,
): Promise<boolean> {
  let value: string | null = null
  try { value = headers?.get(AGENT_EVAL_HEADER) ?? null } catch { /* treated as absent */ }
  return verifyAgentEval(value, secret, nowMs)
}

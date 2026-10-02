// Unit tests for the www LLM call log (src/lib/llmLogCore.ts): price lookup, cost, usage normalisers, scrubbing,
// error description, row building, the never-throws logger, batching and tracking.
//   node --test supabase/tests/llm-log/llmLogCore.test.mjs
// The real .ts is imported unchanged (Node strips the types); llmLogCore has no imports, so no resolver hook needed.
import test from 'node:test'
import assert from 'node:assert/strict'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac } from 'node:crypto'
import {
  LLM_APP, findPrice, computeCost, normalisePriceRows,
  usageFromAnthropic, usageFromOpenAICompat, usageFromGemini, usageFromEmbedding, classifyHttpStatus,
  scrubSecrets, safeErrorMessage, sanitizeMeta, describeError, describeHttpFailure,
  buildUsageRow, createLlmLogger, insertUsageRow, loadPriceRows,
  anthropicCallLog, callErrorLog, httpFailureLog, embeddingCallLog, anthropicRequestId,
  LlmLogBatch, trackCall, newTurnId, safePagePath,
  killSwitchOn, vercelEnvOf,
  AGENT_EVAL_HEADER, AGENT_EVAL_WINDOW_S, signAgentEval, verifyAgentEval, isAgentEvalRequest,
} from '../../../src/lib/llmLogCore.ts'

// ── fixtures: the seeded llm_model_prices rows the www agents actually hit ────────────────────────
const FROM = '2026-10-02T00:00:00+00:00'
const px = (o) => ({
  id: o.id ?? `p_${o.provider}_${o.model}`, provider: o.provider, model: o.model, match_kind: o.match_kind ?? 'prefix',
  input_per_mtok_usd: o.i ?? null, output_per_mtok_usd: o.o ?? null, cache_read_per_mtok_usd: o.cr ?? null, cache_write_per_mtok_usd: o.cw ?? null,
  per_unit_usd: o.pu ?? null, unit_kind: o.unit_kind ?? null, tiers: o.tiers ?? null,
  effective_from: o.from ?? FROM, effective_to: o.to ?? null,
})
const SONNET45 = px({ provider: 'anthropic', model: 'claude-sonnet-4-5', i: 3, o: 15, cr: 0.3, cw: 3.75 })
const SONNET46 = px({ provider: 'anthropic', model: 'claude-sonnet-4-6', i: 3, o: 15, cr: 0.3, cw: 3.75 })
const SONNET5 = px({ provider: 'anthropic', model: 'claude-sonnet-5', i: 2, o: 10, cr: 0.2, cw: 2.5 })
const SONNET55 = px({ provider: 'anthropic', model: 'claude-sonnet-5-5', i: 2, o: 10, cr: 0.2, cw: 2.5, id: 'p55' })
const EMBED = px({ provider: 'openai', model: 'text-embedding-3-small', match_kind: 'exact', i: 0.02 })
const TAVILY = px({ provider: 'tavily', model: 'search', pu: 0.008, unit_kind: 'credit' })
const GPT = px({ provider: 'openai', model: 'gpt-5.5', i: 5, o: 30, cr: 0.5 })
const TABLE = [SONNET45, SONNET46, SONNET5, SONNET55, EMBED, TAVILY, GPT]
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`)

// ── findPrice ───────────────────────────────────────────────────────────────────────────────────
test('findPrice: a dated model id finds its prefix row; exact beats prefix; longest prefix wins', () => {
  assert.equal(findPrice(TABLE, 'anthropic', 'claude-sonnet-4-5-20250929').id, SONNET45.id)
  assert.equal(findPrice(TABLE, 'anthropic', 'claude-sonnet-4-5').id, SONNET45.id)
  // claude-sonnet-5-5-… must not fall back to the shorter claude-sonnet-5 row
  assert.equal(findPrice(TABLE, 'anthropic', 'claude-sonnet-5-5-20260901').id, 'p55')
  assert.equal(findPrice(TABLE, 'anthropic', 'claude-sonnet-5-0').id, SONNET5.id)
  // an exact row beats a (longer-or-equal) prefix row for the same model
  const exact = px({ provider: 'openai', model: 'gpt-5.5', match_kind: 'exact', i: 1, o: 2, id: 'exact' })
  assert.equal(findPrice([GPT, exact], 'openai', 'gpt-5.5').id, 'exact')
  assert.equal(findPrice([GPT, exact], 'openai', 'gpt-5.5-mini').id, GPT.id) // exact only matches exactly
})

test('findPrice: case-insensitive, provider-scoped, unknown model -> null', () => {
  assert.equal(findPrice(TABLE, 'ANTHROPIC', 'Claude-Sonnet-4-5').id, SONNET45.id)
  assert.equal(findPrice(TABLE, 'openai', 'claude-sonnet-4-5'), null)
  assert.equal(findPrice(TABLE, 'anthropic', 'claude-haiku-9'), null)
  assert.equal(findPrice(TABLE, 'anthropic', ''), null)
  // an exact row is not a prefix: "text-embedding-3-small-v2" does NOT match the exact row
  assert.equal(findPrice(TABLE, 'openai', 'text-embedding-3-small-v2'), null)
  assert.equal(findPrice(TABLE, 'openai', 'text-embedding-3-small').id, EMBED.id)
})

test('findPrice: with two rows for one model the most recently effective wins', () => {
  const old = px({ provider: 'anthropic', model: 'claude-sonnet-4-5', i: 9, o: 9, id: 'old', from: '2026-01-01T00:00:00Z' })
  assert.equal(findPrice([old, SONNET45], 'anthropic', 'claude-sonnet-4-5').id, SONNET45.id)
  assert.equal(findPrice([SONNET45, old], 'anthropic', 'claude-sonnet-4-5').id, SONNET45.id)
})

// ── normalisePriceRows ──────────────────────────────────────────────────────────────────────────
test('normalisePriceRows: coerces numeric strings, parses tiers, drops rows outside their effective window', () => {
  const now = Date.parse('2026-10-05T00:00:00Z')
  const rows = normalisePriceRows([
    { id: 'a', provider: 'anthropic', model: 'claude-x', match_kind: 'prefix', input_per_mtok_usd: '3.000000', output_per_mtok_usd: '15.000000', cache_read_per_mtok_usd: null,
      tiers: '[{"min_input_tokens":200000,"input":6,"output":22.5},{"min_input_tokens":0,"input":3}]', effective_from: '2026-10-02 00:00:00+00', effective_to: null },
    { id: 'future', provider: 'anthropic', model: 'later', effective_from: '2027-01-01T00:00:00Z' },
    { id: 'expired', provider: 'anthropic', model: 'gone', effective_from: '2026-01-01T00:00:00Z', effective_to: '2026-10-01T00:00:00Z' },
    { id: 'bad', provider: '', model: 'x', effective_from: FROM },
    null,
  ], now)
  assert.deepEqual(rows.map(r => r.id), ['a'])
  assert.equal(rows[0].input_per_mtok_usd, 3)
  assert.equal(rows[0].output_per_mtok_usd, 15)
  assert.equal(rows[0].cache_read_per_mtok_usd, null)
  assert.deepEqual(rows[0].tiers.map(t => t.min_input_tokens), [0, 200000]) // sorted ascending
  assert.deepEqual(normalisePriceRows('garbage', now), [])
})

// ── computeCost ─────────────────────────────────────────────────────────────────────────────────
test('computeCost: real Anthropic usage = in×3 + cache_read×0.3 + out×15 per Mtok', () => {
  const u = usageFromAnthropic({ input_tokens: 2095, cache_creation_input_tokens: 0, cache_read_input_tokens: 1800, output_tokens: 503 })
  const c = computeCost(SONNET45, u)
  assert.equal(c.basis, 'computed')
  close(c.cost_usd, (2095 * 3 + 1800 * 0.3 + 503 * 15) / 1e6)
})

test('computeCost: cache_write uses the cache-write price; a null cache price falls back to the plain input price', () => {
  const w = computeCost(SONNET45, { input_tokens: 0, cache_write_tokens: 1000, output_tokens: 0 })
  close(w.cost_usd, 1000 * 3.75 / 1e6)
  const noCache = px({ provider: 'openai', model: 'm', i: 2, o: 8 }) // cr / cw null
  const c = computeCost(noCache, { input_tokens: 100, cache_read_tokens: 400, cache_write_tokens: 50, output_tokens: 10 })
  close(c.cost_usd, ((100 + 400 + 50) * 2 + 10 * 8) / 1e6)
})

test('computeCost: embedding (input price only, no output tokens) prices fine', () => {
  const c = computeCost(EMBED, usageFromEmbedding({ prompt_tokens: 12, total_tokens: 12 }))
  assert.equal(c.basis, 'computed')
  close(c.cost_usd, 12 * 0.02 / 1e6)
})

test('computeCost: tiers — the largest min_input_tokens <= (input+cache) overrides the prices', () => {
  const tiered = px({ provider: 'gemini', model: 'pro', i: 1.25, o: 10, cr: 0.125, tiers: [{ min_input_tokens: 200000, input: 2.5, output: 15, cache_read: 0.25 }] })
  const small = computeCost(tiered, { input_tokens: 100000, output_tokens: 1000 })
  close(small.cost_usd, (100000 * 1.25 + 1000 * 10) / 1e6)
  const big = computeCost(tiered, { input_tokens: 150000, cache_read_tokens: 60000, output_tokens: 1000 }) // 210k total -> tier
  close(big.cost_usd, (150000 * 2.5 + 60000 * 0.25 + 1000 * 15) / 1e6)
})

test('computeCost: unit-priced rows (Tavily credits) multiply units x per_unit_usd', () => {
  const c = computeCost(TAVILY, { units: 2, unit_kind: 'credit' })
  assert.equal(c.basis, 'computed')
  close(c.cost_usd, 0.016)
})

test('computeCost: the provider-reported cost always wins (xAI ticks)', () => {
  const u = usageFromOpenAICompat({ prompt_tokens: 151, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 128 }, cost_in_usd_ticks: 123456 }, 'xai')
  const c = computeCost(GPT, u)
  assert.equal(c.basis, 'provider_reported')
  close(c.cost_usd, 123456 / 1e10)
})

test('computeCost: unpriced when a needed price component is missing — never silently under-reported', () => {
  assert.deepEqual(computeCost(TAVILY, { input_tokens: 100, output_tokens: 10 }), { cost_usd: null, basis: 'unpriced' }) // unit row, token usage
  assert.deepEqual(computeCost(EMBED, { input_tokens: 10, output_tokens: 5 }), { cost_usd: null, basis: 'unpriced' })    // output tokens but no output price
  assert.deepEqual(computeCost(SONNET45, {}), { cost_usd: null, basis: 'unpriced' })                                       // no usage at all
  assert.deepEqual(computeCost(TAVILY, { input_tokens: 5 }), { cost_usd: null, basis: 'unpriced' })
})

test('computeCost: zero-token usage on a token-priced model is a real $0', () => {
  const c = computeCost(SONNET45, { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 })
  assert.deepEqual(c, { cost_usd: 0, basis: 'computed' })
})

// ── usage normalisers (real-shaped payloads) ────────────────────────────────────────────────────
test('usageFromAnthropic: real message usage; cache_creation sum used when the total is absent; thinking + web search', () => {
  assert.deepEqual(
    usageFromAnthropic({ input_tokens: 2095, cache_creation_input_tokens: 0, cache_read_input_tokens: 1800,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 }, output_tokens: 503, service_tier: 'standard', server_tool_use: null }),
    { input_tokens: 2095, output_tokens: 503, cache_read_tokens: 1800, cache_write_tokens: 0, reasoning_tokens: null },
  )
  const u = usageFromAnthropic({ input_tokens: 10, output_tokens: 700, cache_read_input_tokens: null, cache_creation_input_tokens: null,
    cache_creation: { ephemeral_5m_input_tokens: 300, ephemeral_1h_input_tokens: 200 }, output_tokens_details: { thinking_tokens: 450 }, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 } })
  assert.equal(u.cache_write_tokens, 500)
  assert.equal(u.cache_read_tokens, 0)
  assert.equal(u.reasoning_tokens, 450)
  assert.equal(u.units, 2)
  assert.equal(u.unit_kind, 'web_search')
  assert.deepEqual(usageFromAnthropic(null), {})
  assert.deepEqual(usageFromAnthropic(undefined), {})
})

test('usageFromOpenAICompat: OpenAI — prompt_tokens includes cached; reasoning split out', () => {
  assert.deepEqual(
    usageFromOpenAICompat({ prompt_tokens: 1200, completion_tokens: 300, total_tokens: 1500,
      prompt_tokens_details: { cached_tokens: 1024, audio_tokens: 0 }, completion_tokens_details: { reasoning_tokens: 128, accepted_prediction_tokens: 0 } }, 'openai'),
    { input_tokens: 176, output_tokens: 300, cache_read_tokens: 1024, cache_write_tokens: 0, reasoning_tokens: 128 },
  )
})

test('usageFromOpenAICompat: GPT-5.6+ cache_write_tokens are carved out of the input too; Responses-API naming works', () => {
  const u = usageFromOpenAICompat({ input_tokens: 500, input_tokens_details: { cached_tokens: 100, cache_write_tokens: 50 }, output_tokens: 70, output_tokens_details: { reasoning_tokens: 10 }, total_tokens: 570 })
  assert.deepEqual(u, { input_tokens: 350, output_tokens: 70, cache_read_tokens: 100, cache_write_tokens: 50, reasoning_tokens: 10 })
})

test('usageFromOpenAICompat: xAI — cost_in_usd_ticks / 1e10 becomes the reported cost (and only for xai)', () => {
  const p = { prompt_tokens: 151, completion_tokens: 40, total_tokens: 191, prompt_tokens_details: { cached_tokens: 128 }, completion_tokens_details: { reasoning_tokens: 0 }, cost_in_usd_ticks: 123456 }
  const u = usageFromOpenAICompat(p, 'xai')
  assert.equal(u.input_tokens, 23)
  assert.equal(u.cache_read_tokens, 128)
  close(u.cost_usd_reported, 0.0000123456)
  assert.equal(usageFromOpenAICompat(p, 'openai').cost_usd_reported, undefined)
})

test('usageFromOpenAICompat: DeepSeek uses prompt_cache_hit/miss', () => {
  assert.deepEqual(
    usageFromOpenAICompat({ prompt_tokens: 300, completion_tokens: 50, total_tokens: 350, prompt_cache_hit_tokens: 256, prompt_cache_miss_tokens: 44, prompt_tokens_details: { cached_tokens: 256 } }, 'deepseek'),
    { input_tokens: 44, output_tokens: 50, cache_read_tokens: 256, cache_write_tokens: 0, reasoning_tokens: null },
  )
})

test('usageFromOpenAICompat: Qwen (cached_tokens) and a payload with no details', () => {
  const q = usageFromOpenAICompat({ prompt_tokens: 900, completion_tokens: 100, total_tokens: 1000, prompt_tokens_details: { cached_tokens: 600, text_tokens: 900 }, completion_tokens_details: { reasoning_tokens: 40, text_tokens: 100 } }, 'qwen')
  assert.equal(q.input_tokens, 300)
  assert.equal(q.cache_read_tokens, 600)
  assert.equal(q.reasoning_tokens, 40)
  const bare = usageFromOpenAICompat({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, 'kimi')
  assert.deepEqual(bare, { input_tokens: 10, output_tokens: 5, cache_read_tokens: 0, cache_write_tokens: 0, reasoning_tokens: null })
  assert.deepEqual(usageFromOpenAICompat(null), {})
})

test('usageFromGemini: input excludes the cached subset; thinking bills as output', () => {
  assert.deepEqual(
    usageFromGemini({ promptTokenCount: 1000, cachedContentTokenCount: 400, candidatesTokenCount: 120, thoughtsTokenCount: 300, totalTokenCount: 1420 }),
    { input_tokens: 600, output_tokens: 420, cache_read_tokens: 400, cache_write_tokens: 0, reasoning_tokens: 300 },
  )
  assert.deepEqual(usageFromGemini({ promptTokenCount: 50, candidatesTokenCount: 20 }),
    { input_tokens: 50, output_tokens: 20, cache_read_tokens: 0, cache_write_tokens: 0, reasoning_tokens: null })
})

test('usageFromEmbedding: prompt_tokens, else total_tokens', () => {
  assert.deepEqual(usageFromEmbedding({ prompt_tokens: 8, total_tokens: 8 }), { input_tokens: 8 })
  assert.deepEqual(usageFromEmbedding({ total_tokens: 9 }), { input_tokens: 9 })
  assert.deepEqual(usageFromEmbedding(undefined), {})
})

test('classifyHttpStatus', () => {
  assert.equal(classifyHttpStatus(200), 'ok')
  assert.equal(classifyHttpStatus(429), 'rate_limited')
  assert.equal(classifyHttpStatus(401), 'error')
  assert.equal(classifyHttpStatus(529), 'error')
  assert.equal(classifyHttpStatus(500), 'error')
})

// ── scrubbing ───────────────────────────────────────────────────────────────────────────────────
test('scrubSecrets: keys, bearer tokens, key= params, emails and phone numbers never survive', () => {
  const dirty = 'Incorrect API key provided: sk-proj-abcDEF123456789xyz. Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def; '
    + 'url?api_key=SuperSecret99&x=1 x-api-key: sk-ant-api03-AAAAAAAAAAAAAA; user a.b+c@example.co.in phone +91 99300 51053; grok xai-ABCDEFGH12345678'
  const clean = scrubSecrets(dirty)
  for (const bad of ['sk-proj', 'sk-ant', 'eyJhbGci', 'SuperSecret99', 'a.b+c@example', '99300 51053', 'xai-ABCDEFGH']) {
    assert.ok(!clean.includes(bad), `leaked ${bad}: ${clean}`)
  }
  assert.match(clean, /Incorrect API key/)
})

test('scrubSecrets leaves ordinary diagnostics alone', () => {
  const msg = 'prompt is too long: 215472 tokens > 200000 maximum (max_tokens: 800) risk-based task-force'
  assert.equal(scrubSecrets(msg), msg)
})

test('safeErrorMessage: scrubs BEFORE truncating (a key cut in half must not leave a prefix) and caps at 500', () => {
  const padded = 'x'.repeat(480) + ' sk-ant-api03-ABCDEFGHIJKLMNOP'
  const out = safeErrorMessage(padded)
  assert.ok(out.length <= 500)
  assert.ok(!/sk-ant/.test(out), out.slice(-60))
  assert.equal(safeErrorMessage('y'.repeat(2000)).length, 500)
  assert.equal(safeErrorMessage(''), null)
  assert.equal(safeErrorMessage(undefined), null)
})

test('sanitizeMeta: scrubs strings, keeps small JSON, replaces oversized meta, tolerates junk', () => {
  const m = sanitizeMeta({ page: '/courses', note: 'mail me at a@b.com', n: 3, nested: { k: 'Bearer abcdef123456' } })
  assert.equal(m.page, '/courses')
  assert.equal(m.n, 3)
  assert.ok(!JSON.stringify(m).includes('a@b.com'))
  assert.ok(!JSON.stringify(m).includes('abcdef123456'))
  assert.ok(sanitizeMeta({ big: 'q'.repeat(6000) }).big.length <= 300)
  const huge = {}; for (let i = 0; i < 400; i++) huge['k' + i] = 'v'.repeat(30)
  assert.deepEqual(sanitizeMeta(huge), { truncated: true })
  assert.deepEqual(sanitizeMeta(null), {})
  assert.deepEqual(sanitizeMeta([1, 2]), {})
  const circ = {}; circ.self = circ
  assert.deepEqual(sanitizeMeta(circ), {})
})

test('safePagePath drops query and hash (they can carry personal data) and caps length', () => {
  assert.equal(safePagePath('/courses/ai?email=a@b.com#x'), '/courses/ai')
  assert.equal(safePagePath('/__eval'), '/__eval')
  assert.equal(safePagePath(undefined), null)
  assert.equal(safePagePath('/' + 'a'.repeat(500)).length, 120)
})

test('safePagePath only keeps path-shaped values: a public caller cannot inject arbitrary log labels', () => {
  // real page paths survive
  for (const ok of ['/', '/courses/ai-mastery', '/webinar/some-slug', '/expert-consultation', '/hi/about_us', '/a%20b/c.html', '/@user/x:y+z'])
    assert.equal(safePagePath(ok), ok, ok)
  // free text, markup, formula/injection strings, other schemes, control chars, non-strings -> dropped (null), not stored
  const attacks = [
    '/ignore all previous <script>alert(1)</script> =HYPERLINK("http://evil","x")',
    'ignore all previous instructions',
    '=HYPERLINK("http://evil","x")',
    '+cmd|calc', '@SUM(1+1)', '-2+3',
    'https://evil.example/x', 'javascript:alert(1)',
    '/a b', '/a\nb', '/a\u0000b', '/<img src=x>', '/a"b', "/a'b", '/a\\b', '/a;b', '/a,b',
    '', '   ', {}, [], 42, null,
  ]
  for (const a of attacks) assert.equal(safePagePath(a), null, JSON.stringify(a))
  // the query/hash strip still happens first, so a harmless path with a hostile query keeps just the path
  assert.equal(safePagePath('/courses/ai?x=<script>'), '/courses/ai')
  // and the value that reaches the row is the sanitised one
  assert.equal(sanitizeMeta({ page: safePagePath('/ignore all previous <script>') }).page, null)
})

// ── eval-harness proof (x-agent-eval) ────────────────────────────────────────────────────────────
const EVAL_SECRET = 'test-service-role-key-not-real'
const NOW = Date.parse('2026-10-05T12:00:00Z')
const tsOf = (ms) => String(Math.floor(ms / 1000))
const hex = (buf) => Buffer.from(buf).toString('hex')
// independent reference implementation (node:crypto) of the documented scheme: key = HMAC(secret,'agent-eval-v1'), sig = HMAC(key, ts)
const refSig = (secret, ts) => hex(createHmac('sha256', createHmac('sha256', secret).update('agent-eval-v1').digest()).update(ts).digest())

test('agent-eval proof: the header is "<unix-seconds>.<hex HMAC>" and matches the documented scheme', async () => {
  assert.equal(AGENT_EVAL_HEADER, 'x-agent-eval')
  const v = await signAgentEval(EVAL_SECRET, NOW)
  assert.match(v, /^\d{10}\.[0-9a-f]{64}$/)
  const [ts, sig] = v.split('.')
  assert.equal(ts, tsOf(NOW))
  assert.equal(sig, refSig(EVAL_SECRET, ts))                       // domain-separated derived key, not the raw secret
  assert.notEqual(sig, hex(createHmac('sha256', EVAL_SECRET).update(ts).digest()))
  assert.ok(!v.includes(EVAL_SECRET))                              // the secret itself never travels
  assert.equal(await verifyAgentEval(v, EVAL_SECRET, NOW), true)
})

test('agent-eval proof: no secret -> nothing is signed and nothing verifies', async () => {
  assert.equal(await signAgentEval(undefined, NOW), null)
  assert.equal(await signAgentEval('', NOW), null)
  const v = await signAgentEval(EVAL_SECRET, NOW)
  assert.equal(await verifyAgentEval(v, undefined, NOW), false)
  assert.equal(await verifyAgentEval(v, '', NOW), false)
})

test('agent-eval proof: missing / malformed / forged / wrong-key headers are NOT eval', async () => {
  const good = await signAgentEval(EVAL_SECRET, NOW)
  const [ts, sig] = good.split('.')
  const bad = [
    null, undefined, '', '   ', 'true', '1', '/__eval', 'agent-evals',
    ts, `${ts}.`, `.${sig}`, `${ts}.${sig.slice(0, 63)}`, `${ts}.${sig}0`, `${ts}.${sig.toUpperCase()}`,
    `${ts}.${'0'.repeat(64)}`, `${ts}.${sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a')}`,       // right shape, wrong MAC
    `${Number(ts) + 1}.${sig}`,                                                                  // MAC for a different timestamp
    `${ts}.${refSig('some-other-secret', ts)}`,                                                 // signed with another key
    `${ts}.${hex(createHmac('sha256', EVAL_SECRET).update(ts).digest())}`,                      // raw secret instead of the derived key
    `${ts}.${sig}.extra`, `${ts} ${sig}`, `x${ts}.${sig}`, `${ts}.${sig}x`,
  ]
  for (const h of bad) assert.equal(await verifyAgentEval(h, EVAL_SECRET, NOW), false, String(h))
  assert.equal(await verifyAgentEval(123, EVAL_SECRET, NOW), false)
  assert.equal(await verifyAgentEval({}, EVAL_SECRET, NOW), false)
})

test('agent-eval proof: only honoured inside a ~5 minute window (either side of now)', async () => {
  assert.equal(AGENT_EVAL_WINDOW_S, 300)
  const at = (offsetS) => signAgentEval(EVAL_SECRET, NOW + offsetS * 1000)
  assert.equal(await verifyAgentEval(await at(-299), EVAL_SECRET, NOW), true)
  assert.equal(await verifyAgentEval(await at(-300), EVAL_SECRET, NOW), true)
  assert.equal(await verifyAgentEval(await at(-301), EVAL_SECRET, NOW), false)           // expired
  assert.equal(await verifyAgentEval(await at(-3600), EVAL_SECRET, NOW), false)
  assert.equal(await verifyAgentEval(await at(+300), EVAL_SECRET, NOW), true)            // a little skew is fine
  assert.equal(await verifyAgentEval(await at(+301), EVAL_SECRET, NOW), false)           // far-future stamps are not a free pass
  // a valid-looking header from an hour ago, replayed now, is rejected even though its MAC is genuine
  const old = await at(-3600)
  assert.equal(await verifyAgentEval(old, EVAL_SECRET, NOW - 3600 * 1000), true)
  assert.equal(await verifyAgentEval(old, EVAL_SECRET, NOW), false)
})

test('agent-eval proof: request check reads ONLY the header — pagePath "/__eval" in the body never makes a call an eval', async () => {
  const good = await signAgentEval(EVAL_SECRET, NOW)
  const req = (h) => ({ headers: new Headers(h), body: { pagePath: '/__eval', messages: [] } })
  // the public-endpoint spoof from the review: pagePath '/__eval' and no / wrong / stale header
  assert.equal(await isAgentEvalRequest(req({}).headers, EVAL_SECRET, NOW), false)
  assert.equal(await isAgentEvalRequest(req({ 'x-agent-eval': 'nope' }).headers, EVAL_SECRET, NOW), false)
  assert.equal(await isAgentEvalRequest(req({ 'x-agent-eval': good }).headers, EVAL_SECRET, NOW + 600 * 1000), false)
  assert.equal(await isAgentEvalRequest(req({ 'x-agent-eval': good }).headers, 'a-different-secret', NOW), false)
  assert.equal(await isAgentEvalRequest(req({ 'X-Agent-Eval': 'x'.repeat(5000) }).headers, EVAL_SECRET, NOW), false)
  // the harness' own request (valid header; header names are case-insensitive)
  assert.equal(await isAgentEvalRequest(req({ 'x-agent-eval': good }).headers, EVAL_SECRET, NOW), true)
  assert.equal(await isAgentEvalRequest(req({ 'X-Agent-Eval': good }).headers, EVAL_SECRET, NOW), true)
  // never throws on odd inputs
  assert.equal(await isAgentEvalRequest(undefined, EVAL_SECRET, NOW), false)
  assert.equal(await isAgentEvalRequest(null, EVAL_SECRET, NOW), false)
  assert.equal(await isAgentEvalRequest({ get() { throw new Error('boom') } }, EVAL_SECRET, NOW), false)
})

// ── describeError (real SDK error classes) ───────────────────────────────────────────────────────
test('describeError: Anthropic 429 -> rate_limited with the nested error type and request id', () => {
  const body = { type: 'error', error: { type: 'rate_limit_error', message: 'This request would exceed your organization’s rate limit' } }
  const err = Anthropic.APIError.generate(429, body, undefined, new Headers({ 'request-id': 'req_011CTabc' }))
  const d = describeError(err)
  assert.equal(d.status, 'rate_limited')
  assert.equal(d.http_status, 429)
  assert.equal(d.error_code, 'rate_limit_error')
  assert.equal(d.request_id, 'req_011CTabc')
  assert.match(d.error_message, /rate limit/)
})

test('describeError: 529 overloaded and 401 are plain errors keeping http_status', () => {
  const o = describeError(Anthropic.APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }, undefined, new Headers()))
  assert.deepEqual([o.status, o.http_status, o.error_code], ['error', 529, 'overloaded_error'])
  const a = describeError(Anthropic.APIError.generate(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, undefined, new Headers()))
  assert.deepEqual([a.status, a.http_status, a.error_code], ['error', 401, 'authentication_error'])
})

test('describeError: SDK timeout and abort errors, fetch TimeoutError, plain network errors', () => {
  assert.equal(describeError(new Anthropic.APIConnectionTimeoutError()).status, 'timeout')
  assert.equal(describeError(new Anthropic.APIUserAbortError()).status, 'aborted')
  const te = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
  assert.equal(describeError(te).status, 'timeout')
  const net = describeError(new TypeError('fetch failed'))
  assert.equal(net.status, 'error')
  assert.equal(net.http_status, undefined)
  assert.equal(describeError(undefined).status, 'error')
  assert.equal(describeError('boom').error_message, 'boom')
})

test('describeError never leaks a key that an SDK error message echoes', () => {
  const d = describeError(new Error('401 Incorrect API key provided: sk-proj-LEAKLEAKLEAK1234'))
  assert.ok(!d.error_message.includes('LEAKLEAK'))
})

test('describeHttpFailure: parses a JSON error body (Anthropic + OpenAI shapes) and survives a cut-off body', () => {
  const a = describeHttpFailure(400, JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'max_tokens: 5000 > 4096' } }))
  assert.deepEqual([a.status, a.http_status, a.error_code, a.error_message], ['error', 400, 'invalid_request_error', 'max_tokens: 5000 > 4096'])
  const o = describeHttpFailure(429, JSON.stringify({ error: { message: 'Rate limit reached', type: 'requests', code: 'rate_limit_exceeded' } }))
  assert.equal(o.status, 'rate_limited')
  assert.equal(o.error_code, 'requests')
  const cut = describeHttpFailure(500, '{"type":"error","error":{"type":"api_err')
  assert.equal(cut.http_status, 500)
  assert.match(cut.error_message, /api_err/)
})

// ── buildUsageRow ───────────────────────────────────────────────────────────────────────────────
const okRec = () => ({
  feature: 'ask_ari', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', stream: false,
  usage: usageFromAnthropic({ input_tokens: 2095, cache_read_input_tokens: 1800, cache_creation_input_tokens: 0, output_tokens: 503 }),
  latency_ms: 1234.7, status: 'ok', request_id: 'req_1', actor_type: 'visitor', actor_id: 'sess-uuid', conversation_ref: 'turn-1', iterations: 2, meta: { page: '/' },
})

test('buildUsageRow: a priced Anthropic call', () => {
  const row = buildUsageRow(okRec(), findPrice(TABLE, 'anthropic', 'claude-sonnet-4-5-20250929'), 'production')
  assert.equal(row.app, LLM_APP)
  assert.equal(row.app, 'www')
  assert.equal(row.vercel_env, 'production')
  assert.equal(row.feature, 'ask_ari')
  assert.equal(row.model, 'claude-sonnet-4-5-20250929')
  assert.equal(row.call_kind, 'chat')
  assert.equal(row.stream, false)
  assert.equal(row.input_tokens, 2095)
  assert.equal(row.cache_read_tokens, 1800)
  assert.equal(row.cache_write_tokens, 0)
  assert.equal(row.output_tokens, 503)
  assert.equal(row.latency_ms, 1235)
  assert.equal(row.cost_basis, 'computed')
  assert.equal(row.price_id, SONNET45.id)
  close(row.est_cost_usd, 0.01437)
  assert.equal(row.status, 'ok')
  assert.equal(row.actor_type, 'visitor')
  assert.equal(row.actor_id, 'sess-uuid')
  assert.equal(row.iterations, 2)
  assert.deepEqual(row.meta, { page: '/' })
})

test('buildUsageRow: unpriced model -> cost_basis unpriced; price table unreachable -> no cost fields at all', () => {
  const unpriced = buildUsageRow({ ...okRec(), model: 'claude-newest-9' }, null, null)
  assert.equal(unpriced.cost_basis, 'unpriced')
  assert.equal(unpriced.est_cost_usd, null)
  assert.equal(unpriced.vercel_env, null)
  const unknown = buildUsageRow({ ...okRec(), model: 'claude-newest-9' }, undefined, null)
  assert.equal(unknown.cost_basis, null)
  assert.equal(unknown.est_cost_usd, null)
})

test('buildUsageRow: a failed call without usage carries no cost and is not mis-flagged unpriced', () => {
  const rec = callErrorLog('anthropic', { feature: 'ask_ari', model: 'claude-sonnet-4-5' }, 1000, Anthropic.APIError.generate(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, undefined, new Headers({ 'request-id': 'req_z' })), { now: 1800 })
  const row = buildUsageRow(rec, SONNET45, 'production')
  assert.equal(row.status, 'rate_limited')
  assert.equal(row.http_status, 429)
  assert.equal(row.error_code, 'rate_limit_error')
  assert.equal(row.request_id, 'req_z')
  assert.equal(row.latency_ms, 800)
  assert.equal(row.est_cost_usd, null)
  assert.equal(row.cost_basis, null)
  assert.equal(row.cache_read_tokens, 0)
  assert.equal(row.input_tokens, null)
})

test('buildUsageRow: provider-reported cost is kept as provider_reported', () => {
  const rec = { feature: 'x', provider: 'xai', model: 'grok-4', usage: usageFromOpenAICompat({ prompt_tokens: 100, completion_tokens: 10, cost_in_usd_ticks: 5e8 }, 'xai') }
  const row = buildUsageRow(rec, null, 'production')
  assert.equal(row.cost_basis, 'provider_reported')
  close(row.est_cost_usd, 0.05)
})

test('buildUsageRow: error_message is scrubbed and capped; emails/phones never land in actor_id or conversation_ref', () => {
  const row = buildUsageRow({
    feature: 'f', provider: 'anthropic', model: 'm', status: 'error',
    error_message: 'bad key sk-ant-api03-ZZZZZZZZZZZZ for user a@b.com ' + 'x'.repeat(900),
    actor_id: 'student@example.com', conversation_ref: 'someone@x.org',
  }, null, null)
  assert.ok(row.error_message.length <= 500)
  assert.ok(!/sk-ant|a@b\.com/.test(row.error_message))
  assert.equal(row.actor_id, null)
  assert.equal(row.conversation_ref, null)
})

test('buildUsageRow: defaults, clamps and bad enum values are normalised', () => {
  const row = buildUsageRow({ feature: '', provider: 'openai', model: '', status: 'weird', call_kind: 'nope', actor_type: 'robot', http_status: 99999, iterations: -3, latency_ms: -5 }, null, null)
  assert.equal(row.feature, 'unknown')
  assert.equal(row.model, 'unknown')
  assert.equal(row.status, 'ok')
  assert.equal(row.call_kind, 'chat')
  assert.equal(row.actor_type, null)
  assert.equal(row.http_status, null)              // 99999 is not an HTTP status
  assert.equal(row.iterations, null)
  assert.equal(row.latency_ms, null)
  assert.equal(row.stream, null)
  // http_status >= 400 with no explicit status is derived
  assert.equal(buildUsageRow({ feature: 'f', provider: 'openai', model: 'm', http_status: 429 }, null, null).status, 'rate_limited')
  assert.equal(buildUsageRow({ feature: 'f', provider: 'openai', model: 'm', http_status: 503 }, null, null).status, 'error')
})

test('call-record builders: anthropicCallLog prefers the response model, adds stop_reason + request id; SDK _request_id wins', () => {
  const resp = { id: 'msg_01', model: 'claude-sonnet-4-5-20250929', stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }
  Object.defineProperty(resp, '_request_id', { value: 'req_sdk', enumerable: false })
  const rec = anthropicCallLog({ feature: 'ask_ari', model: 'claude-sonnet-4-5', meta: { agent: 'ask_ari' }, iterations: 3 }, 1000, resp, { now: 1500 })
  assert.equal(rec.provider, 'anthropic')
  assert.equal(rec.model, 'claude-sonnet-4-5-20250929')
  assert.equal(rec.latency_ms, 500)
  assert.equal(rec.request_id, 'req_sdk')
  assert.equal(rec.iterations, 3)
  assert.deepEqual(rec.meta, { agent: 'ask_ari', stop_reason: 'tool_use' })
  assert.equal(anthropicRequestId({ id: 'msg_9' }), 'msg_9')
  // a response without a model falls back to the requested one
  assert.equal(anthropicCallLog({ feature: 'f', model: 'req-model' }, 0, { usage: {} }).model, 'req-model')
})

test('call-record builders: httpFailureLog and embeddingCallLog', () => {
  const f = httpFailureLog('anthropic', { feature: 'agent_eval', model: 'm' }, 0, 529, '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}', { now: 40, requestId: 'req_q' })
  assert.deepEqual([f.status, f.http_status, f.error_code, f.request_id, f.latency_ms], ['error', 529, 'overloaded_error', 'req_q', 40])
  const ok = embeddingCallLog({ feature: 'rag_embedding', model: 'text-embedding-3-small', actor_type: 'student' },
    { model: 'text-embedding-3-small', ok: true, latencyMs: 90, httpStatus: 200, promptTokens: 14, totalTokens: 14, requestId: 'req_e' })
  assert.deepEqual([ok.provider, ok.call_kind, ok.status, ok.latency_ms, ok.request_id], ['openai', 'embedding', 'ok', 90, 'req_e'])
  assert.deepEqual(ok.usage, { input_tokens: 14 })
  const bad = embeddingCallLog({ feature: 'rag_embedding', model: 'text-embedding-3-small' }, { model: 'text-embedding-3-small', ok: false, latencyMs: 20, httpStatus: 429, error: 'Rate limit reached for key sk-proj-ABCDEFGHIJ' })
  assert.equal(bad.status, 'rate_limited')
  assert.ok(!bad.error_message.includes('sk-proj'))
  const row = buildUsageRow(ok, EMBED, 'production')
  close(row.est_cost_usd, 14 * 0.02 / 1e6)
})

// ── the logger: never throws, bounded wait, price cache, kill-switch ─────────────────────────────
function harness(over = {}) {
  const inserted = []
  const warns = []
  let priceLoads = 0
  let clock = Date.parse('2026-10-05T00:00:00Z')   // after the fixtures' effective_from
  const deps = {
    insert: async (row) => { inserted.push(row) },
    loadPrices: async () => { priceLoads++; return TABLE },
    timeoutMs: 200,
    now: () => clock,
    isDisabled: () => false,
    vercelEnv: () => 'production',
    warn: (m) => warns.push(m),
    ...over,
  }
  return { log: createLlmLogger(deps), inserted, warns, loads: () => priceLoads, tick: (ms) => { clock += ms } }
}
// price rows must be "effective" at the injected clock — use a far-past effective_from
const OLD = (rows) => rows.map(r => ({ ...r, effective_from: '2000-01-01T00:00:00Z' }))

test('logLlmCall: inserts one priced row', async () => {
  const h = harness({ loadPrices: async () => OLD(TABLE) })
  await h.log(okRec())
  assert.equal(h.inserted.length, 1)
  assert.equal(h.inserted[0].cost_basis, 'computed')
  close(h.inserted[0].est_cost_usd, 0.01437)
  assert.equal(h.inserted[0].vercel_env, 'production')
})

test('logLlmCall: never throws when the insert rejects, throws synchronously, or the record is garbage', async () => {
  await harness({ loadPrices: async () => OLD(TABLE), insert: async () => { throw new Error('db down sk-ant-api03-SECRETSECRET') } }).log(okRec())
  await harness({ insert: () => { throw new Error('sync boom') } }).log(okRec())
  await harness({ loadPrices: () => { throw new Error('sync price boom') } }).log(okRec())
  await harness().log(undefined)
  await harness().log(null)
  await harness().log({ feature: 'x' })
  const circ = {}; circ.c = circ
  await harness().log({ feature: 'f', provider: 'openai', model: 'm', meta: circ })
})

test('logLlmCall: a failing insert warns (scrubbed) once, without leaking the secret', async () => {
  const h = harness({ insert: async () => { throw new Error('db down sk-ant-api03-SECRETSECRET') } })
  await h.log(okRec()); await h.log(okRec())
  assert.equal(h.warns.length, 1)
  assert.ok(!h.warns[0].includes('SECRETSECRET'))
})

test('logLlmCall: a hanging insert is abandoned at the time budget', async () => {
  const h = harness({ insert: () => new Promise(() => {}), timeoutMs: 60 })
  const t0 = Date.now()
  await h.log(okRec())
  const dt = Date.now() - t0
  assert.ok(dt >= 50 && dt < 400, `waited ${dt}ms`)
})

test('logLlmCall: a hanging price loader does not wedge the logger — row still inserted, without a cost', async () => {
  const h = harness({ loadPrices: () => new Promise(() => {}), timeoutMs: 120 })
  const t0 = Date.now()
  await h.log(okRec())
  assert.ok(Date.now() - t0 < 400)
  assert.equal(h.inserted.length, 1)
  assert.equal(h.inserted[0].cost_basis, null)
  assert.equal(h.inserted[0].est_cost_usd, null)
  assert.equal(h.inserted[0].input_tokens, 2095) // usage still recorded
  // and the next call (within the 30 s back-off) does not wait for the loader again
  const t1 = Date.now()
  await h.log(okRec())
  assert.ok(Date.now() - t1 < 60, 'second call should not wait on the dead loader')
  assert.equal(h.inserted.length, 2)
})

test('logLlmCall: a failing price loader still inserts the row (no cost) and recovers after the back-off', async () => {
  let fail = true
  const h = harness({ loadPrices: async () => { if (fail) throw new Error('price select failed'); return OLD(TABLE) } })
  await h.log(okRec())
  assert.equal(h.inserted[0].cost_basis, null)
  fail = false
  await h.log(okRec())                       // still inside the back-off -> still no cost
  assert.equal(h.inserted[1].cost_basis, null)
  h.tick(31_000)
  await h.log(okRec())
  assert.equal(h.inserted[2].cost_basis, 'computed')
})

test('logLlmCall: price table is cached for the TTL, shared across concurrent calls, then reloaded', async () => {
  const h = harness({ loadPrices: async () => { await new Promise(r => setTimeout(r, 15)); h.count++; return OLD(TABLE) } })
  h.count = 0
  await Promise.all([h.log(okRec()), h.log(okRec()), h.log(okRec())])
  assert.equal(h.count, 1, 'concurrent first calls must share one load')
  await h.log(okRec())
  assert.equal(h.count, 1)
  h.tick(5 * 60 * 1000 + 1)
  await h.log(okRec())
  assert.equal(h.count, 2)
  assert.equal(h.inserted.length, 5)
})

test('logLlmCall: a stale cached table is kept if the reload fails', async () => {
  let n = 0
  const h = harness({ loadPrices: async () => { n++; if (n > 1) throw new Error('down'); return OLD(TABLE) } })
  await h.log(okRec())
  h.tick(6 * 60 * 1000)
  await h.log(okRec())
  assert.equal(h.inserted[1].cost_basis, 'computed')
})

test('logLlmCall: kill-switch (injected and via LLM_LOG_DISABLED=1) makes it a pure no-op', async () => {
  const h = harness({ isDisabled: () => true })
  await h.log(okRec())
  assert.equal(h.inserted.length, 0)
  assert.equal(h.loads(), 0)

  const prev = process.env.LLM_LOG_DISABLED
  try {
    const inserted = []
    const log = createLlmLogger({ insert: async (r) => { inserted.push(r) }, loadPrices: async () => OLD(TABLE) })
    process.env.LLM_LOG_DISABLED = '1'
    await log(okRec())
    assert.equal(inserted.length, 0)
    process.env.LLM_LOG_DISABLED = '0'
    await log(okRec())
    assert.equal(inserted.length, 1)
  } finally {
    if (prev === undefined) delete process.env.LLM_LOG_DISABLED; else process.env.LLM_LOG_DISABLED = prev
  }
})

test('kill-switch accepts the same values as the partner logger: "1" and "true" in any case, trimmed', async () => {
  for (const on of ['1', 'true', 'TRUE', 'True', ' true ', ' 1\n']) assert.equal(killSwitchOn(on), true, JSON.stringify(on))
  for (const off of [undefined, null, '', '0', 'false', 'no', 'yes', 'on', '2', 'truee']) assert.equal(killSwitchOn(off), false, JSON.stringify(off))

  // end to end through the real logger (the review's repro: `true` silenced the partner app but not www)
  const prev = process.env.LLM_LOG_DISABLED
  try {
    for (const [value, expectedInserts] of [['true', 0], ['TRUE', 0], ['1', 0], ['0', 1], ['false', 1], [undefined, 1]]) {
      const inserted = []
      const log = createLlmLogger({ insert: async (r) => { inserted.push(r) }, loadPrices: async () => OLD(TABLE) })
      if (value === undefined) delete process.env.LLM_LOG_DISABLED; else process.env.LLM_LOG_DISABLED = value
      await log(okRec())
      assert.equal(inserted.length, expectedInserts, `LLM_LOG_DISABLED=${value}`)
    }
  } finally {
    if (prev === undefined) delete process.env.LLM_LOG_DISABLED; else process.env.LLM_LOG_DISABLED = prev
  }
})

test('vercelEnvOf mirrors the partner rule: VERCEL_ENV, else a non-production NODE_ENV, else null', () => {
  assert.equal(vercelEnvOf({ VERCEL_ENV: 'production' }), 'production')
  assert.equal(vercelEnvOf({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }), 'preview')
  assert.equal(vercelEnvOf({ VERCEL_ENV: 'development', NODE_ENV: 'development' }), 'development')
  assert.equal(vercelEnvOf({ NODE_ENV: 'development' }), 'development')       // local `next dev` holding the prod key
  assert.equal(vercelEnvOf({ NODE_ENV: 'test' }), 'test')
  assert.equal(vercelEnvOf({ NODE_ENV: 'production' }), null)                  // a real non-Vercel production host counts as production
  assert.equal(vercelEnvOf({ NODE_ENV: '' }), null)
  assert.equal(vercelEnvOf({}), null)
})

test('logLlmCall: vercel_env = VERCEL_ENV, else NODE_ENV when not production (local dev rows must not count as production spend)', async () => {
  const prev = { v: process.env.VERCEL_ENV, n: process.env.NODE_ENV }
  const restore = (k, v) => { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  try {
    const inserted = []
    const log = createLlmLogger({ insert: async (r) => { inserted.push(r) }, loadPrices: async () => OLD(TABLE) })
    const run = async (vercel, node) => {
      restore('VERCEL_ENV', vercel); restore('NODE_ENV', node)
      await log(okRec())
    }
    await run('preview', undefined)
    await run(undefined, undefined)
    await run(undefined, 'development')     // the review's repro: was null (= production) before
    await run(undefined, 'production')
    await run('production', 'development')
    assert.deepEqual(inserted.map(r => r.vercel_env), ['preview', null, 'development', null, 'production'])
  } finally {
    restore('VERCEL_ENV', prev.v); restore('NODE_ENV', prev.n)
  }
})

// ── Supabase glue with a fake client ─────────────────────────────────────────────────────────────
function fakeClient({ prices = [], priceError = null, insertError = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      return {
        insert(row) { calls.push(['insert', table, row]); return Promise.resolve({ error: insertError }) },
        select(cols) {
          calls.push(['select', table, cols])
          const q = { order() { calls.push(['order']); return q }, limit(n) { calls.push(['limit', n]); return Promise.resolve({ data: prices, error: priceError }) } }
          return q
        },
      }
    },
  }
}

test('insertUsageRow / loadPriceRows talk to the right tables and surface supabase errors', async () => {
  const ok = fakeClient({ prices: [{ id: 1 }] })
  await insertUsageRow(ok, { feature: 'f' })
  assert.deepEqual(ok.calls[0], ['insert', 'llm_usage_log', { feature: 'f' }])
  assert.deepEqual(await loadPriceRows(ok), [{ id: 1 }])
  assert.equal(ok.calls.find(c => c[0] === 'select')[1], 'llm_model_prices')
  await assert.rejects(insertUsageRow(fakeClient({ insertError: { message: 'permission denied' } }), {}), /permission denied/)
  await assert.rejects(loadPriceRows(fakeClient({ priceError: { message: 'boom' } })), /boom/)
})

test('end to end with a fake client: price load + insert land the expected row', async () => {
  const c = fakeClient({ prices: OLD(TABLE) })
  const log = createLlmLogger({ insert: (r) => insertUsageRow(c, r), loadPrices: () => loadPriceRows(c) })
  await log(okRec())
  const ins = c.calls.find(x => x[0] === 'insert')
  assert.equal(ins[1], 'llm_usage_log')
  assert.equal(ins[2].feature, 'ask_ari')
  assert.equal(ins[2].cost_basis, 'computed')
})

// ── batch + tracking ─────────────────────────────────────────────────────────────────────────────
test('trackCall: returns the SAME response object, logs one row per call (batched), flush waits for the writes', async () => {
  const written = []
  const slowLog = async (rec) => { await new Promise(r => setTimeout(r, 20)); written.push(rec) }
  const batch = new LlmLogBatch(slowLog)
  const resp = { id: 'msg_1', model: 'claude-sonnet-4-5', stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 2 } }
  const build = {
    ok: (r, t0) => anthropicCallLog({ feature: 'ask_ari', model: 'claude-sonnet-4-5', iterations: 1 }, t0, r),
    err: (e, t0) => callErrorLog('anthropic', { feature: 'ask_ari', model: 'claude-sonnet-4-5' }, t0, e),
  }
  const out = await trackCall({ log: slowLog, batch }, build, async () => resp)
  assert.equal(out, resp)                                  // identity: the route sees exactly what the SDK returned
  assert.equal(written.length, 0)                          // not awaited — logging did not delay the caller
  await trackCall({ log: slowLog, batch }, build, async () => resp)
  await batch.flush()
  assert.equal(written.length, 2)
  assert.equal(written[0].status, 'ok')
})

test('trackCall: rethrows the SAME error object; with a batch the failure is queued (not awaited) and written on flush', async () => {
  const written = []
  const log = async (rec) => { await new Promise(r => setTimeout(r, 10)); written.push(rec) }
  const batch = new LlmLogBatch(log)
  const boom = Anthropic.APIError.generate(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, undefined, new Headers())
  const build = { ok: () => { throw new Error('unreachable') }, err: (e, t0) => callErrorLog('anthropic', { feature: 'assistant_professor', model: 'm' }, t0, e) }
  await assert.rejects(trackCall({ log, batch }, build, async () => { throw boom }), (e) => e === boom)
  assert.equal(written.length, 0)                          // the error surfaced without waiting for the insert…
  assert.equal(batch.pending.length, 1)                    // …which is queued for the route's (capped) flush
  await batch.flush()
  assert.equal(written.length, 1)
  assert.equal(written[0].status, 'rate_limited')
  // without a batch there is nobody to flush later, so the failure is awaited inline (each log call self-limits to ~2s)
  await assert.rejects(trackCall({ log }, build, async () => { throw boom }), (e) => e === boom)
  assert.equal(written.length, 2)
})

test('trackCall: a provider error is NOT held behind a hanging log insert (review: visitor waited ~2s for the fallback text)', async () => {
  const never = new Promise(() => {})                                   // an insert that never settles
  const logger = createLlmLogger({ insert: () => never, loadPrices: async () => OLD(TABLE), timeoutMs: 1000 })
  const batch = new LlmLogBatch(logger)
  const boom = Anthropic.APIError.generate(400, { type: 'error', error: { type: 'invalid_request_error', message: 'credit balance is too low' } }, undefined, new Headers())
  const build = { ok: () => { throw new Error('unreachable') }, err: (e, t0) => callErrorLog('anthropic', { feature: 'ask_ari', model: 'm' }, t0, e) }

  const t0 = Date.now()
  await assert.rejects(trackCall({ log: logger, batch }, build, async () => { throw boom }), (e) => e === boom)
  const rethrowMs = Date.now() - t0
  assert.ok(rethrowMs < 150, `rethrow took ${rethrowMs}ms — it must not wait for the log insert`)

  // …and the route's capped flush (LOG_FLUSH_MS) is what bounds the rest: it returns at the cap, not at the 2s ceiling
  const t1 = Date.now()
  await batch.flush(120)
  const flushMs = Date.now() - t1
  assert.ok(flushMs >= 100 && flushMs < 600, `capped flush took ${flushMs}ms`)

  // a slow-but-working insert: still immediate for the caller, and the row is written by the time the flush returns
  const written = []
  const slowBatch = new LlmLogBatch(async (r) => { await new Promise(res => setTimeout(res, 80)); written.push(r) })
  const t2 = Date.now()
  await assert.rejects(trackCall({ log: async () => {}, batch: slowBatch }, build, async () => { throw boom }), (e) => e === boom)
  assert.ok(Date.now() - t2 < 60)
  assert.equal(written.length, 0)
  await slowBatch.flush(750)
  assert.equal(written.length, 1)
  assert.equal(written[0].status, 'error')
})

test('trackCall: a broken logger or record builder can never change the outcome', async () => {
  const resp = { id: 'm', usage: {} }
  const goodBuild = { ok: () => ({ feature: 'f', provider: 'anthropic', model: 'm' }), err: () => ({ feature: 'f', provider: 'anthropic', model: 'm' }) }
  const throwingLog = async () => { throw new Error('log exploded') }
  const syncThrowingLog = () => { throw new Error('sync log exploded') }
  assert.equal(await trackCall({ log: throwingLog }, goodBuild, async () => resp), resp)
  assert.equal(await trackCall({ log: syncThrowingLog }, goodBuild, async () => resp), resp)
  assert.equal(await trackCall({ log: syncThrowingLog, batch: new LlmLogBatch(syncThrowingLog) }, goodBuild, async () => resp), resp)
  const badBuild = { ok: () => { throw new Error('build exploded') }, err: () => { throw new Error('build exploded') } }
  assert.equal(await trackCall({ log: async () => {} }, badBuild, async () => resp), resp)
  const original = new Error('the real failure')
  await assert.rejects(trackCall({ log: async () => {} }, badBuild, async () => { throw original }), (e) => e === original)
  await assert.rejects(trackCall({ log: throwingLog }, goodBuild, async () => { throw original }), (e) => e === original)
})

test('LlmLogBatch.flush: waits for every pending write and is reusable', async () => {
  const done = []
  const batch = new LlmLogBatch(async (r) => { await new Promise(res => setTimeout(res, 15)); done.push(r.feature) })
  batch.add({ feature: 'a', provider: 'openai', model: 'm' })
  batch.add({ feature: 'b', provider: 'openai', model: 'm' })
  assert.equal(done.length, 0)
  await batch.flush()
  assert.deepEqual(done.sort(), ['a', 'b'])
  await batch.flush() // nothing pending: resolves immediately
  batch.add({ feature: 'c', provider: 'openai', model: 'm' })
  await batch.flush()
  assert.equal(done.length, 3)
})

test('LlmLogBatch.flush(maxMs): returns at the cap even if a write is still hanging; the write is not cancelled', async () => {
  let finished = false
  const batch = new LlmLogBatch(async () => { await new Promise(r => setTimeout(r, 300)); finished = true })
  batch.add({ feature: 'slow', provider: 'openai', model: 'm' })
  const t0 = Date.now()
  await batch.flush(40)
  const dt = Date.now() - t0
  assert.ok(dt >= 30 && dt < 200, `flush(40) took ${dt}ms`)
  assert.equal(finished, false)
  await new Promise(r => setTimeout(r, 350))
  assert.equal(finished, true)                       // it carried on in the background
  // and with fast writes the cap is irrelevant
  const fast = new LlmLogBatch(async () => {})
  fast.add({ feature: 'f', provider: 'openai', model: 'm' })
  const t1 = Date.now(); await fast.flush(5000); assert.ok(Date.now() - t1 < 100)
})

test('newTurnId returns distinct uuid-ish ids', () => {
  const a = newTurnId(), b = newTurnId()
  assert.notEqual(a, b)
  assert.match(a, /^[0-9a-f-]{36}$/)
})

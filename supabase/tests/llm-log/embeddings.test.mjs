// embedQuery (src/lib/embeddings.ts) must behave EXACTLY as before for existing callers — same return value, same
// thrown errors — while an optional observer learns about the provider call (usage, latency, failures).
//   node --test supabase/tests/llm-log/embeddings.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { embedQuery, toVectorLiteral } from '../../../src/lib/embeddings.ts'
import { embeddingCallLog, buildUsageRow, normalisePriceRows } from '../../../src/lib/llmLogCore.ts'

const realFetch = globalThis.fetch
const realKey = process.env.OPENAI_API_KEY
function withFetch(impl, fn) {
  return async () => {
    globalThis.fetch = impl
    process.env.OPENAI_API_KEY = 'test-key-not-real'
    try { await fn() } finally {
      globalThis.fetch = realFetch
      if (realKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = realKey
    }
  }
}
const okResponse = (body, headers = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
const VEC = [0.1, 0.2, 0.3]
const GOOD = { object: 'list', data: [{ object: 'embedding', index: 0, embedding: VEC }], model: 'text-embedding-3-small', usage: { prompt_tokens: 14, total_tokens: 14 } }

test('success: returns the vector, sends the same request, reports usage to the observer', withFetch(async (url, init) => {
  assert.equal(url, 'https://api.openai.com/v1/embeddings')
  assert.equal(init.method, 'POST')
  assert.equal(init.headers.Authorization, 'Bearer test-key-not-real')
  assert.deepEqual(JSON.parse(init.body), { model: 'text-embedding-3-small', input: 'hello world' })
  return okResponse(GOOD, { 'x-request-id': 'req_abc' })
}, async () => {
  const reports = []
  const v = await embedQuery('hello   world', (r) => reports.push(r))
  assert.deepEqual(v, VEC)
  assert.equal(reports.length, 1)
  const r = reports[0]
  assert.deepEqual([r.ok, r.model, r.httpStatus, r.promptTokens, r.totalTokens, r.requestId, r.error], [true, 'text-embedding-3-small', 200, 14, 14, 'req_abc', undefined])
  assert.ok(r.latencyMs >= 0)
  // …and the report turns into a priced llm_usage_log row
  const price = normalisePriceRows([{ id: 'e', provider: 'openai', model: 'text-embedding-3-small', match_kind: 'exact', input_per_mtok_usd: 0.02, effective_from: '2026-10-02T00:00:00Z' }], Date.parse('2026-10-05T00:00:00Z'))[0]
  const row = buildUsageRow(embeddingCallLog({ feature: 'rag_embedding', model: 'text-embedding-3-small', actor_type: 'student', actor_id: 'uid-1' }, r), price, 'production')
  assert.equal(row.provider, 'openai')
  assert.equal(row.call_kind, 'embedding')
  assert.equal(row.input_tokens, 14)
  assert.equal(row.cost_basis, 'computed')
  assert.ok(Math.abs(row.est_cost_usd - 14 * 0.02 / 1e6) < 1e-12)
}))

test('works with no observer (existing callers) and the same empty-text normalisation', withFetch(async (_u, init) => {
  assert.equal(JSON.parse(init.body).input, ' ')
  return okResponse(GOOD)
}, async () => {
  assert.deepEqual(await embedQuery(''), VEC)
}))

test('a throwing observer can never break retrieval', withFetch(async () => okResponse(GOOD), async () => {
  const v = await embedQuery('q', () => { throw new Error('observer exploded') })
  assert.deepEqual(v, VEC)
}))

test('HTTP error: identical thrown message as before; the observer sees the failure (429 -> rate_limited)', withFetch(
  async () => new Response('{"error":{"message":"Rate limit reached for key sk-proj-ABCDEFGHIJKL","type":"requests"}}', { status: 429, headers: { 'x-request-id': 'req_429' } }),
  async () => {
    const reports = []
    await assert.rejects(embedQuery('q', (r) => reports.push(r)), (e) => {
      assert.match(e.message, /^OpenAI embeddings \[429\]: /)
      assert.ok(e.message.length <= 'OpenAI embeddings [429]: '.length + 160)
      return true
    })
    assert.equal(reports.length, 1)
    assert.equal(reports[0].ok, false)
    assert.equal(reports[0].httpStatus, 429)
    assert.equal(reports[0].requestId, 'req_429')
    const row = buildUsageRow(embeddingCallLog({ feature: 'rag_embedding', model: 'text-embedding-3-small' }, reports[0]), null, null)
    assert.equal(row.status, 'rate_limited')
    assert.ok(!row.error_message.includes('sk-proj-ABCDEFGHIJKL'), 'a key echoed in an error body must never reach the log')
    assert.equal(row.cost_basis, null)
  },
))

test('network failure: the original error is rethrown unchanged and reported', withFetch(async () => { throw new TypeError('fetch failed') }, async () => {
  const reports = []
  await assert.rejects(embedQuery('q', (r) => reports.push(r)), (e) => e instanceof TypeError && e.message === 'fetch failed')
  assert.equal(reports.length, 1)
  assert.equal(reports[0].ok, false)
  assert.equal(reports[0].httpStatus, undefined)
}))

test('no embedding in the body: same error as before, usage still reported', withFetch(async () => okResponse({ data: [], model: 'text-embedding-3-small', usage: { prompt_tokens: 3, total_tokens: 3 } }), async () => {
  const reports = []
  await assert.rejects(embedQuery('q', (r) => reports.push(r)), /^Error: No embedding returned$/)
  assert.equal(reports[0].ok, false)
  assert.equal(reports[0].promptTokens, 3)
}))

test('invalid JSON: the original parse error propagates and is reported', withFetch(async () => new Response('<html>oops</html>', { status: 200 }), async () => {
  const reports = []
  await assert.rejects(embedQuery('q', (r) => reports.push(r)), SyntaxError)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].ok, false)
}))

test('missing OPENAI_API_KEY: throws as before and makes no provider call (so nothing to report)', async () => {
  const prev = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  let called = false
  globalThis.fetch = async () => { called = true; return okResponse(GOOD) }
  try {
    const reports = []
    await assert.rejects(embedQuery('q', (r) => reports.push(r)), /OPENAI_API_KEY not set/)
    assert.equal(called, false)
    assert.equal(reports.length, 0)
  } finally {
    globalThis.fetch = realFetch
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev
  }
})

test('toVectorLiteral unchanged', () => {
  assert.equal(toVectorLiteral([1, 2.5, -3]), '[1,2.5,-3]')
})

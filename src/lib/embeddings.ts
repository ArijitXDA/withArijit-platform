// OpenAI text-embedding-3-small (1536 dims) — embeds the student's question for RAG
// retrieval over session_transcript_chunks (indexed by the partner app on transcript write).
// Needs OPENAI_API_KEY on the www project; callers treat any throw as "fall back to the
// full transcript", so retrieval is purely additive and can never break the Professor.

const EMBED_MODEL = 'text-embedding-3-small'

/**
 * What one HTTP call to the embeddings endpoint looked like — handed to the optional `onCall` observer so the
 * caller can record usage/cost (the vector is all embedQuery returns). Structurally the same as EmbedCallReport in
 * llmLogCore; declared here so this module stays dependency-free.
 */
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

/** The slice of the embeddings response body we read. */
interface EmbeddingsBody {
  data?: { embedding?: unknown }[]
  model?: unknown
  usage?: { prompt_tokens?: number | null; total_tokens?: number | null }
}

export async function embedQuery(
  text: string,
  /** Optional, additive: told about the provider call (success or failure). Never allowed to affect the result. */
  onCall?: (report: EmbedCallReport) => void,
): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')

  const report = (r: EmbedCallReport) => { try { onCall?.(r) } catch { /* an observer must never break retrieval */ } }
  const t0 = Date.now()

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: (text || ' ').replace(/\s+/g, ' ').slice(0, 8000) }),
    })
  } catch (e) {
    report({ model: EMBED_MODEL, ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : 'fetch failed' })
    throw e
  }
  const requestId = res.headers?.get?.('x-request-id') ?? null
  if (!res.ok) {
    const body = (await res.text()).slice(0, 160)
    report({ model: EMBED_MODEL, ok: false, latencyMs: Date.now() - t0, httpStatus: res.status, requestId, error: body })
    throw new Error(`OpenAI embeddings [${res.status}]: ${body}`)
  }
  let json: EmbeddingsBody | null
  try {
    json = await res.json()
  } catch (e) {
    report({ model: EMBED_MODEL, ok: false, latencyMs: Date.now() - t0, httpStatus: res.status, requestId, error: 'invalid JSON in embeddings response' })
    throw e
  }
  const emb = json?.data?.[0]?.embedding
  report({
    model: typeof json?.model === 'string' && json.model ? json.model : EMBED_MODEL,
    ok: Array.isArray(emb),
    latencyMs: Date.now() - t0,
    httpStatus: res.status,
    promptTokens: json?.usage?.prompt_tokens ?? null,
    totalTokens: json?.usage?.total_tokens ?? null,
    requestId,
    error: Array.isArray(emb) ? undefined : 'No embedding returned',
  })
  if (!Array.isArray(emb)) throw new Error('No embedding returned')
  return emb as number[]
}

/** pgvector wants an embedding as a bracketed literal: '[0.1,0.2,...]'. */
export const toVectorLiteral = (v: number[]) => `[${v.join(',')}]`

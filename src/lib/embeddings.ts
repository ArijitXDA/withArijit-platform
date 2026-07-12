// OpenAI text-embedding-3-small (1536 dims) — embeds the student's question for RAG
// retrieval over session_transcript_chunks (indexed by the partner app on transcript write).
// Needs OPENAI_API_KEY on the www project; callers treat any throw as "fall back to the
// full transcript", so retrieval is purely additive and can never break the Professor.

const EMBED_MODEL = 'text-embedding-3-small'

export async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: (text || ' ').replace(/\s+/g, ' ').slice(0, 8000) }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings [${res.status}]: ${(await res.text()).slice(0, 160)}`)
  const json = await res.json()
  const emb = json?.data?.[0]?.embedding
  if (!Array.isArray(emb)) throw new Error('No embedding returned')
  return emb as number[]
}

/** pgvector wants an embedding as a bracketed literal: '[0.1,0.2,...]'. */
export const toVectorLiteral = (v: number[]) => `[${v.join(',')}]`

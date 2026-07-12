-- pgvector RAG for session transcripts → Assistant Professor retrieval.
-- Chunks of each session's transcript_text are embedded (OpenAI text-embedding-3-small,
-- 1536 dims) and stored here; the Professor retrieves the top-K relevant chunks per
-- question instead of stuffing the whole transcript. Additive — the Professor falls back
-- to full transcript_text when a session has no chunks yet.
create extension if not exists vector;

create table if not exists public.session_transcript_chunks (
  id             bigint generated always as identity primary key,
  batch_id       uuid    not null,
  session_number int     not null,
  chunk_index    int     not null,
  content        text    not null,
  embedding      vector(1536),
  token_estimate int,
  created_at     timestamptz not null default now(),
  unique (batch_id, session_number, chunk_index)
);

create index if not exists idx_stc_batch_session
  on public.session_transcript_chunks (batch_id, session_number);

-- HNSW cosine ANN index (no training step; fine for a small, growing table).
create index if not exists idx_stc_embedding_hnsw
  on public.session_transcript_chunks
  using hnsw (embedding vector_cosine_ops);

-- Service-role-only: RLS on with no policies so anon/authenticated can never read
-- the raw transcript chunks; the service-role client (bypasses RLS) does the work.
alter table public.session_transcript_chunks enable row level security;

-- Retrieval: top-K chunks for ONE session, ranked by cosine similarity to a query embedding.
create or replace function public.match_session_chunks(
  p_batch_id        uuid,
  p_session_number  int,
  p_query_embedding vector(1536),
  p_match_count     int default 8
)
returns table (chunk_index int, content text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select c.chunk_index,
         c.content,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.session_transcript_chunks c
  where c.batch_id = p_batch_id
    and c.session_number = p_session_number
    and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit greatest(1, least(coalesce(p_match_count, 8), 20))
$$;

-- LOCK DOWN — Supabase default-grants EXECUTE to anon+authenticated on new public fns.
revoke execute on function public.match_session_chunks(uuid, int, vector, int) from public, anon, authenticated;
grant  execute on function public.match_session_chunks(uuid, int, vector, int) to service_role;

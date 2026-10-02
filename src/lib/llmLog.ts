// LLM call log — the DB half (www). Pure logic (pricing, normalisers, scrubbing, the injectable logger) lives in
// ./llmLogCore so it can be unit-tested without Next/Supabase; this file only wires it to the shared service-role
// client. Rows go to the same llm_usage_log table the partner app writes to (app = 'www').
//
// Usage at a call site:
//   const logs = new LlmLogBatch(logLlmCall)                       // several provider calls per user turn
//   const res = await trackAnthropic({ feature: 'ask_ari', model: 'claude-sonnet-4-5', ... }, () => client.messages.create(...), logs)
//   ...                                                            // success is logged without waiting
//   await logs.flush()                                             // once, after the response data is in hand
//   ...and `await logs.flush(750)` in the error path too: a failed call is only QUEUED by trackAnthropic (so the
//   error surfaces at once), and this is what gets it written before the response is finished.
//
// Kill-switch: LLM_LOG_DISABLED=1 (or "true") turns every call here into a no-op. Logging never throws and never waits > ~2s.

import { createServiceClient } from '@/lib/supabase/service'
import {
  AGENT_EVAL_HEADER,
  LlmLogBatch,
  anthropicCallLog,
  callErrorLog,
  createLlmLogger,
  insertUsageRow,
  isAgentEvalRequest,
  loadPriceRows,
  signAgentEval,
  trackCall,
  type AnthropicMessageLike,
  type CallBase,
  type LlmCallLog,
} from './llmLogCore'

export * from './llmLogCore'

// Created lazily and kept for the life of the lambda. A missing env var must surface as a swallowed log failure,
// never as an import-time crash of the route that merely imports this module.
let client: ReturnType<typeof createServiceClient> | null = null
function db() {
  if (!client) client = createServiceClient()
  return client
}

export const logLlmCall: (rec: LlmCallLog) => Promise<void> = createLlmLogger({
  insert: (row) => insertUsageRow(db(), row),
  loadPrices: () => loadPriceRows(db()),
})

// The eval harness proves itself to Ask Ari with a signed header (see llmLogCore "eval-harness proof"). The key is
// derived from the service-role key both ends already have (one app, one deployment) — it never leaves the server.
const evalSecret = () => process.env.SUPABASE_SERVICE_ROLE_KEY

/** Headers the in-app eval harness adds to its call to /api/agent/visitor (empty if it cannot sign — then it just isn't labelled). */
export async function agentEvalHeaders(): Promise<Record<string, string>> {
  const value = await signAgentEval(evalSecret())
  return value ? { [AGENT_EVAL_HEADER]: value } : {}
}

/** True only when the request carries a valid, fresh eval-harness proof. The page path / body are never consulted. */
export function isAgentEvalCall(headers: { get(name: string): string | null }): Promise<boolean> {
  return isAgentEvalRequest(headers, evalSecret())
}

/** A batch wired to the real logger. */
export function newLlmLogBatch(): LlmLogBatch {
  return new LlmLogBatch(logLlmCall)
}

/**
 * Wrap one Anthropic `messages.create` (or anything resolving to a Message-shaped object): returns exactly what the
 * call returned, or rethrows exactly what it threw — logging happens on the side and can never alter the outcome.
 */
export function trackAnthropic<T extends AnthropicMessageLike>(
  base: CallBase,
  call: () => Promise<T>,
  batch?: LlmLogBatch,
): Promise<T> {
  return trackCall<T>(
    { log: logLlmCall, batch },
    {
      ok: (resp, t0) => anthropicCallLog({ ...base }, t0, resp),
      err: (e, t0) => callErrorLog('anthropic', { ...base }, t0, e),
    },
    call,
  )
}

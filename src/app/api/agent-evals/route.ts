/**
 * GET /api/agent-evals  — Phase-4D behavioural evals (www)
 *
 * Admin-gated (shared admin_users table). Runs the highest-risk guardrails as
 * real, end-to-end behavioural checks. Ask Ari is public (no auth), so we hit
 * its live endpoint and assert on the streamed reply — no extraction, no risk to
 * the agent. Each case costs a few tokens, so this is admin-only and on-demand.
 *
 *   GET /api/agent-evals          → run all
 *   GET /api/agent-evals?only=ari → run only Ari cases
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getPlatformFacts, platformFactsBlock } from '@/lib/platformFacts'
import { buildSystemPrompt, ASSISTANT_PROFESSOR_TOOLS } from '@/lib/assistantProfessorPrompt'

type Assertion = { mustInclude?: RegExp[]; mustNotInclude?: RegExp[] }
type Case = { agent: string; name: string; message: string } & Assertion

const ARI_CASES: Case[] = [
  {
    agent: 'ari',
    name: 'pricing honesty — "is it free?" must quote ₹3,999',
    message: 'Is the AI Masterclass free?',
    mustInclude: [/3,?999/],
  },
  {
    agent: 'ari',
    name: 'free webinar offered on a price objection',
    message: '₹3,999 feels too expensive for me right now. Is there any free way to experience it first?',
    mustInclude: [/webinar\.ostaran\.com/i],
  },
  {
    agent: 'ari',
    name: 'no unprompted free webinar on a cold masterclass query',
    message: 'Tell me about the AI Masterclass — what is it?',
    mustNotInclude: [/webinar\.ostaran\.com/i],
  },
  {
    agent: 'ari',
    name: 'enterprise / 1:1 project help → routes to Expert Consultation page',
    message: 'I run a company and I want an expert to advise my team on a specific Agentic AI project — not a course. What do you offer?',
    mustInclude: [/expert-consultation/i],
  },
]

// Assistant Professor tool-routing cases (run via one Anthropic turn with its
// REAL prompt + tools on a synthetic near-graduation student fixture).
const PROF_CASES = [
  { agent: 'professor', name: 'wants to keep learning → note_membership_interest', message: "I'm almost done with my course. What can I do next to keep learning advanced AI and Quantum Computing?", mustCall: ['note_membership_interest'] },
  { agent: 'professor', name: 'escalate a doubt to the live class → log_doubt', message: "I still don't get backpropagation even after the session. Please make sure Arijit covers it again in the next live class for me.", mustCall: ['log_doubt'] },
]

const PROF_CTX = {
  studentName: 'Eval Tester', email: 'eval@test.local', courseName: 'AI Mastery Programme',
  occupation: 'Software Engineer', batchLabel: 'Test Batch', variant: 'weekend9',
  cohortRange: null, sessionsTotal: 9, sessionsPast: 8, durationMins: 120,
  certCount: 1, daysSinceLogin: 0, enrolmentCount: 1, next: null,
}

// One non-streaming Anthropic turn with the Professor's real prompt + tools;
// return which tools the model chose to call.
async function profToolNames(message: string): Promise<string[]> {
  const system = buildSystemPrompt(PROF_CTX) + '\n\n' + platformFactsBlock(await getPlatformFacts())
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1024, system, tools: ASSISTANT_PROFESSOR_TOOLS, messages: [{ role: 'user', content: message }] }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return (data.content || []).filter((b: any) => b.type === 'tool_use').map((b: any) => b.name)
}

// Drive Ask Ari end-to-end and collect its streamed reply text.
async function runAri(origin: string, message: string): Promise<string> {
  const res = await fetch(`${origin}/api/agent/visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // No sessionToken → Ari doesn't persist a visitor_chat_sessions row.
    body: JSON.stringify({ messages: [{ role: 'user', content: message }], pagePath: '/__eval' }),
  })
  if (!res.ok || !res.body) throw new Error(`Ari endpoint ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of dec.decode(value).split('\n')) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      try { const j = JSON.parse(payload); if (typeof j.text === 'string') text += j.text } catch { /* ignore */ }
    }
  }
  return text
}

function evaluate(c: Case, reply: string) {
  const fails: string[] = []
  for (const re of c.mustInclude ?? []) if (!re.test(reply)) fails.push(`expected to match ${re}`)
  for (const re of c.mustNotInclude ?? []) if (re.test(reply)) fails.push(`should NOT match ${re}`)
  return { ok: fails.length === 0, fails }
}

export async function GET(req: NextRequest) {
  // ── admin gate (shared admin_users table) ──────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const svc = createServiceClient()
  const { data: admin } = await svc.from('admin_users').select('id').eq('email', user.email).eq('status', 'active').maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const only = req.nextUrl.searchParams.get('only')
  const origin = req.nextUrl.origin
  const results: any[] = []

  // Ari — end-to-end against the live public endpoint, assert on the reply text.
  if (!only || only === 'ari') {
    for (const c of ARI_CASES) {
      try {
        const reply = await runAri(origin, c.message)
        const ev = evaluate(c, reply)
        results.push({ agent: c.agent, name: c.name, ok: ev.ok, fails: ev.fails, reply: reply.slice(0, 400) })
      } catch (e: any) {
        results.push({ agent: c.agent, name: c.name, ok: false, fails: [e?.message || 'run error'], reply: '' })
      }
    }
  }

  // Professor — real prompt + tools via one Anthropic turn, assert tool routing.
  if (!only || only === 'professor') {
    for (const c of PROF_CASES) {
      try {
        const called = await profToolNames(c.message)
        const missing = c.mustCall.filter(t => !called.includes(t))
        results.push({ agent: c.agent, name: c.name, ok: missing.length === 0, called, missing })
      } catch (e: any) {
        results.push({ agent: c.agent, name: c.name, ok: false, fails: [e?.message || 'run error'] })
      }
    }
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json({
    suite: 'behavioural',
    ok: failed.length === 0,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  })
}

'use client'

import { useState } from 'react'

type SessionRow = {
  num: number
  title: string
  highlight?: string
}

// Generic 26-session journey — works across all course categories
// The 'highlight' field marks milestone sessions
const SESSIONS: SessionRow[] = [
  { num: 1,  title: 'Welcome to AI — Your First Build (Day 1)',         highlight: '🎉 First build' },
  { num: 2,  title: 'How LLMs Work — Intuition Without the Jargon' },
  { num: 3,  title: 'Advanced Prompt Engineering — Get 10x Better Results' },
  { num: 4,  title: 'Claude API Deep Dive — Streaming, Tools, Memory' },
  { num: 5,  title: 'AI Agents — Architecture and Tool Calling' },
  { num: 6,  title: 'Building Your First Autonomous Agent' },
  { num: 7,  title: 'Memory Systems — Short-Term and Long-Term' },
  { num: 8,  title: 'Agent Project 1 — Customer Support Agent (Build)' , highlight: '🤖 Project 1 start' },
  { num: 9,  title: 'Agent Project 1 — Deploy and Test in Production' },
  { num: 10, title: 'Multi-Agent Systems — CrewAI and LangGraph' },
  { num: 11, title: 'MCP — Model Context Protocol Deep Dive' },
  { num: 12, title: 'Build Your Own MCP Server' },
  { num: 13, title: 'Agent Project 2 — Multi-Agent Research Generator',  highlight: '🏅 Interim Certificate' },
  { num: 14, title: 'Agent Project 2 — Streaming Output and Refinement' },
  { num: 15, title: 'Vector Databases — Embeddings and Semantic Search' },
  { num: 16, title: 'RAG Foundations — Chunking, Retrieval, Re-ranking' },
  { num: 17, title: 'Agentic RAG — Agent-Driven Document Traversal' },
  { num: 18, title: 'RAG Project 3 — 1,000-Document Knowledge Platform',  highlight: '📚 Project 3 start' },
  { num: 19, title: 'RAG Project 3 — Production Hardening and Launch' },
  { num: 20, title: 'Vibe Coding — Ship SaaS in Days Not Months' },
  { num: 21, title: 'Full-Stack AI SaaS — Database, Auth, Backend' },
  { num: 22, title: 'SaaS Project 4 — Build Your AI Product (Day 1)',     highlight: '🚀 Project 4 start' },
  { num: 23, title: 'SaaS Project 4 — Payments, Subscriptions, Billing' },
  { num: 24, title: 'SaaS Project 4 — Deploy and Go Live' },
  { num: 25, title: 'AI Safety, Ethics, and Enterprise Governance' },
  { num: 26, title: 'Portfolio Review, Certification & What\'s Next',      highlight: '🏆 Completion Certificate' },
]

const QUANTUM_SESSIONS: SessionRow[] = [
  { num: 1,  title: 'Classical Computing Limits — Why We Need Quantum',    highlight: '🎉 First build' },
  { num: 2,  title: 'Qubits, Superposition & Entanglement — Intuition First' },
  { num: 3,  title: 'Quantum Gates and Circuits — Hands-On with Qiskit' },
  { num: 4,  title: 'Grover\'s Algorithm — Quantum Search Explained' },
  { num: 5,  title: 'Shor\'s Algorithm — Why RSA Will Break' },
  { num: 6,  title: 'Quantum Advantage in Optimisation and Simulation' },
  { num: 7,  title: 'Quantum Machine Learning — Where AI Meets Quantum' },
  { num: 8,  title: 'Quantum Neural Networks and Variational Algorithms' },
  { num: 9,  title: 'Quantum Hardware — IBM, Google, IonQ Deep Dive' },
  { num: 10, title: 'Post-Quantum Cryptography — Securing the Future',       highlight: '🔐 Security module' },
  { num: 11, title: 'Enterprise Quantum Strategy — Preparing Your Organisation' },
  { num: 12, title: 'Quantum + AI Convergence — The Next Decade' },
  { num: 13, title: 'Final Project, Portfolio Review & Certification',        highlight: '🏆 Completion Certificate' },
]

const SHOW_INITIAL = 13

export function CourseSessionJourney({ category = 'default' }: { category?: string }) {
  const isQuantum = category === 'quantum'
  const ALL_SESSIONS = isQuantum ? QUANTUM_SESSIONS : SESSIONS
  const showExpand = !isQuantum  // quantum has exactly 13 — no expand needed
  const [expanded, setExpanded] = useState(false)
  const visible = (expanded || isQuantum) ? ALL_SESSIONS : ALL_SESSIONS.slice(0, SHOW_INITIAL)

  return (
    <section className="py-16 px-4" style={{ background: '#06080f' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            The 26-Session Journey
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-3">Session by Session</h2>
          <p className="text-slate-500 text-sm">Every session is live, hands-on, and builds directly on the one before it</p>
        </div>

        {/* Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

          {/* Column headers */}
          <div className="grid grid-cols-[48px_1fr_auto] px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b"
            style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }}>
            <span>#</span>
            <span>Session Title</span>
            <span className="text-right">Milestone</span>
          </div>

          {visible.map((s, i) => (
            <div
              key={s.num}
              className="grid grid-cols-[48px_1fr_auto] items-center px-4 py-3 border-b transition-colors hover:bg-white/[0.02]"
              style={{
                borderColor: 'rgba(255,255,255,0.05)',
                background: s.highlight ? 'rgba(99,102,241,0.06)' : i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}>

              {/* Session number */}
              <span className="text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: s.highlight ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                  color: s.highlight ? '#a5b4fc' : '#475569',
                }}>
                {s.num}
              </span>

              {/* Title */}
              <span className="text-sm pl-1"
                style={{ color: s.highlight ? '#e2e8f0' : '#94a3b8' }}>
                {s.title}
              </span>

              {/* Milestone badge */}
              <div className="text-right">
                {s.highlight && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', whiteSpace: 'nowrap' }}>
                    {s.highlight}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Show/hide row */}
          {!expanded && (
            <div className="py-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          )}
        </div>

        {/* Expand / collapse button */}
        {showExpand && (
          <div className="text-center mt-5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border transition-all hover:border-indigo-500/60 hover:bg-indigo-500/10"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#94a3b8',
              }}>
              {expanded ? (
                <>Show less ↑</>
              ) : (
                <>Show all 26 sessions ↓ <span className="text-xs opacity-60">(Sessions 14–26)</span></>
              )}
            </button>
          </div>
        )}

        {/* Key callouts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {(isQuantum ? [
            { label: '13 Sessions', sub: 'Live, weekend only' },
            { label: '60 min each', sub: 'No weekday disruption' },
            { label: '1 Project', sub: 'Built live, yours to keep' },
            { label: '1 Certificate', sub: 'On completion' },
          ] : [
            { label: '26 Sessions', sub: 'Live, weekend only' },
            { label: '60 min each', sub: 'No weekday disruption' },
            { label: '4 Projects', sub: 'Built live, yours to keep' },
            { label: '2 Certificates', sub: 'Session 13 + completion' },
          ]).map(({ label, sub }) => (
            <div key={label} className="text-center py-4 rounded-xl border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-bold text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

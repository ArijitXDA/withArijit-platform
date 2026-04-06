'use client'

import { useState } from 'react'

type Module = {
  num: number
  title: string
  sessions: string
  color: string
  accent: string
  topics: string[]
}

const CURRICULUM: Record<string, Module[]> = {
  // ── Tech Developers ─────────────────────────────────────────────────────────
  tech: [
    {
      num: 1, sessions: 'Sessions 1–4', color: 'rgba(99,102,241,0.12)', accent: '#818cf8',
      title: 'Foundations of Agentic AI',
      topics: [
        'LLM internals — how transformers work under the hood',
        'Prompt engineering: system prompts, chain-of-thought, few-shot',
        'Claude API — streaming, tool use, multi-turn memory',
        'Dev environment: Claude Code, Cursor, GitHub Copilot setup',
      ],
    },
    {
      num: 2, sessions: 'Sessions 5–9', color: 'rgba(168,85,247,0.12)', accent: '#c084fc',
      title: 'Building AI Agents',
      topics: [
        'Agent architecture: ReAct, Plan-Execute, tool-calling loops',
        'Tool definition, chaining, and error-recovery patterns',
        'Memory systems: short-term, long-term, episodic',
        'Build: Autonomous customer support agent (project 1)',
      ],
    },
    {
      num: 3, sessions: 'Sessions 10–14', color: 'rgba(20,184,166,0.12)', accent: '#2dd4bf',
      title: 'Multi-Agent Orchestration & MCP',
      topics: [
        'CrewAI and LangGraph for multi-agent systems',
        'Model Context Protocol (MCP) — build and consume MCP servers',
        'Supervisor agents, parallel execution, handoffs',
        'Build: Multi-agent research and report generator (project 2)',
      ],
    },
    {
      num: 4, sessions: 'Sessions 15–19', color: 'rgba(234,179,8,0.12)', accent: '#facc15',
      title: 'Agentic RAG & Vector Systems',
      topics: [
        'Vector embeddings, semantic search, re-ranking strategies',
        'Production RAG: chunking, retrieval, hallucination reduction',
        'Agentic RAG — agent-driven document traversal and Q&A',
        'Build: Knowledge platform with 1,000+ document handling (project 3)',
      ],
    },
    {
      num: 5, sessions: 'Sessions 20–26', color: 'rgba(239,68,68,0.12)', accent: '#f87171',
      title: 'Vibe Coding — SaaS Product Launch',
      topics: [
        'Vibe Coding methodology: ship SaaS in days not months',
        'Claude Code + Cursor for full-stack Next.js + Supabase development',
        'Authentication, billing, subscriptions, deployment pipelines',
        'Build: Complete SaaS AI product — commercially deployable (project 4)',
      ],
    },
    {
      num: 6, sessions: 'All 26 sessions', color: 'rgba(99,102,241,0.08)', accent: '#6366f1',
      title: 'AI Safety, Enterprise & Ethics',
      topics: [
        'Responsible AI: bias, hallucination, and failure mode management',
        'Enterprise AI architecture — security, cost, compliance',
        'AI product roadmap and go-to-market strategy',
        'Portfolio review and certification',
      ],
    },
  ],

  // ── School ───────────────────────────────────────────────────────────────────
  school: [
    {
      num: 1, sessions: 'Sessions 1–4', color: 'rgba(99,102,241,0.12)', accent: '#818cf8',
      title: 'What Is AI? (No jargon)',
      topics: [
        'How AI thinks — explained with simple everyday examples',
        'ChatGPT vs Claude vs Gemini — what\'s actually different',
        'Your first AI project — built live in session 1',
        'Prompt writing that actually works',
      ],
    },
    {
      num: 2, sessions: 'Sessions 5–9', color: 'rgba(168,85,247,0.12)', accent: '#c084fc',
      title: 'AI Tools for School',
      topics: [
        'AI for essays, research, and studying — the right way',
        'Using AI for maths, science, and exam prep',
        'Building AI-powered study tools',
        'Academic integrity: what\'s allowed, what\'s not',
      ],
    },
    {
      num: 3, sessions: 'Sessions 10–14', color: 'rgba(20,184,166,0.12)', accent: '#2dd4bf',
      title: 'Build Your First AI Project',
      topics: [
        'No-code and low-code AI building',
        'AI chatbots — build one for your school club or project',
        'AI image and content generation',
        'Present your project live in class',
      ],
    },
    {
      num: 4, sessions: 'Sessions 15–19', color: 'rgba(234,179,8,0.12)', accent: '#facc15',
      title: 'AI for College Readiness',
      topics: [
        'AI skills that impress college interviewers',
        'Building a portfolio before Class 12',
        'AI competitions, scholarships and how to apply',
        'How to talk about AI in interviews and essays',
      ],
    },
    {
      num: 5, sessions: 'Sessions 20–26', color: 'rgba(239,68,68,0.12)', accent: '#f87171',
      title: 'Future of AI — Be Ready',
      topics: [
        'Careers in AI — which jobs pay and which will disappear',
        'AGI explained: what it means for your generation',
        'AI ethics and why it matters to you',
        'Final project showcase and certification',
      ],
    },
    {
      num: 6, sessions: 'Throughout', color: 'rgba(99,102,241,0.08)', accent: '#6366f1',
      title: 'AI Class Monitor — Your 24/7 Tutor',
      topics: [
        'Ask questions anytime in Hindi, English, or your language',
        'Get homework and project help at 2am',
        'Concept explanations that match your level',
        'Lifetime access even after the course',
      ],
    },
  ],

  // ── Quantum Computing & AI ─────────────────────────────────────────────────
  quantum: [
    {
      num: 1, sessions: 'Sessions 1–3', color: 'rgba(99,102,241,0.12)', accent: '#818cf8',
      title: 'Classical Computing Limits & Quantum Fundamentals',
      topics: [
        'Why classical computers hit a wall — and what quantum changes',
        'Qubits, superposition, entanglement — intuition-first explanations',
        'Quantum gates and circuits — the building blocks',
        'Quantum vs classical: where the advantage actually is',
      ],
    },
    {
      num: 2, sessions: 'Sessions 4–6', color: 'rgba(168,85,247,0.12)', accent: '#c084fc',
      title: 'Quantum Algorithms & Applications',
      topics: [
        'Grover’s and Shor’s algorithms — why they matter for business',
        'Quantum advantage in optimisation, cryptography, and simulation',
        'NISQ era: what you can do today vs what’s coming',
        'Real-world use cases: pharma, finance, logistics, defence',
      ],
    },
    {
      num: 3, sessions: 'Sessions 7–9', color: 'rgba(20,184,166,0.12)', accent: '#2dd4bf',
      title: 'Quantum Machine Learning',
      topics: [
        'Where quantum meets AI — the convergence explained',
        'Quantum neural networks and variational algorithms',
        'QML vs classical ML — when quantum wins',
        'Hands-on: quantum circuits with Qiskit',
      ],
    },
    {
      num: 4, sessions: 'Sessions 10–13', color: 'rgba(234,179,8,0.12)', accent: '#facc15',
      title: 'Quantum Strategy, Security & Future',
      topics: [
        'Post-quantum cryptography — why your data is at risk today',
        'Quantum computing roadmap: IBM, Google, IonQ timelines',
        'Enterprise quantum strategy — how to prepare your organisation',
        'Final project and certification',
      ],
    },
  ],

  // ── Default (Working Professionals, General, CXO, Entrepreneurs, Homemakers) ─
  default: [
    {
      num: 1, sessions: 'Sessions 1–4', color: 'rgba(99,102,241,0.12)', accent: '#818cf8',
      title: 'AI Literacy & Mindset',
      topics: [
        'How LLMs actually work — no jargon, just intuition',
        'ChatGPT, Claude, Gemini — which to use when and why',
        'Advanced prompt engineering: get 10x better results instantly',
        'AI tools for your specific job function or business',
      ],
    },
    {
      num: 2, sessions: 'Sessions 5–9', color: 'rgba(168,85,247,0.12)', accent: '#c084fc',
      title: 'AI in Your Work & Business',
      topics: [
        'Automate your most time-consuming daily tasks with AI',
        'AI for email, reports, presentations, and client communication',
        'Build AI workflows without coding (no-code tools)',
        'AI for your industry: finance, marketing, HR, operations, healthcare',
      ],
    },
    {
      num: 3, sessions: 'Sessions 10–14', color: 'rgba(20,184,166,0.12)', accent: '#2dd4bf',
      title: 'Build AI Tools & Agents',
      topics: [
        'What AI agents are — and how they can work for you 24/7',
        'Build your first AI agent without deep coding',
        'Automate customer support, research, and reporting',
        'Live project: AI assistant for your use case',
      ],
    },
    {
      num: 4, sessions: 'Sessions 15–19', color: 'rgba(234,179,8,0.12)', accent: '#facc15',
      title: 'AI Strategy & Leadership',
      topics: [
        'How to lead AI adoption in your organisation or team',
        'Evaluating AI vendors, tools, and ROI',
        'AI governance: risk, bias, compliance, and ethics',
        'Presenting AI strategy to leadership and investors',
      ],
    },
    {
      num: 5, sessions: 'Sessions 20–26', color: 'rgba(239,68,68,0.12)', accent: '#f87171',
      title: 'Advanced AI & Future-Proofing',
      topics: [
        'Agentic AI, AGI timelines — what\'s actually coming',
        'Quantum Computing and AI — what leaders need to know',
        'Building AI ventures and consulting income streams',
        'Final project, portfolio review, certification',
      ],
    },
    {
      num: 6, sessions: 'Throughout', color: 'rgba(99,102,241,0.08)', accent: '#6366f1',
      title: 'AI Class Monitor — Always With You',
      topics: [
        'Ask follow-up questions in your language any time of day',
        'Get concept explanations that match your background',
        'Project help and industry-specific guidance',
        'Lifetime access — use it months and years after the course',
      ],
    },
  ],
}

// Map audience_category → curriculum key
function getCurriculumKey(category: string): keyof typeof CURRICULUM {
  if (category === 'tech') return 'tech'
  if (category === 'school') return 'school'
  if (category === 'quantum') return 'quantum'
  return 'default'   // covers working_professionals, college, cxo, default, general
}

export function CourseCurriculum({
  subjects,
  category = 'default',
}: {
  subjects: string[]
  category?: string
}) {
  const key = getCurriculumKey(category)
  const modules = CURRICULUM[key]
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="py-16 px-4" style={{ background: '#07080f' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            What You&apos;ll Learn
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-3">Curriculum Highlights</h2>
          <p className="text-slate-500 text-sm">Live hands-on sessions — no slides, no theory dumps, just building</p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3 mb-10">
          {modules.map((mod, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={mod.num}
                className="rounded-2xl border overflow-hidden transition-all"
                style={{
                  borderColor: isOpen ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)',
                  background: isOpen ? mod.color : 'rgba(255,255,255,0.02)',
                }}>

                {/* Module header (always visible) */}
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                      style={{ background: mod.color, color: mod.accent, border: `1px solid ${mod.accent}40` }}>
                      {mod.num}
                    </span>
                    <div>
                      <p className="text-white font-bold text-sm leading-snug">{mod.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: mod.accent }}>{mod.sessions}</p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-lg shrink-0"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ↓
                  </span>
                </button>

                {/* Topics (revealed when open) */}
                {isOpen && (
                  <div className="px-5 pb-5">
                    <div className="border-t pt-4 flex flex-col gap-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      {mod.topics.map((topic, ti) => (
                        <div key={ti} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: mod.accent }} />
                          <p className="text-slate-300 text-sm leading-relaxed">{topic}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Tech tags — secondary display */}
        {subjects.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs text-center mb-3">Technologies you&apos;ll work with:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {subjects.map((s: string, i: number) => (
                <span key={s}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                  }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: `hsl(${(i * 37) % 360}, 60%, 60%)` }} />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

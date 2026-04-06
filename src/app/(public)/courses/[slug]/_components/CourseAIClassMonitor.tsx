'use client'

import { useState } from 'react'

const FEATURES = [
  {
    icon: '🧠',
    title: 'Explains Any Concept',
    desc: 'Ask it to break down any session topic — from LLM architecture to MCP protocols — in plain language, with examples.',
  },
  {
    icon: '🐛',
    title: 'Debugs Your Code',
    desc: 'Paste your code, describe the error, and Class Monitor walks you through exactly what went wrong and how to fix it.',
  },
  {
    icon: '🌍',
    title: '100+ Languages',
    desc: 'Ask in Hindi, Tamil, Bengali, Marathi, Telugu, Kannada, or any of 100+ languages. Class Monitor responds in the same language.',
  },
  {
    icon: '⏰',
    title: '24/7 — Never Offline',
    desc: 'Stuck at 2am before a session? Class Monitor is always available — no waiting, no tickets, no office hours.',
  },
  {
    icon: '📚',
    title: 'Knows Your Curriculum',
    desc: "Trained on your exact course sessions. It knows what you've covered, what's coming, and gives context-aware answers.",
  },
  {
    icon: '🎯',
    title: 'Session-Specific Help',
    desc: 'Tell it which session you\'re on and it gives targeted, relevant help — not generic AI answers from the internet.',
  },
]

const DEMO_EXCHANGES = [
  {
    q: 'What is an AI agent and how is it different from a chatbot?',
    a: 'Great question from Session 3! A chatbot simply responds to messages using pre-written logic or LLMs. An AI agent is autonomous — it has access to tools, memory, and can take sequences of actions to complete multi-step tasks without needing you to guide each step. Think of a chatbot as a vending machine and an agent as a personal assistant who can actually go do things for you.',
  },
  {
    q: 'मेरा code काम नहीं कर रहा है — error आ रही है: "TypeError: NoneType is not iterable"',
    a: 'यह error तब आती है जब आप किसी None value पर loop चलाने की कोशिश करते हैं। सबसे common कारण: आपका function कुछ return नहीं कर रहा, या API response None आ गई। अपना code paste करें, main मैं देखता हूँ कहाँ गड़बड़ है।',
  },
  {
    q: 'Can I use Class Monitor after the course ends?',
    a: 'Yes — you have lifetime access to Class Monitor just like your session recordings. Any time you\'re building something months later and get stuck, Class Monitor is still there for you.',
  },
]

export function CourseAIClassMonitor() {
  const [activeDemoIdx, setActiveDemoIdx] = useState(0)
  const demo = DEMO_EXCHANGES[activeDemoIdx]

  return (
    <section className="py-20 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1530 50%, #0a0f1e 100%)' }}>

      {/* Subtle grid bg */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="max-w-6xl mx-auto relative">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }}>
            🤖 World&apos;s First AI Tutor Built Into a Course
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
            Meet <span style={{ color: '#818cf8' }}>AI Class Monitor</span>
          </h2>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Every oStaran student gets a personal AI tutor — available 24/7, trained on your exact curriculum, 
            and fluent in over 100 languages. No other programme in the world offers this.
          </p>
        </div>

        {/* Main card — two columns */}
        <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">

          {/* Left: features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title}
                className="rounded-2xl p-5 border transition-all hover:border-indigo-500/40"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}>
                <div className="text-2xl mb-3">{icon}</div>
                <p className="text-white font-bold text-sm mb-1.5">{title}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Right: live demo chat */}
          <div className="rounded-3xl border overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(99,102,241,0.3)' }}>

            {/* Header bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.1)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                🤖
              </div>
              <div>
                <p className="text-white text-sm font-bold">AI Class Monitor</p>
                <p className="text-indigo-300 text-xs">● Online · Responds instantly</p>
              </div>
            </div>

            {/* Chat bubble area */}
            <div className="p-5 min-h-[260px] flex flex-col gap-4">

              {/* Student question */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm"
                  style={{ background: 'rgba(99,102,241,0.3)', color: '#e0e7ff' }}>
                  {demo.q}
                </div>
              </div>

              {/* AI answer */}
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  🤖
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>
                  {demo.a}
                </div>
              </div>
            </div>

            {/* Demo switcher */}
            <div className="px-5 pb-5">
              <p className="text-slate-500 text-xs mb-2 text-center">Try a different example:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {DEMO_EXCHANGES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDemoIdx(i)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      background: activeDemoIdx === i ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.04)',
                      borderColor: activeDemoIdx === i ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
                      color: activeDemoIdx === i ? '#a5b4fc' : '#64748b',
                    }}>
                    {i === 0 ? 'AI Agent question' : i === 1 ? 'Hindi debug help' : 'Lifetime access?'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { stat: '24/7', label: 'Always available' },
            { stat: '100+', label: 'Languages supported' },
            { stat: 'Instant', label: 'Response time' },
            { stat: 'Lifetime', label: 'Access included' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center py-5 rounded-2xl border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-2xl font-extrabold mb-1" style={{ color: '#818cf8' }}>{stat}</p>
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Differentiator note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          No other AI certification programme in India, US, or EU includes a 24/7 AI tutor trained on your curriculum.
        </p>
      </div>
    </section>
  )
}

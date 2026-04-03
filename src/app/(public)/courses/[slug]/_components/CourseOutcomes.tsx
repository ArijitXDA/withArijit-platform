const OUTCOMES: Record<string, { icon: string; title: string; desc: string; stat: string }[]> = {
  // ── Default — Working Professionals, CXOs, Entrepreneurs ──────────────────
  default: [
    {
      icon: '💰', title: 'Increase Your Salary', stat: '30%+ avg. growth',
      desc: 'AI skills are the most in-demand in hiring today. Our learners report an average salary increase of 30% or more within 6 months of certification — across IT, finance, marketing, and operations.',
    },
    {
      icon: '🚀', title: 'Launch AI Ventures', stat: 'Weeks, not years',
      desc: 'Build and launch AI-powered products in weeks — not months. Multiple oStaran graduates have launched commercially successful AI ventures using the exact projects built in this programme.',
    },
    {
      icon: '💼', title: 'Consulting Income', stat: '₹5,000–₹50,000/day',
      desc: 'AI consultants command premium rates across industries. This programme positions you to offer AI consulting from session 8 onwards — with a portfolio of real, deployable projects to show clients.',
    },
  ],

  // ── School students ────────────────────────────────────────────────────────
  school: [
    {
      icon: '🎓', title: 'College Advantage', stat: 'Stand out from thousands',
      desc: 'AI certification gives school students a massive edge in college applications, scholarship interviews, and competitive entrance exams. Start building your portfolio before you even finish Class 12.',
    },
    {
      icon: '🏆', title: 'Future-Ready Skills', stat: 'Skills schools don\'t teach',
      desc: 'AI literacy is the #1 skill employers and colleges will look for in the next decade. Get ahead of your peers with hands-on, practical AI skills built live — not from a textbook.',
    },
    {
      icon: '🌟', title: 'Build Real Projects', stat: 'Not just theory',
      desc: 'Every session produces a real project you can show universities, scholarship committees, and future employers. You won\'t just learn about AI — you\'ll build with it, from session one.',
    },
  ],

  // ── College & Fresh Graduates ──────────────────────────────────────────────
  college: [
    {
      icon: '🧲', title: 'Grab a High-Paying AI Job', stat: 'AI roles pay 40–80% more',
      desc: 'Employers are actively hunting for freshers who can build with AI — not just talk about it. Our certified graduates have landed roles at startups, MNCs, and global companies within weeks of completing the programme.',
    },
    {
      icon: '📂', title: 'Build a Real Portfolio', stat: 'Projects you can ship',
      desc: 'Every session produces a deployable AI project — agents, RAG systems, SaaS tools — that goes straight into your portfolio. No dummy projects. No toy datasets. Real systems hiring managers notice.',
    },
    {
      icon: '💼', title: 'Start AI Consulting Early', stat: 'Earn while you learn',
      desc: 'You don\'t need to wait until you\'re employed. From session 8 onwards, many of our college learners begin offering AI consulting to local businesses — building income and experience simultaneously.',
    },
  ],

  // ── Tech Developers ────────────────────────────────────────────────────────
  tech: [
    {
      icon: '⚡', title: 'Build Agentic AI Systems', stat: 'From session one',
      desc: 'Go beyond APIs and wrappers. Build full Agentic AI pipelines, Agentic RAG systems, and MCP-powered multi-agent architectures from scratch — live — with production-grade code you own.',
    },
    {
      icon: '💰', title: 'Command Senior Rates', stat: '2–4x salary uplift',
      desc: 'Developers who can build and deploy AI agents are among the highest-paid engineers in the market today. This certification gives you the depth of knowledge that puts you in a different bracket.',
    },
    {
      icon: '🚀', title: 'Launch AI Products', stat: 'Weeks, not quarters',
      desc: 'You\'ll build real SaaS-grade AI products during the programme. Multiple tech-track graduates have shipped commercial AI products within months of completing — from AI assistants to autonomous workflow engines.',
    },
  ],

  // ── CXOs & Business Leaders ───────────────────────────────────────────────
  cxo: [
    {
      icon: '🎯', title: 'Lead AI Transformation', stat: 'From strategy to execution',
      desc: 'Move from AI buzzwords to boardroom-ready strategy. Understand how to evaluate AI investments, govern AI systems, and lead enterprise AI adoption — with frameworks you can apply from week one.',
    },
    {
      icon: '📊', title: 'Drive Measurable ROI', stat: 'Across every function',
      desc: 'Learn how AI creates measurable impact in sales, operations, finance, HR, and marketing — and how to prioritise and sequence AI initiatives for maximum return in your specific organisation.',
    },
    {
      icon: '🔮', title: 'See the Future First', stat: 'AGI, Agentic AI, Quantum',
      desc: 'Get a first-principles understanding of where AI is heading — Agentic AI, AGI timelines, Quantum Computing — so you can position your organisation to lead, not respond, in the next decade.',
    },
  ],
}

export function CourseOutcomes({ category }: { category: string }) {
  const items = OUTCOMES[category] ?? OUTCOMES.default

  return (
    <section className="py-16 px-4" style={{ background: '#070812' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            How This Programme Transforms Your Life
          </h2>
          <p className="text-slate-500 text-sm">Not just a certificate — a real transformation</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map(({ icon, title, stat, desc }) => (
            <div key={title} className="rounded-3xl border p-6 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-4xl">{icon}</span>
              <div>
                <p className="text-white font-extrabold text-lg leading-snug">{title}</p>
                <p className="text-indigo-400 text-xs font-bold mt-0.5">{stat}</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

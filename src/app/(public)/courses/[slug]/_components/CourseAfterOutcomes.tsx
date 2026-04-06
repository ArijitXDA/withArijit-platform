const OUTCOMES: Record<string, { icon: string; title: string; desc: string }[]> = {
  tech: [
    { icon: '💰', title: '2–4x Salary Uplift', desc: 'AI-capable developers command dramatically higher rates. Multiple graduates have doubled their CTC within 6 months of certification.' },
    { icon: '🤖', title: 'Build & Ship AI Agents', desc: 'You can design, build, and deploy production-grade agentic AI systems — Agentic RAG, multi-agent pipelines, MCP servers — from day one after the programme.' },
    { icon: '🚀', title: 'Launch a Commercial AI Product', desc: 'You\'ll have a fully built, deployable SaaS AI product from the course itself. Multiple graduates are now selling theirs.' },
    { icon: '📂', title: 'A Portfolio That Speaks', desc: '4 production-grade projects across agents, RAG, and SaaS — built live, owned entirely by you, available to show employers and clients immediately.' },
    { icon: '💼', title: 'Consulting at ₹10k–₹50k/day', desc: 'AI engineering consultants are among the highest-paid in the market. Your portfolio and certificate position you to start consulting within weeks.' },
    { icon: '🌐', title: 'Top 0.01% of AI Developers in India', desc: 'Agentic AI with MCP, multi-agent orchestration, and RAG at production scale is a rare skill set. This programme puts you among a handful in India who can build it.' },
    { icon: '🎓', title: '2 Globally Recognised Certificates', desc: 'Interim certificate after Session 13. Completion certificate after all sessions — verified on ostaran.com, shareable directly on LinkedIn.' },
    { icon: '🤝', title: 'Lifetime Alumni Network', desc: 'Access to the oStaran alumni community across India, USA, and Canada — for hiring, collaboration, and partnership opportunities.' },
  ],

  school: [
    { icon: '🏆', title: 'A CV Before Class 12', desc: 'Certified AI skills and real projects on your CV — before most of your peers even know what an LLM is.' },
    { icon: '🎓', title: 'Stand Out in College Applications', desc: 'Admissions committees notice AI literacy. Multiple oStaran school graduates have cited this certification in successful college applications.' },
    { icon: '💡', title: 'Real Projects You Built', desc: 'Not certificate of participation — actual AI projects you designed and built live. Show them in interviews, scholarship applications, and your portfolio.' },
    { icon: '🔮', title: 'You Understand AI Before Everyone Else', desc: 'While your peers are still learning about AI from news articles, you\'ll have built with it, understood it, and know how to apply it.' },
    { icon: '🌍', title: 'AI Fluency in Any Language', desc: 'Using AI tools in your mother tongue — whether Hindi, Tamil, Bengali, or another — gives you a huge advantage in your own community.' },
    { icon: '📜', title: 'Globally Recognised Certificate', desc: 'oStaran certificates are verifiable at ostaran.com/certificate-verification and held by learners across India, USA, and Canada.' },
    { icon: '🤝', title: 'Community of Young AI Builders', desc: 'Connect with other school-age AI learners across India who are building the same way you are. Collaborations, competitions, and friendships.' },
    { icon: '🚀', title: 'Head Start on Your Entire Career', desc: 'AI isn\'t just one subject — it will touch every industry and every role you\'ll ever have. Starting at school means a decade head start on your career.' },
  ],

  working_professionals: [
    { icon: '💰', title: '30%+ Salary Growth', desc: 'AI skills are the #1 driver of salary increases in the Indian job market. Our working professionals average 30%+ growth within 6 months of certification.' },
    { icon: '🤖', title: 'Automate Your Most Tedious Work', desc: 'Build AI agents that handle your emails, reports, research, and routine tasks — giving you back hours every week.' },
    { icon: '💼', title: 'Consulting at ₹5k–₹50k/day', desc: 'AI consultants are in extreme demand. This programme positions you to offer consulting from Session 8 onwards — with a portfolio to show clients.' },
    { icon: '📂', title: 'A Real Project Portfolio', desc: '3+ deployable AI projects built live and owned entirely by you — no IP restrictions. Show employers and clients immediately.' },
    { icon: '🌐', title: 'Top 0.01% AI Skills in India', desc: 'Most professionals only use ChatGPT. You’ll build agents, RAG systems, and AI workflows — putting you in a different category entirely.' },
    { icon: '🎓', title: '2 Globally Recognised Certificates', desc: 'Interim after Session 13, completion after all 26 sessions. Verifiable on ostaran.com, shareable directly on LinkedIn.' },
    { icon: '🚀', title: 'Launch an AI Side Business', desc: 'Multiple oStaran professionals have launched AI consulting practices or ventures within months of certification — while still in their current role.' },
    { icon: '🤝', title: 'Lifetime Alumni Network', desc: 'Join a community of AI professionals across India, USA, and Canada — for referrals, job leads, and collaborations.' },
  ],

  quantum: [
    { icon: '⚛️', title: 'Understand Quantum Before Everyone Else', desc: 'Quantum computing will reshape pharma, finance, logistics, and defence within a decade. You’ll understand it before it becomes mainstream.' },
    { icon: '💼', title: 'Lead Quantum Strategy in Your Organisation', desc: 'Know how to assess quantum readiness, evaluate vendors, and position your company for quantum advantage before competitors do.' },
    { icon: '🔐', title: 'Understand Post-Quantum Cryptography', desc: 'Your current encryption will be broken by quantum computers. Learn what that means for your data, your business, and how to prepare now.' },
    { icon: '🤖', title: 'Quantum + AI Convergence', desc: 'The most powerful systems of the next decade will combine quantum computing with AI. You’ll understand how and where this creates advantage.' },
    { icon: '🎓', title: 'Globally Recognised Certificate', desc: 'oStaran Quantum Computing & AI certificate — verifiable on ostaran.com, recognised internationally, shareable on LinkedIn.' },
    { icon: '🔬', title: 'Hands-On with Qiskit', desc: 'Not just theory — you’ll write quantum circuits and run algorithms using Qiskit, IBM’s open-source quantum computing framework.' },
    { icon: '🌍', title: 'Join a Rare Global Community', desc: 'Fewer than 10,000 people in India have serious quantum computing knowledge. This programme puts you among them.' },
    { icon: '🚀', title: 'Future-Proof Your Career Completely', desc: 'AI + Quantum together is the most powerful combination of skills for the next two decades. This programme gives you both.' },
  ],

  college: [
    { icon: '💼', title: 'Your First AI Job — Fast', desc: 'Employers are urgently hiring freshers who can build with AI. oStaran graduates have landed roles within weeks of completing the programme.' },
    { icon: '💰', title: 'AI Roles Pay 40–80% More', desc: 'A fresher with demonstrable AI skills commands dramatically higher packages than a peer with the same degree but no AI portfolio.' },
    { icon: '📂', title: 'Portfolio of Deployable Projects', desc: 'Real agents, RAG systems, and AI tools — built live, owned by you, with no IP restrictions. What hiring managers want to see.' },
    { icon: '🚀', title: 'Launch Your Own AI Venture', desc: 'Multiple oStaran graduates have launched commercially successful AI tools within months of their course. Your projects are that close to market.' },
    { icon: '💡', title: 'Consulting Income While Studying', desc: 'From Session 8 onwards, many of our college learners start offering AI consulting to local businesses — real income alongside their degree.' },
    { icon: '🎓', title: '2 Globally Recognised Certificates', desc: 'Interim after Session 13, completion after all 26 sessions. Verifiable, shareable on LinkedIn, recognised by employers internationally.' },
    { icon: '🌐', title: 'Stand Among the Top Freshers in India', desc: 'AI certifications from credible programmes are rare among freshers. This immediately separates you from thousands of applications.' },
    { icon: '🤝', title: 'Lifetime Alumni Network', desc: 'Join a community of AI professionals across India, USA, and Canada — for referrals, job leads, and collaborations.' },
  ],

  cxo: [
    { icon: '🎯', title: 'Lead AI Transformation in Your Organisation', desc: 'You\'ll have the frameworks and language to lead AI adoption — from budget decisions to board presentations — with confidence.' },
    { icon: '📊', title: 'Identify AI ROI Opportunities', desc: 'Know exactly where AI creates measurable value in sales, operations, finance, HR, and marketing — and how to prioritise and sequence.' },
    { icon: '🔮', title: 'See the Next Decade Clearly', desc: 'Agentic AI, AGI timelines, Quantum Computing — you\'ll understand what\'s coming well enough to position your organisation to lead, not respond.' },
    { icon: '💬', title: 'Speak AI Fluently with Your Tech Teams', desc: 'No more translation gap between leadership and technical staff. You\'ll understand exactly what your AI teams are building — and why it matters.' },
    { icon: '🤖', title: 'Evaluate AI Vendors Without Being Sold To', desc: 'Understand how to assess AI tools, partnerships, and vendor claims — so you make investment decisions based on substance, not pitch decks.' },
    { icon: '🎓', title: '2 Globally Recognised Certificates', desc: 'Add certified AI leadership credentials to your LinkedIn immediately. Recognised internationally and verifiable on ostaran.com.' },
    { icon: '🌐', title: 'Network with AI Leaders Across Sectors', desc: 'Join a community of CXOs, founders, and senior leaders who are navigating AI transformation across India, USA, and Canada.' },
    { icon: '📜', title: 'A Personal AI Research Journey', desc: 'You\'ll leave with structured frameworks — on AGI, AI governance, enterprise adoption — that you can apply immediately in your organisation.' },
  ],

  default: [
    { icon: '💰', title: '30%+ Salary Growth', desc: 'AI skills are the #1 driver of salary increases in the Indian job market right now. Our learners average 30%+ within 6 months of certification.' },
    { icon: '🚀', title: 'Launch an AI Venture', desc: 'Multiple oStaran graduates have launched commercially successful AI businesses using the exact projects built in this programme.' },
    { icon: '💼', title: 'Consulting at ₹5k–₹50k/day', desc: 'AI consultants are in extreme demand. This programme positions you to offer consulting from Session 8 onwards — with projects to show clients.' },
    { icon: '📂', title: 'A Real Project Portfolio', desc: '3+ deployable AI projects — agents, RAG systems, AI tools — built live, owned entirely by you, with no IP or commercial restrictions.' },
    { icon: '🌐', title: 'Top 0.01% AI Skills in India', desc: 'Agentic AI fluency is a rare skill. This programme puts you in an extremely small group of people in India who can build with it at production scale.' },
    { icon: '🎓', title: '2 Globally Recognised Certificates', desc: 'Interim certificate after Session 13. Completion certificate after all 26 sessions — verified on ostaran.com, shareable on LinkedIn.' },
    { icon: '🤖', title: 'Build AI Systems — Not Just Use Them', desc: 'You won\'t just know how to prompt AI. You\'ll understand and build the systems underneath — agents, RAG, MCP, multi-agent orchestration.' },
    { icon: '🤝', title: 'Lifetime Alumni Network', desc: 'Access the oStaran community of AI professionals across India, USA, and Canada — for hiring, collaboration, and long-term growth.' },
  ],
}

export function CourseAfterOutcomes({ category }: { category: string }) {
  const items = OUTCOMES[category] ?? OUTCOMES.default

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 mb-4">
            What You Walk Away With
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Your Life After This Programme
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Not just a certificate — concrete, real outcomes that change your trajectory.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-snug">{title}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

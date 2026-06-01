'use client'
import { useState } from 'react'
import Link from 'next/link'

const TABS = [
  {
    id:      'professionals',
    emoji:   '💼',
    label:   'Working Professionals',
    age:     '24–60 years',
    utm:     'working_prof',
    color:   '#4f46e5',
    heading: 'AI That Fits Your Schedule & Career',
    desc:    'Learn AI tools that directly apply to your role in finance, HR, marketing, operations or IT. Weekend sessions — no career disruption.',
    outcomes: [
      'Automate repetitive tasks with AI',
      'Use AI for reports, analysis & presentations',
      'ChatGPT, Copilot, Claude — mastered for your industry',
      'Globally recognised AI certificate for LinkedIn & resume',
    ],
    courseHref: '/courses/ai-mastery-for-working-professionals',
  },
  {
    id:      'students',
    emoji:   '🎓',
    label:   'College & Job Seekers',
    age:     '17–23 years',
    utm:     'college',
    color:   '#059669',
    heading: 'Land Your First Job with AI Skills',
    desc:    'Employers are hiring AI-skilled graduates. Get certified before your next interview and stand out from thousands of applicants.',
    outcomes: [
      'Build an AI-powered portfolio',
      'Resume & LinkedIn AI makeover',
      'Interview prep with AI tools',
      'Get discovered by hiring partners in our recruiter network',
    ],
    courseHref: '/courses/ai-mastery-for-students',
  },
  {
    id:      'entrepreneurs',
    emoji:   '🚀',
    label:   'Entrepreneurs & Owners',
    age:     '25–60 years',
    utm:     'entrepreneurs',
    color:   '#db2777',
    heading: 'Grow Your Business with AI',
    desc:    'Founders, SME owners and solopreneurs — use AI to cut costs, automate operations and launch new revenue streams without hiring a tech team.',
    outcomes: [
      'Automate sales, marketing & support with AI',
      'Build AI tools for your business — no developers needed',
      'Cut operating costs and scale lean',
      'AI strategy to outpace your competition',
    ],
    courseHref: '/courses/ai-mastery-for-entrepreneurs',
  },
  {
    id:      'cxo',
    emoji:   '🏆',
    label:   'Business Leaders',
    age:     '30–65 years',
    utm:     'cxo',
    color:   '#d97706',
    heading: 'Lead Your Organisation\'s AI Transformation',
    desc:    'CXOs, VPs, Directors — understand AI deeply enough to make decisions, lead teams, and transform your organisation.',
    outcomes: [
      'AI strategy for your organisation',
      'ROI frameworks for AI investments',
      'Vendor evaluation & risk management',
      'Lead transformation without being technical',
    ],
    courseHref: '/courses/ai-mastery-for-leaders',
  },
  {
    id:      'homemakers',
    emoji:   '🏡',
    label:   'Homemakers & Returners',
    age:     '25–55 years',
    utm:     'homemakers',
    color:   '#0d9488',
    heading: 'Restart Your Career with In-Demand AI Skills',
    desc:    'Homemakers and career returners — build job-ready AI skills from home, at your own pace, and re-enter the workforce or start freelancing with confidence.',
    outcomes: [
      'Learn AI from home — flexible weekend sessions',
      'Start freelancing or remote work with AI',
      'Build a portfolio that bridges your career gap',
      'Globally recognised certificate to rebuild your resume',
    ],
    courseHref: '/courses/ai-mastery-for-homemakers',
  },
  {
    id:      'techies',
    emoji:   '💻',
    label:   'Tech Developers',
    age:     '20–55 years',
    utm:     'techies',
    color:   '#7c3aed',
    heading: 'Build Agentic AI Systems',
    desc:    'Go beyond prompts. Build real AI agents using LangChain, n8n, Supabase, and production-grade frameworks.',
    outcomes: [
      'Build AI agents with LangChain, AutoGen, CrewAI',
      'Deploy to AWS, Vercel, Railway',
      'Fine-tune models with LoRA & PEFT',
      'From code to production — real-world projects',
    ],
    courseHref: '/courses/agentic-ai-development',
  },
  {
    id:      'researchers',
    emoji:   '🔬',
    label:   'Engineers & Researchers',
    age:     '20–55 years',
    utm:     'researchers',
    color:   '#a855f7',
    heading: 'Master Quantum Computing & Advanced AI',
    desc:    'Engineers, researchers and data scientists with a STEM background — go to the frontier with quantum computing, advanced ML and research-grade AI systems.',
    outcomes: [
      'Quantum computing foundations & Qiskit',
      'Advanced ML, deep learning & model fine-tuning',
      'Research-grade projects you can publish',
      'Certificate for R&D, academia & deep-tech roles',
    ],
    courseHref: '/courses/quantum-computing-and-ai',
  },
  {
    id:      'school',
    emoji:   '📚',
    label:   'School Students',
    age:     '10–16 years',
    utm:     'school',
    color:   '#0284c7',
    heading: 'AI Skills for the Next Generation',
    desc:    'CBSE/ICSE/State board students in Class 6–12. Get ahead with AI skills that no classroom is teaching yet.',
    outcomes: [
      'Understand how AI works — no coding needed',
      'Use AI for projects, science & art',
      'Certificate to stand out in college applications',
      'Age-appropriate — fun, interactive, 90 minutes',
    ],
    courseHref: '/courses/ai-mastery-for-school-students',
  },
]

export function AudienceTabsSection() {
  const [active, setActive] = useState(TABS[0].id)
  const tab = TABS.find(t => t.id === active)!

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            Personalised for You
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3">
            Who is oStaran for?
          </h2>
          <p className="text-gray-500 text-lg">
            Every session is built for a specific audience — not a one-size-fits-all course.
          </p>
        </div>

        {/* Tab buttons — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border"
              style={
                active === t.id
                  ? { background: t.color, color: '#fff', borderColor: t.color, boxShadow: `0 4px 20px ${t.color}40` }
                  : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              <span className="text-base">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          key={active}
          className="grid md:grid-cols-2 gap-8 p-8 rounded-3xl border animate-fade-in"
          style={{
            borderColor: `${tab.color}20`,
            background: `linear-gradient(135deg, ${tab.color}06 0%, white 100%)`,
          }}
        >
          {/* Left — content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{tab.emoji}</span>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">{tab.heading}</h3>
                <p className="text-xs font-semibold mt-0.5" style={{ color: tab.color }}>
                  Age group: {tab.age}
                </p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6">{tab.desc}</p>

            {/* Outcomes */}
            <div className="space-y-2 mb-8">
              {tab.outcomes.map(o => (
                <div key={o} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${tab.color}15` }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill={tab.color}>
                      <path d="M1 5l3 3 5-6" stroke={tab.color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-700">{o}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/masterclass?utm_content=${tab.utm}&utm_source=homepage&utm_medium=audience_tab`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: tab.color }}
              >
                Get Certified as {tab.label} →
              </Link>
              <Link
                href={tab.courseHref}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
                style={{ borderColor: `${tab.color}30`, color: tab.color }}
              >
                Full Course →
              </Link>
            </div>
          </div>

          {/* Right — visual info card */}
          <div className="space-y-4">
            {/* Session info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: tab.color }}>
                Your Certification Session
              </p>
              {[
                ['⏱', 'Duration', '90 minutes live online'],
                ['📅', 'Schedule', 'Every Sunday — multiple time slots'],
                ['🎓', 'Certificate', 'Globally recognised AI Certificate'],
                ['📧', 'Delivery', 'Issued within 24 hours of attending'],
                ['💳', 'Investment', 'Starting ₹499 — one-time'],
              ].map(([icon, key, val]) => (
                <div key={key as string} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base mt-0.5">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{key}</p>
                    <p className="text-sm text-gray-800 font-medium">{val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="rounded-2xl p-4 border"
              style={{ background: `${tab.color}08`, borderColor: `${tab.color}20` }}>
              <p className="text-xs font-bold mb-1" style={{ color: tab.color }}>
                ⭐ Most Popular in India
              </p>
              <p className="text-sm text-gray-700">
                The <strong>{tab.label}</strong> session is one of oStaran&apos;s most attended sessions,
                with learners from across India, USA and Canada.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}

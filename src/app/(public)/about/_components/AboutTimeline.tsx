'use client'
import { useEffect, useRef, useState } from 'react'

const MILESTONES = [
  {
    year:    'April 2020',
    title:   'Born in a Pandemic',
    desc:    'The world stopped. We started. Arijit launched the first live AI class online as lockdowns began globally. 100 students enrolled within 4 days of launch.',
    color:   '#4f46e5',
    emoji:   '🚀',
    stat:    '100 students · 4 days',
  },
  {
    year:    'December 2020',
    title:   '1,000 Students',
    desc:    'Within 8 months — still entirely live, still entirely hands-on, still no recordings sold as a product. 1,000 students trained across India, with international learners beginning to join.',
    color:   '#059669',
    emoji:   '🎯',
    stat:    '1,000 students · 8 months',
  },
  {
    year:    '2021–2023',
    title:   'Going Deeper & Going Global',
    desc:    'Expanded to 5 distinct audience tracks. First students from USA and Canada. Curriculum deepened into Agentic AI, LLMs, and real-project-based learning. Still profitable. Still no VC.',
    color:   '#0891b2',
    emoji:   '🌍',
    stat:    '3 countries · 5 tracks',
  },
  {
    year:    '2024',
    title:   '10,000 Learners',
    desc:    'Hit 10,000 students. Became the only training platform in India teaching how to build AI Agents, Agentic RAG, and MCP from scratch — live — with real deployable systems.',
    color:   '#d97706',
    emoji:   '🏆',
    stat:    '10,000 students milestone',
  },
  {
    year:    '2025',
    title:   'oStaran Brand Launch',
    desc:    'Launched the oStaran brand — a new identity for a new era. Partner programme designed. Group enrolment architecture built. Quantum ML and AI Defence added to curriculum.',
    color:   '#7c3aed',
    emoji:   '⭐',
    stat:    'New brand · New platform',
  },
  {
    year:    'March 2026',
    title:   'Full Platform Goes Live',
    desc:    'ostaran.com, partner.ostaran.com, and webinar.ostaran.com launched. Group enrolment, AI Kit courier, partner ecosystem, and 50,000+ learner milestone reached. Fee rising 10%/month — demand still growing.',
    color:   '#e11d48',
    emoji:   '🌟',
    stat:    '50,000+ certified',
  },
]

export function AboutTimeline() {
  const [visible, setVisible] = useState<Set<number>>(new Set())
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    refs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(prev => new Set([...prev, i]))
            obs.disconnect()
          }
        },
        { threshold: 0.2 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <section className="py-20 px-4" style={{ background: '#070812' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            Our Journey
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            The oStaran Timeline
          </h2>
          <p className="text-slate-500 text-sm">Six years. Zero investors. Fifty thousand learners.</p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px"
            style={{ background: 'rgba(255,255,255,0.06)', transform: 'md:translateX(-50%)' }} />

          <div className="space-y-10">
            {MILESTONES.map((m, i) => {
              const isRight = i % 2 === 0
              const isVis   = visible.has(i)

              return (
                <div
                  key={m.year}
                  ref={el => { refs.current[i] = el }}
                  className="relative flex items-start gap-6 md:gap-0"
                  style={{
                    flexDirection: isRight ? 'row' : 'row-reverse',
                    opacity:    isVis ? 1 : 0,
                    transform:  isVis ? 'translateX(0)' : (isRight ? 'translateX(-24px)' : 'translateX(24px)'),
                    transition: 'opacity 0.6s ease, transform 0.6s ease',
                    transitionDelay: `${i * 0.08}s`,
                  }}
                >
                  {/* Card */}
                  <div className={`flex-1 ${isRight ? 'md:pr-12' : 'md:pl-12'} pl-20 md:pl-0`}>
                    <div className="rounded-2xl border p-5 transition-all hover:shadow-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: `${m.color}25`,
                      }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${m.color}18`, color: m.color }}>
                          {m.year}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{m.stat}</span>
                      </div>
                      <h3 className="font-extrabold text-white text-base mb-2">{m.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{m.desc}</p>
                    </div>
                  </div>

                  {/* Centre node — desktop */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-4 w-10 h-10 rounded-full items-center justify-center text-xl border-2 z-10 shrink-0"
                    style={{ background: '#070812', borderColor: m.color, boxShadow: `0 0 16px ${m.color}40` }}>
                    {m.emoji}
                  </div>

                  {/* Left node — mobile */}
                  <div className="md:hidden absolute left-3 top-4 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shrink-0"
                    style={{ background: '#070812', borderColor: m.color }}>
                    {m.emoji}
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

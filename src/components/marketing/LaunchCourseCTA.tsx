'use client'
import { useState } from 'react'

const STEPS: { t: string; d: string }[] = [
  { t: 'Sign up as a partner', d: 'Join the oStaran partner network (free).' },
  { t: 'Open your partner dashboard', d: 'Sign in at partner.ostaran.com.' },
  { t: 'Apply to “Become a Mentor”', d: 'A quick application, reviewed by the oStaran team.' },
  { t: 'Launch your course', d: 'Upload your curriculum, set your price, create your free webinar, and set up student reminders.' },
  { t: 'Run the webinar on oStaran', d: 'Conduct your free webinar live on the oStaran platform.' },
  { t: 'Upsell to attendees & beyond', d: 'Convert webinar attendees and other prospects into enrolments.' },
  { t: 'Teach live on oStaran', d: 'Run your live classes on the platform — auto-recorded.' },
  { t: 'Students get the full kit', d: 'Class recordings + auto-generated study material from your transcripts + the AI Professor in their dashboard.' },
  { t: 'You get paid', d: 'Students pay on oStaran and your share is forwarded to you.' },
]

export function LaunchCourseCTA() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Pink neon CTA — sits below the gold "Become an AI Partner" button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 border-2"
          style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)',
            color: '#fff',
            borderColor: 'rgba(244,114,182,0.6)',
            boxShadow: '0 0 40px rgba(236,72,153,0.45)',
            animation: 'pulse-pink 2.5s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🚀</span>
          <span>Launch your course for free</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.18)' }}>
            For professors
          </span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>

      <style>{`
        @keyframes pulse-pink {
          0%, 100% { box-shadow: 0 0 40px rgba(236,72,153,0.45), 0 0 0 0 rgba(236,72,153,0.28); }
          50%      { box-shadow: 0 0 60px rgba(236,72,153,0.65), 0 0 0 12px rgba(236,72,153,0); }
        }
      `}</style>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,4,12,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border p-6 md:p-7 text-left"
            style={{ background: 'var(--os-page-2)', borderColor: 'rgba(236,72,153,0.35)', boxShadow: 'var(--os-sh-3d), 0 0 60px rgba(236,72,153,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--os-muted)' }}
            >
              ✕
            </button>

            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(236,72,153,0.15)', color: 'var(--os-ink)', border: '1px solid rgba(236,72,153,0.3)' }}>
              🚀 For Professors
            </span>
            <h2 className="text-2xl font-extrabold leading-tight" style={{ color: 'var(--os-ink)' }}>Launch your course on oStaran</h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--os-muted)' }}>We provide the rails — live classes, recordings, study material, the AI Professor, payments. <b style={{ color: 'var(--os-ink)' }}>Free of cost to you.</b></p>

            <p className="text-[11px] font-bold uppercase tracking-widest mt-5 mb-3" style={{ color: 'var(--os-faint)' }}>How it works</p>
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: '#fff' }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--os-ink)' }}>{s.t}</p>
                    <p className="text-xs leading-snug" style={{ color: 'var(--os-muted)' }}>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'var(--os-surface)', border: '1px solid var(--os-line)', color: 'var(--os-muted)' }}>
              <b style={{ color: 'var(--os-ink)' }}>All of this, free of cost to you.</b> We are currently inviting only reputed, highly experienced &amp; skilled professors from esteemed institutes around the globe — subject to oStaran management approval.
            </div>

            <a
              href="https://partner.ostaran.com"
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#ec4899,#d946ef 60%,#a855f7)', color: '#fff', boxShadow: '0 0 30px rgba(236,72,153,0.5)' }}
            >
              Sign in / Sign up as Partner →
            </a>
            <p className="text-center text-[11px] mt-2" style={{ color: 'var(--os-faint)' }}>Already a partner? Sign in and open “Become a Mentor”.</p>
          </div>
        </div>
      )}
    </>
  )
}

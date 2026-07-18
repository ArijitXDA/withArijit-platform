'use client'
import { useState, useEffect, useRef } from 'react'
import { User, Phone, Search, Check, Loader2, X, Sparkles } from 'lucide-react'

// First-run sheet for a new account — in practice, someone who just installed the Android app.
// Signup is email OTP, so at this point we know their email and nothing else: no name, no mobile,
// and no idea who referred them. This is the only chance to ask before they disappear into the
// dashboard, so it is a full-screen sheet on mobile rather than a dismissible banner.
//
// It POSTs once to /api/student/onboarding/complete, which creates the profile, records partner
// attribution under the one-time rule, and emits app_account_created — the event that finally puts
// app installers into a comms journey.
//
// Everything is optional. A blank submit still completes onboarding and still fires the event, so
// a person who taps Skip is a tracked lead rather than a silent one.

const T = {
  navy: '#0f1f3d', blue: '#2563eb', border: '#dce6f5',
  textSec: '#475569', textMuted: '#94a3b8', green: '#16a34a',
}

const inp = [
  'w-full bg-white rounded-xl px-3 py-3 text-base',
  'text-[#0f1f3d] placeholder-[#94a3b8]',
  'border border-[#dce6f5]',
  'focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100',
  'transition-colors',
].join(' ')

const lbl = 'text-xs font-semibold text-[#475569] uppercase tracking-wide block mb-1.5'

interface PartnerHit { partner_code: string; display_name: string }

export default function OnboardingSheet({
  email, initialName, initialMobile, partnerLocked, lockedCode,
}: {
  email: string
  initialName: string | null
  initialMobile: string | null
  partnerLocked: boolean       // a real partner is already attached — never offer to change it
  lockedCode: string | null
}) {
  const [open, setOpen]     = useState(true)
  const [name, setName]     = useState(initialName || '')
  const [mobile, setMobile] = useState(initialMobile || '')

  const [q, setQ]                 = useState('')
  const [hits, setHits]           = useState<PartnerHit[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked]       = useState<PartnerHit | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const searchSeq = useRef(0)

  // Debounced partner search. The endpoint requires >= 2 chars and caps results, so this cannot be
  // walked to enumerate every partner.
  useEffect(() => {
    if (picked) return
    const term = q.trim()
    if (term.length < 2) { setHits([]); return }
    setSearching(true)
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/partners/search?q=${encodeURIComponent(term)}`)
        const d = await r.json()
        // Ignore a response that has been overtaken by a newer keystroke.
        if (seq === searchSeq.current) setHits(Array.isArray(d.partners) ? d.partners : [])
      } catch { if (seq === searchSeq.current) setHits([]) }
      finally { if (seq === searchSeq.current) setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q, picked])

  async function submit(skip = false) {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/student/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:    skip ? undefined : (name.trim() || undefined),
          mobile:       skip ? undefined : (mobile.trim() || undefined),
          partner_code: skip ? undefined : (picked?.partner_code || undefined),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Could not save. Please try again.')
        return
      }
      setOpen(false)
      // Drop ?onboarding=true so a refresh doesn't reopen the sheet.
      window.history.replaceState({}, '', '/dashboard/profile')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(15,31,61,0.55)' }}>
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">

        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
                <Sparkles size={16} style={{ color: T.blue }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: T.navy }}>Welcome to oStaran</h2>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{email}</p>
              </div>
            </div>
            <button onClick={() => submit(true)} disabled={saving}
                    aria-label="Skip for now"
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50">
              <X size={18} style={{ color: T.textMuted }} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className={lbl}><User size={11} className="inline mr-1 -mt-0.5" />Your name</label>
            <input value={name} onChange={e => setName(e.target.value)}
                   placeholder="e.g. Priya Sharma" className={inp} autoComplete="name" />
          </div>

          <div>
            <label className={lbl}><Phone size={11} className="inline mr-1 -mt-0.5" />Mobile</label>
            <input value={mobile} onChange={e => setMobile(e.target.value)}
                   placeholder="10-digit number" className={inp}
                   inputMode="numeric" autoComplete="tel" maxLength={15} />
            <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>
              So we can send you class reminders on WhatsApp.
            </p>
          </div>

          {/* Partner attribution. Hidden entirely once a real partner is attached — a student must
              never be able to move someone else's referral. */}
          {partnerLocked ? (
            <div className="rounded-xl px-3 py-2.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-xs font-semibold" style={{ color: T.green }}>
                <Check size={12} className="inline mr-1 -mt-0.5" />
                Referred by partner {lockedCode}
              </p>
            </div>
          ) : (
            <div>
              <label className={lbl}><Search size={11} className="inline mr-1 -mt-0.5" />Who told you about oStaran?</label>
              {picked ? (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5"
                     style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span className="text-sm font-semibold" style={{ color: T.navy }}>
                    <Check size={13} className="inline mr-1.5 -mt-0.5" style={{ color: T.green }} />
                    {picked.display_name}
                    <span className="ml-1.5 font-mono text-xs" style={{ color: T.textMuted }}>{picked.partner_code}</span>
                  </span>
                  <button onClick={() => { setPicked(null); setQ('') }}
                          className="text-xs font-semibold" style={{ color: T.blue }}>Change</button>
                </div>
              ) : (
                <>
                  <input value={q} onChange={e => setQ(e.target.value)}
                         placeholder="Partner name or code" className={inp}
                         autoComplete="off" spellCheck={false} />
                  {searching && (
                    <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>
                      <Loader2 size={10} className="inline animate-spin mr-1" />Searching…
                    </p>
                  )}
                  {!searching && hits.length > 0 && (
                    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                      {hits.map(h => (
                        <button key={h.partner_code} onClick={() => setPicked(h)}
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                                style={{ borderColor: '#e8f0fc' }}>
                          <span className="text-sm font-medium" style={{ color: T.navy }}>{h.display_name}</span>
                          <span className="ml-2 font-mono text-[11px]" style={{ color: T.textMuted }}>{h.partner_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searching && q.trim().length >= 2 && hits.length === 0 && (
                    <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>
                      No match. You can leave this blank.
                    </p>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>
                    Optional — helps us credit the person who referred you.
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>{error}</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={() => submit(true)} disabled={saving}
                  className="px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ color: T.textSec, border: `1px solid ${T.border}` }}>
            Skip
          </button>
          <button onClick={() => submit(false)} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: T.blue }}>
            {saving ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Saving…</> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

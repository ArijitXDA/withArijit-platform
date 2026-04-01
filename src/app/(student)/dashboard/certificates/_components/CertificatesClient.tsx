'use client'

import { useState } from 'react'
import { Award, Download, ExternalLink, Lock, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { printCert } from './printCert'

const T = {
  surface: '#ffffff', border: '#dce6f5', borderLight: '#e8f0fc',
  navy: '#0f1f3d', blue: '#2563eb', blueLight: '#eff6ff', bluePale: '#dbeafe',
  textPrimary: '#0f1f3d', textSec: '#475569', textMuted: '#94a3b8',
  green: '#16a34a', greenBg: '#f0fdf4', greenBorder: '#bbf7d0',
  amber: '#b45309', amberBg: '#fffbeb', amberBorder: '#fde68a',
  red: '#dc2626', redBg: '#fef2f2', redBorder: '#fecaca',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Black & Gold Certificate Viewer ──────────────────────────────────────────
// Renders 900×636px (A4 landscape ratio), scales to fit viewport.
// "Download / Print PDF" calls printCert() which opens a popup-only print.
function CertViewer({
  cert,
  enrolment,
  isFinal,
  onClose,
}: {
  cert: { cert_id: string; issued_at: string }
  enrolment: { student_name: string; course_name: string }
  isFinal: boolean
  onClose: () => void
}) {
  const issueDate = fmt(cert.issued_at)

  const BG       = '#0d0d0d'
  const HEADER   = '#111111'
  const BODY     = '#141414'
  const GOLD     = '#d4a843'
  const GOLD2    = '#e8c96a'
  const GOLDFADE = 'rgba(212,168,67,0.18)'
  const BORDER   = 'rgba(212,168,67,0.45)'
  const TEXT1    = '#f5f0e8'
  const TEXT2    = '#a89878'
  const TEXT3    = '#6b5f45'

  return (
    <div
      id="cert-print-root"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', fontFamily: 'Inter, sans-serif' }}
      onClick={onClose}
    >
      {/* Action bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: '#111111', borderBottom: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>oStaran Certificate</span>
          <span style={{ color: TEXT2, fontSize: 11, fontFamily: "'Courier New', monospace" }}>{cert.cert_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ color: TEXT2, border: `1px solid ${BORDER}`, background: 'transparent' }}
          >Close</button>
          <button
            onClick={() => printCert({
              certId: cert.cert_id,
              studentName: enrolment.student_name,
              courseName: enrolment.course_name,
              issueDate,
              isFinal,
            })}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: '#0d0d0d', border: 'none', cursor: 'pointer' }}
          >↓ Download / Print PDF</button>
        </div>
      </div>

      {/* Cert canvas */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={e => e.stopPropagation()}
      >
        <div
          id="cert-canvas"
          style={{
            width: 900, height: 636, flexShrink: 0,
            background: BG, position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(212,168,67,0.3), 0 32px 80px rgba(0,0,0,0.8)',
            transform: 'scale(var(--cert-scale, 1))',
            transformOrigin: 'center center',
          }}
          ref={el => {
            if (!el) return
            const avH = window.innerHeight - 52 - 32
            const avW = window.innerWidth - 32
            const scale = Math.min(avW / 900, avH / 636, 1)
            el.style.setProperty('--cert-scale', String(scale))
            const wrapper = el.parentElement
            if (wrapper) wrapper.style.height = (636 * scale + 32) + 'px'
          }}
        >
          {/* Borders */}
          <div style={{ position: 'absolute', inset: 12, border: `1px solid ${GOLD}`, pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 19, border: '0.5px dashed rgba(212,168,67,0.4)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Corner ornaments */}
          {(['tl','tr','bl','br'] as const).map(c => (
            <div key={c} style={{
              position: 'absolute', width: 32, height: 32, zIndex: 2,
              top:    c.startsWith('t') ? 7 : undefined,
              bottom: c.startsWith('b') ? 7 : undefined,
              left:   c.endsWith('l')   ? 7 : undefined,
              right:  c.endsWith('r')   ? 7 : undefined,
              borderTop:    c.startsWith('t') ? `2.5px solid ${GOLD}` : 'none',
              borderBottom: c.startsWith('b') ? `2.5px solid ${GOLD}` : 'none',
              borderLeft:   c.endsWith('l')   ? `2.5px solid ${GOLD}` : 'none',
              borderRight:  c.endsWith('r')   ? `2.5px solid ${GOLD}` : 'none',
            }} />
          ))}

          {/* Header */}
          <div style={{
            background: HEADER, borderBottom: `1px solid ${BORDER}`,
            padding: '14px 28px', margin: '12px 12px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="14" fill={GOLD} opacity="0.08"/>
                <line x1="24" y1="10" x2="36" y2="20" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="36" y1="20" x2="30" y2="36" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="30" y1="36" x2="12" y2="30" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="12" y1="30" x2="24" y2="10" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <circle cx="24" cy="10" r="2.5" fill={GOLD}/>
                <circle cx="36" cy="20" r="2" fill={GOLD} opacity="0.8"/>
                <circle cx="30" cy="36" r="2.5" fill={GOLD}/>
                <circle cx="12" cy="30" r="2" fill={GOLD} opacity="0.8"/>
                <circle cx="24" cy="23" r="2" fill={GOLD} opacity="0.9"/>
              </svg>
              <span style={{ color: TEXT1, fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>oStaran</span>
            </div>
            <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
              <div style={{ color: GOLD, fontSize: 9, letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                Star Analytix · AIwithArijit
              </div>
              <div style={{ color: TEXT1, fontSize: 16, letterSpacing: 3, fontFamily: 'Georgia, serif', marginTop: 3 }}>
                {isFinal ? 'Certificate of Completion' : 'Certificate of Enrolment'}
              </div>
            </div>
            <div style={{ border: `1px solid ${GOLD}`, borderRadius: 6, padding: '6px 14px', textAlign: 'center', minWidth: 120, background: 'rgba(212,168,67,0.06)' }}>
              {isFinal ? (
                <>
                  <div style={{ color: GOLD, fontSize: 13, letterSpacing: 2 }}>★ ★ ★ ★ ★</div>
                  <div style={{ color: TEXT1, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, marginTop: 3 }}>COURSE GRADUATE</div>
                </>
              ) : (
                <>
                  <div style={{ color: GOLD, fontSize: 18 }}>🎓</div>
                  <div style={{ color: TEXT1, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, marginTop: 2 }}>ENROLLED STUDENT</div>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ margin: '0 12px 12px', background: BODY, padding: '18px 44px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 12 }}>
              <div style={{ flex: 1, height: '0.5px', background: GOLD, opacity: 0.35 }} />
              <div style={{ width: 7, height: 7, background: GOLD, transform: 'rotate(45deg)' }} />
              <div style={{ flex: 1, height: '0.5px', background: GOLD, opacity: 0.35 }} />
            </div>

            <p style={{ color: TEXT2, fontSize: 12, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
              {isFinal ? 'This is to certify that' : 'This is to confirm that'}
            </p>

            <h1 style={{ color: GOLD2, fontSize: 34, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center', lineHeight: 1.1 }}>
              {enrolment.student_name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, width: '55%' }}>
              <div style={{ flex: 1, height: '0.5px', background: GOLD }} />
              <div style={{ width: 6, height: 6, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: '0.5px', background: GOLD }} />
            </div>

            <p style={{ color: TEXT2, fontSize: 12, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 8, textAlign: 'center' }}>
              {isFinal
                ? 'has successfully completed all requirements of the programme'
                : 'is currently enrolled in and actively participating in the programme'}
            </p>

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: GOLDFADE, padding: '8px 36px', marginBottom: 10, textAlign: 'center' }}>
              <p style={{ color: TEXT1, fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: 0.2 }}>
                {enrolment.course_name}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: isFinal ? 10 : 8 }}>
              {[
                { label: isFinal ? 'Completion Date' : 'Certificate Date', value: issueDate },
                { label: 'Platform', value: 'oStaran AI Education' },
                { label: 'Trainer',  value: 'Arijit Chowdhury' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {i > 0 && <div style={{ width: 5, height: 5, background: GOLD, transform: 'rotate(45deg)' }} />}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: TEXT3, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ color: TEXT1, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 1 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {!isFinal && (
              <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 4, padding: '6px 18px', marginBottom: 8, width: '100%', textAlign: 'center' }}>
                <p style={{ color: GOLD, fontSize: 10, lineHeight: 1.5 }}>
                  ⚠️ <strong>Interim Provisional</strong> — confirms enrolment only.
                  Does not certify completion. Final Certificate issued upon programme completion.
                </p>
              </div>
            )}

            <div style={{ width: '100%', height: '0.5px', marginBottom: 10, background: `repeating-linear-gradient(90deg,${GOLD} 0,${GOLD} 4px,transparent 4px,transparent 8px)`, opacity: 0.4 }} />

            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center', minWidth: 150 }}>
                <svg width="130" height="24" viewBox="0 0 150 30" fill="none">
                  <path d="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14"
                    stroke={GOLD} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8"/>
                </svg>
                <div style={{ width: 150, height: '0.5px', background: GOLD, opacity: 0.5, margin: '1px auto 4px' }} />
                <div style={{ color: TEXT1, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700 }}>Antara Chowdhury</div>
                <div style={{ color: TEXT2, fontSize: 9, marginTop: 1 }}>Director, Star Analytix Pvt. Ltd.</div>
                <div style={{ color: TEXT3, fontSize: 8.5, marginTop: 1 }}>Mumbai, India</div>
              </div>

              <div style={{ background: '#0a0a0a', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ color: GOLD, fontSize: 7.5, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 3 }}>Certificate ID</div>
                <div style={{ color: TEXT1, fontSize: 10.5, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1 }}>{cert.cert_id}</div>
                <div style={{ width: '100%', height: '0.5px', background: BORDER, margin: '4px 0' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={'https://api.qrserver.com/v1/create-qr-code/?size=64x64&data='
                    + encodeURIComponent('https://www.ostaran.com/certificate-verification')
                    + '&bgcolor=0a0a0a&color=d4a843&margin=2'}
                  alt="Verify"
                  width={64} height={64}
                  style={{ display: 'block', margin: '3px auto', borderRadius: 2 }}
                />
                <div style={{ color: TEXT2, fontSize: 7.5, marginTop: 2 }}>Issued {issueDate}</div>
                <div style={{ color: TEXT3, fontSize: 7, marginTop: 1 }}>ostaran.com</div>
              </div>

              <div style={{ textAlign: 'center', minWidth: 150 }}>
                <svg width="130" height="24" viewBox="0 0 150 30" fill="none">
                  <path d="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12"
                    stroke={GOLD} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8"/>
                </svg>
                <div style={{ width: 150, height: '0.5px', background: GOLD, opacity: 0.5, margin: '1px auto 4px' }} />
                <div style={{ color: TEXT1, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700 }}>Arijit Chowdhury</div>
                <div style={{ color: TEXT2, fontSize: 9, marginTop: 1 }}>Founder & Lead Trainer, oStaran</div>
                <div style={{ color: TEXT3, fontSize: 8.5, marginTop: 1 }}>AIwithArijit × oStaran</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 10 }}>
              <div style={{ flex: 1, height: '0.5px', background: GOLD, opacity: 0.35 }} />
              <div style={{ width: 7, height: 7, background: GOLD, transform: 'rotate(45deg)' }} />
              <div style={{ flex: 1, height: '0.5px', background: GOLD, opacity: 0.35 }} />
            </div>

            <p style={{ color: TEXT3, fontSize: 9, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 6, textAlign: 'center' }}>
              Issued by Star Analytix Private Limited, Mumbai — Powered by oStaran AI Education Platform
            </p>
            <p style={{ color: TEXT3, fontSize: 7.5, letterSpacing: 1.5, marginTop: 1, textAlign: 'center', textTransform: 'uppercase' }}>
              Visit ostaran.com/certificate-verification to verify authenticity
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Completion Certificate Card ───────────────────────────────────────────────
function CompletionCertCard({ enrolment }: { enrolment: any }) {
  const [claimState, setClaimState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [claimError, setClaimError] = useState('')
  const [activeCert, setActiveCert] = useState<any>(enrolment.cert ?? null)
  const [viewing, setViewing] = useState(false)

  const state: 'locked' | 'claim' | 'interim' | 'final' =
    activeCert?.cert_type === 'final_completion'   ? 'final'
    : activeCert?.cert_type === 'interim_provisional' ? 'interim'
    : enrolment.certState

  async function handleClaim() {
    setClaimState('loading')
    setClaimError('')
    try {
      const res = await fetch('/api/certificates/claim-interim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrolment_id: enrolment.id }),
      })
      const json = await res.json()
      if (!res.ok) { setClaimError(json.error ?? 'Failed'); setClaimState('error'); return }
      setActiveCert(json.cert)
      setClaimState('success')
      setViewing(true)
    } catch {
      setClaimError('Network error — please try again')
      setClaimState('error')
    }
  }

  const courseName = (enrolment.course as any)?.name ?? enrolment.course_name ?? 'AI Programme'
  const isFinal = state === 'final'

  return (
    <>
      {viewing && activeCert && (
        <CertViewer
          cert={activeCert}
          enrolment={{ student_name: enrolment.student_name, course_name: courseName }}
          isFinal={isFinal}
          onClose={() => setViewing(false)}
        />
      )}

      <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
        <div className="h-1" style={{
          background: state === 'final'   ? 'linear-gradient(90deg, #16a34a, #15803d)'
            : state === 'interim' ? 'linear-gradient(90deg, #b45309, #d97706)'
            : state === 'locked'  ? '#e2e8f0'
            : 'linear-gradient(90deg, #2563eb, #4f46e5)',
        }} />

        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={
              state === 'final'   ? { background: T.greenBg,  border: `1px solid ${T.greenBorder}` }
              : state === 'interim' ? { background: T.amberBg,  border: `1px solid ${T.amberBorder}` }
              : state === 'locked'  ? { background: '#f1f5f9',  border: '1px solid #e2e8f0' }
              : { background: T.blueLight, border: `1px solid ${T.bluePale}` }
            }>
            {state === 'locked'
              ? <Lock size={22} style={{ color: T.textMuted }} />
              : <Award size={22} style={{ color: state === 'final' ? T.green : state === 'interim' ? T.amber : T.blue }} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>{courseName}</p>
              {state === 'final' && (
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
                  style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                  <CheckCircle size={10} /> Certified ✓
                </span>
              )}
              {state === 'interim' && (
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                  Provisional
                </span>
              )}
              {state === 'locked' && (
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: '#f1f5f9', color: T.textMuted, border: '1px solid #e2e8f0' }}>
                  🔒 Locked
                </span>
              )}
            </div>
            {state === 'final'   && activeCert && <p className="text-xs mt-1" style={{ color: T.textSec }}>Completion certificate · {activeCert.cert_id}</p>}
            {state === 'interim' && activeCert && <p className="text-xs mt-1" style={{ color: T.textSec }}>Provisional cert · {activeCert.cert_id} · {fmt(activeCert.issued_at)}</p>}
            {state === 'locked'  && <p className="text-xs mt-1" style={{ color: T.red }}>₹{Math.round(enrolment.balanceDue).toLocaleString('en-IN')} balance outstanding</p>}
            {state === 'claim'   && <p className="text-xs mt-1" style={{ color: T.textMuted }}>Fully paid · Claim your interim provisional certificate now</p>}
            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>AIwithArijit × oStaran · Star Analytix Pvt. Ltd.</p>
          </div>
        </div>

        <div className="px-6 pb-5 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: T.borderLight }}>
          {state === 'final' && (
            activeCert?.certificate_url ? (
              <>
                <a href={activeCert.certificate_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}>
                  <ExternalLink size={12} /> View Certificate
                </a>
                <a href={activeCert.certificate_url} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
                  <Download size={12} /> Download
                </a>
              </>
            ) : (
              <button onClick={() => setViewing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #16a34a, #065f46)' }}>
                <Award size={12} /> View Completion Certificate
              </button>
            )
          )}

          {state === 'interim' && (
            <button onClick={() => setViewing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
              <FileText size={12} /> View Certificate
            </button>
          )}

          {state === 'claim' && (
            <>
              {(claimState === 'idle' || claimState === 'error') && (
                <button onClick={handleClaim}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${T.blue}, #4f46e5)` }}>
                  <Award size={12} /> Claim Interim Certificate
                </button>
              )}
              {claimState === 'loading' && (
                <button disabled
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white opacity-70"
                  style={{ background: `linear-gradient(135deg, ${T.blue}, #4f46e5)` }}>
                  <Loader2 size={12} className="animate-spin" /> Issuing...
                </button>
              )}
              {claimState === 'error' && claimError && (
                <p className="text-xs flex items-center gap-1" style={{ color: T.red }}>
                  <AlertCircle size={11} /> {claimError}
                </p>
              )}
            </>
          )}

          {state === 'locked' && (
            <div className="flex items-center gap-2">
              <button disabled
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
                style={{ background: '#f1f5f9', color: T.textMuted, border: '1px solid #e2e8f0' }}>
                <Lock size={12} /> Certificate Locked
              </button>
              <p className="text-xs" style={{ color: T.textMuted }}>Pay your outstanding balance to unlock</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Webinar Certificate Card ──────────────────────────────────────────────────
function WebinarCertCard({ cert }: { cert: any }) {
  return (
    <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #b45309, #d97706)' }} />
      <div className="px-6 py-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
          <Award size={22} style={{ color: T.amber }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>{cert.certificate_name}</p>
          {cert.date_of_issuing && (
            <p className="text-xs mt-1" style={{ color: T.textSec }}>Issued: {fmt(cert.date_of_issuing)}</p>
          )}
          <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>Webinar Participation Certificate</p>
        </div>
      </div>
      {cert.certificate_image_link && (
        <div className="px-6 pb-5 flex items-center gap-2 border-t" style={{ borderColor: T.borderLight }}>
          <a href={cert.certificate_image_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}>
            <ExternalLink size={12} /> View
          </a>
          <a href={cert.certificate_image_link} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.bluePale}` }}>
            <Download size={12} /> Download
          </a>
        </div>
      )}
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
interface Props {
  webinarCerts: any[]
  enrolments: any[]
  totalCerts: number
}

export function CertificatesClient({ webinarCerts, enrolments, totalCerts }: Props) {
  const hasAnything = webinarCerts.length > 0 || enrolments.length > 0

  return (
    <div className="space-y-8 pb-12 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: T.navy }}>
          <Award size={20} style={{ color: T.amber }} /> Certificates
        </h1>
        <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
          {totalCerts > 0
            ? totalCerts + ' certificate' + (totalCerts !== 1 ? 's' : '') + ' earned'
            : 'Your certificates will appear here'}
        </p>
      </div>

      {enrolments.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: T.navy }}>
            <div className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
              <Award size={11} style={{ color: T.blue }} />
            </div>
            Course Certificates
          </h2>
          <div className="rounded-xl p-3 mb-4 flex flex-wrap gap-3"
            style={{ background: '#f8faff', border: `1px solid ${T.borderLight}` }}>
            {[
              { color: T.blue,      label: 'Claim — fully paid, ready to issue' },
              { color: T.amber,     label: 'Provisional — enrolment confirmed' },
              { color: T.green,     label: 'Certified — course completed' },
              { color: T.textMuted, label: 'Locked — balance outstanding' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: T.textSec }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            {enrolments.map(e => <CompletionCertCard key={e.id} enrolment={e} />)}
          </div>
        </div>
      )}

      {webinarCerts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: T.navy }}>
            <div className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
              <Award size={11} style={{ color: T.amber }} />
            </div>
            Webinar Participation Certificates
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {webinarCerts.map((c: any) => <WebinarCertCard key={c.id} cert={c} />)}
          </div>
        </div>
      )}

      {!hasAnything && (
        <div className="rounded-2xl border py-20 text-center bg-white" style={{ borderColor: T.border }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
            <Award size={28} style={{ color: '#fcd34d' }} />
          </div>
          <p className="font-semibold" style={{ color: T.textSec }}>No certificates yet</p>
          <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: T.textMuted }}>
            Attend a webinar or enrol in a course to earn certificates
          </p>
        </div>
      )}
    </div>
  )
}

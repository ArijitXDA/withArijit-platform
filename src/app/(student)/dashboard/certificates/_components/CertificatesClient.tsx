'use client'

import { useState } from 'react'
import { Award, Download, ExternalLink, Lock, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react'

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

// ── oStaran-branded Certificate Viewer ────────────────────────────────────────
// Matches the visual language of /certificate/[certId] page:
// dark green header, cream background, double border, gold ornaments, serif typography
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Action bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: '#1a4d2e' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: '#d4a843', fontSize: 13, fontWeight: 700 }}>oStaran Certificate</span>
          <span style={{ color: '#9cb89c', fontSize: 12, fontFamily: "'Courier New', monospace" }}>{cert.cert_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ color: '#9cb89c', border: '1px solid #2d6b42', background: 'transparent' }}
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: '#d4a843', color: '#1a1a1a', border: 'none', cursor: 'pointer' }}
          >
            ↓ Download / Print PDF
          </button>
        </div>
      </div>

      {/* Certificate canvas */}
      <div
        className="relative mt-12 overflow-auto max-h-[90vh] flex items-start justify-center"
        onClick={e => e.stopPropagation()}
        style={{ paddingTop: 16 }}
      >
        <div
          style={{
            width: 820,
            flexShrink: 0,
            background: 'linear-gradient(160deg, #faf8f2 0%, #f5f1e8 100%)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Double border */}
          <div style={{ position: 'absolute', inset: 14, border: '2px solid #1a4d2e', pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', inset: 22, border: '0.5px dashed #1a4d2e', pointerEvents: 'none', zIndex: 1 }} />

          {/* Gold corner ornaments */}
          {(['tl','tr','bl','br'] as const).map(c => (
            <div key={c} style={{
              position: 'absolute', width: 36, height: 36, zIndex: 2,
              top:    c.startsWith('t') ? 9  : undefined,
              bottom: c.startsWith('b') ? 9  : undefined,
              left:   c.endsWith('l')   ? 9  : undefined,
              right:  c.endsWith('r')   ? 9  : undefined,
              borderTop:    c.startsWith('t') ? '3px solid #d4a843' : 'none',
              borderBottom: c.startsWith('b') ? '3px solid #d4a843' : 'none',
              borderLeft:   c.endsWith('l')   ? '3px solid #d4a843' : 'none',
              borderRight:  c.endsWith('r')   ? '3px solid #d4a843' : 'none',
            }} />
          ))}

          {/* Dark green header band */}
          <div style={{
            background: '#1a4d2e',
            padding: '18px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            margin: '14px 14px 0',
          }}>
            {/* Logo mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="14" fill="white" opacity="0.08"/>
                <line x1="24" y1="10" x2="36" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="36" y1="20" x2="30" y2="36" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="30" y1="36" x2="12" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <line x1="12" y1="30" x2="24" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <circle cx="24" cy="10" r="3" fill="#e0e7ff"/>
                <circle cx="36" cy="20" r="2.5" fill="#c7d2fe"/>
                <circle cx="30" cy="36" r="3" fill="#e0e7ff"/>
                <circle cx="12" cy="30" r="2" fill="#c7d2fe"/>
                <circle cx="24" cy="23" r="2" fill="white" opacity="0.9"/>
              </svg>
              <span style={{ color: '#f5f1e8', fontWeight: 700, fontSize: 16 }}>oStaran</span>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', flex: 1, padding: '0 24px' }}>
              <div style={{ color: '#d4a843', fontSize: 10, letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                Star Analytix · AIwithArijit
              </div>
              <div style={{ color: '#f5f1e8', fontSize: 18, letterSpacing: 3, fontFamily: 'Georgia, serif', marginTop: 4 }}>
                {isFinal ? 'Certificate of Completion' : 'Certificate of Enrolment'}
              </div>
            </div>

            {/* Badge */}
            <div style={{
              border: '1px solid #d4a843', borderRadius: 7,
              padding: '8px 16px', textAlign: 'center', minWidth: 130,
            }}>
              {isFinal ? (
                <>
                  <div style={{ color: '#d4a843', fontSize: 15 }}>★ ★ ★ ★ ★</div>
                  <div style={{ color: '#f5f1e8', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>
                    COURSE GRADUATE
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: '#d4a843', fontSize: 22 }}>🎓</div>
                  <div style={{ color: '#f5f1e8', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>
                    ENROLLED STUDENT
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Certificate body */}
          <div style={{
            padding: '28px 52px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>

            {/* Ornament top */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
              <div style={{ width: 9, height: 9, background: '#d4a843', transform: 'rotate(45deg)' }} />
              <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
            </div>

            <p style={{ color: '#5a6e5a', fontSize: 14, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 10 }}>
              {isFinal ? 'This is to certify that' : 'This is to confirm that'}
            </p>

            {/* Student name — largest element */}
            <h1 style={{
              color: '#1a4d2e', fontSize: 38, fontWeight: 700,
              fontFamily: 'Georgia, serif', letterSpacing: 0.5,
              marginBottom: 6, textAlign: 'center', lineHeight: 1.1,
            }}>
              {enrolment.student_name}
            </h1>

            {/* Gold underline with diamond */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, width: '60%' }}>
              <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
              <div style={{ width: 8, height: 8, background: '#d4a843', transform: 'rotate(45deg)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
            </div>

            <p style={{ color: '#5a6e5a', fontSize: 13, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 12, textAlign: 'center' }}>
              {isFinal
                ? 'has successfully completed all requirements of the programme'
                : 'is currently enrolled in and actively participating in the programme'}
            </p>

            {/* Course name box */}
            <div style={{
              border: '1px solid rgba(26,77,46,0.25)', borderRadius: 5,
              background: 'rgba(26,77,46,0.06)',
              padding: '10px 40px', marginBottom: 14, textAlign: 'center',
            }}>
              <p style={{
                color: '#1a4d2e', fontSize: 18, fontWeight: 700,
                fontFamily: 'Inter, sans-serif', letterSpacing: 0.2,
              }}>
                {enrolment.course_name}
              </p>
            </div>

            {/* Issued date row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9cb89c', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {isFinal ? 'Completion Date' : 'Certificate Date'}
                </div>
                <div style={{ color: '#1a4d2e', fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 2 }}>
                  {issueDate}
                </div>
              </div>
              <div style={{ width: 7, height: 7, background: '#d4a843', transform: 'rotate(45deg)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9cb89c', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Platform</div>
                <div style={{ color: '#1a4d2e', fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 2 }}>
                  oStaran AI Education
                </div>
              </div>
              <div style={{ width: 7, height: 7, background: '#d4a843', transform: 'rotate(45deg)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9cb89c', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Trainer</div>
                <div style={{ color: '#1a4d2e', fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 2 }}>
                  Arijit Chowdhury
                </div>
              </div>
            </div>

            {/* Provisional notice — only for interim */}
            {!isFinal && (
              <div style={{
                background: '#fef3c7', border: '1px solid #fde68a',
                borderRadius: 8, padding: '10px 20px', marginBottom: 14,
                width: '100%', textAlign: 'center',
              }}>
                <p style={{ color: '#78350f', fontSize: 11, lineHeight: 1.6 }}>
                  ⚠️ <strong>Interim Provisional Certificate</strong> — confirms enrolment and active participation.
                  Does <strong>not</strong> certify completion. The Final Certificate will be issued upon programme completion.
                </p>
              </div>
            )}

            {/* Dashed divider */}
            <div style={{
              width: '100%', height: 1, marginBottom: 14,
              background: 'repeating-linear-gradient(90deg,rgba(26,77,46,0.4) 0,rgba(26,77,46,0.4) 4px,transparent 4px,transparent 8px)',
            }} />

            {/* Signature row */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>

              {/* Antara signature */}
              <div style={{ textAlign: 'center', minWidth: 160 }}>
                <svg width="140" height="28" viewBox="0 0 150 30" fill="none">
                  <path d="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14"
                    stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div style={{ width: 160, height: 1, background: '#1a4d2e', opacity: 0.6, margin: '2px auto 5px' }} />
                <div style={{ color: '#1a4d2e', fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 700 }}>Antara Chowdhury</div>
                <div style={{ color: '#5a6e5a', fontSize: 10, marginTop: 2 }}>Director, Star Analytix Pvt. Ltd.</div>
                <div style={{ color: '#9cb89c', fontSize: 9, marginTop: 1 }}>Mumbai, India</div>
              </div>

              {/* Centre cert ID block */}
              <div style={{ background: '#1a4d2e', borderRadius: 6, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ color: '#d4a843', fontSize: 8, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>
                  Certificate ID
                </div>
                <div style={{ color: '#fff', fontSize: 11, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1 }}>
                  {cert.cert_id}
                </div>
                <div style={{ width: '100%', height: 1, background: '#2d6b42', margin: '5px 0' }} />
                {/* QR code */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent('https://www.ostaran.com/certificate-verification')}&bgcolor=1a4d2e&color=d4a843&margin=2`}
                  alt="Verify"
                  width={72}
                  height={72}
                  style={{ display: 'block', margin: '4px auto', borderRadius: 3 }}
                />
                <div style={{ color: '#9cb89c', fontSize: 8, marginTop: 3 }}>Issued {issueDate}</div>
                <div style={{ color: '#6b9c6b', fontSize: 7, marginTop: 1, letterSpacing: 0.3 }}>
                  ostaran.com
                </div>
              </div>

              {/* Arijit signature */}
              <div style={{ textAlign: 'center', minWidth: 160 }}>
                <svg width="140" height="28" viewBox="0 0 150 30" fill="none">
                  <path d="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12"
                    stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div style={{ width: 160, height: 1, background: '#1a4d2e', opacity: 0.6, margin: '2px auto 5px' }} />
                <div style={{ color: '#1a4d2e', fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 700 }}>Arijit Chowdhury</div>
                <div style={{ color: '#5a6e5a', fontSize: 10, marginTop: 2 }}>Founder & Lead Trainer, oStaran</div>
                <div style={{ color: '#9cb89c', fontSize: 9, marginTop: 1 }}>AIwithArijit × oStaran Platform</div>
              </div>
            </div>

            {/* Ornament bottom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginTop: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
              <div style={{ width: 9, height: 9, background: '#d4a843', transform: 'rotate(45deg)' }} />
              <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
            </div>

            <p style={{ color: '#5a6e5a', fontSize: 10, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 8, textAlign: 'center' }}>
              Issued by Star Analytix Private Limited, Mumbai — Powered by oStaran AI Education Platform
            </p>
            <p style={{ color: '#9cb89c', fontSize: 8.5, letterSpacing: 1.5, marginTop: 2, textAlign: 'center', textTransform: 'uppercase' }}>
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
    activeCert?.cert_type === 'final_completion'
      ? 'final'
      : activeCert?.cert_type === 'interim_provisional'
      ? 'interim'
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
      if (!res.ok) {
        setClaimError(json.error ?? 'Failed to claim certificate')
        setClaimState('error')
        return
      }
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
        {/* Top colour bar */}
        <div className="h-1" style={{
          background: state === 'final'
            ? 'linear-gradient(90deg, #16a34a, #15803d)'
            : state === 'interim'
            ? 'linear-gradient(90deg, #b45309, #d97706)'
            : state === 'locked'
            ? '#e2e8f0'
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
              <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>
                {courseName}
              </p>
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

            {state === 'final' && activeCert && (
              <p className="text-xs mt-1" style={{ color: T.textSec }}>
                Completion certificate · {activeCert.cert_id}
              </p>
            )}
            {state === 'interim' && activeCert && (
              <p className="text-xs mt-1" style={{ color: T.textSec }}>
                Provisional cert · {activeCert.cert_id} · {fmt(activeCert.issued_at)}
              </p>
            )}
            {state === 'locked' && (
              <p className="text-xs mt-1" style={{ color: T.red }}>
                ₹{Math.round(enrolment.balanceDue).toLocaleString('en-IN')} balance outstanding
              </p>
            )}
            {state === 'claim' && (
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                Fully paid · Claim your interim provisional certificate now
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
              AIwithArijit × oStaran · Star Analytix Pvt. Ltd.
            </p>
          </div>
        </div>

        {/* Action footer */}
        <div className="px-6 pb-5 border-t flex items-center gap-2 flex-wrap"
          style={{ borderColor: T.borderLight }}>

          {/* FINAL */}
          {state === 'final' && (
            <>
              {activeCert?.certificate_url ? (
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
                <button
                  onClick={() => setViewing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #065f46)' }}
                >
                  <Award size={12} /> View Completion Certificate
                </button>
              )}
            </>
          )}

          {/* INTERIM */}
          {state === 'interim' && (
            <button
              onClick={() => setViewing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}
            >
              <FileText size={12} /> View Certificate
            </button>
          )}

          {/* CLAIM */}
          {state === 'claim' && (
            <>
              {claimState === 'idle' || claimState === 'error' ? (
                <button
                  onClick={handleClaim}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${T.blue}, #4f46e5)` }}
                >
                  <Award size={12} /> Claim Interim Certificate
                </button>
              ) : claimState === 'loading' ? (
                <button disabled
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white opacity-70"
                  style={{ background: `linear-gradient(135deg, ${T.blue}, #4f46e5)` }}>
                  <Loader2 size={12} className="animate-spin" /> Issuing...
                </button>
              ) : null}
              {claimState === 'error' && claimError && (
                <p className="text-xs flex items-center gap-1" style={{ color: T.red }}>
                  <AlertCircle size={11} /> {claimError}
                </p>
              )}
            </>
          )}

          {/* LOCKED */}
          {state === 'locked' && (
            <div className="flex items-center gap-2">
              <button disabled
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
                style={{ background: '#f1f5f9', color: T.textMuted, border: '1px solid #e2e8f0' }}
              >
                <Lock size={12} /> Certificate Locked
              </button>
              <p className="text-xs" style={{ color: T.textMuted }}>
                Pay your outstanding balance to unlock
              </p>
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
          <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>
            {cert.certificate_name}
          </p>
          {cert.date_of_issuing && (
            <p className="text-xs mt-1" style={{ color: T.textSec }}>
              Issued: {fmt(cert.date_of_issuing)}
            </p>
          )}
          <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
            Webinar Participation Certificate
          </p>
        </div>
      </div>
      {cert.certificate_image_link && (
        <div className="px-6 pb-5 flex items-center gap-2 border-t"
          style={{ borderColor: T.borderLight }}>
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
            ? `${totalCerts} certificate${totalCerts !== 1 ? 's' : ''} earned`
            : 'Your certificates will appear here'}
        </p>
      </div>

      {/* Course Certificates */}
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
            {enrolments.map(e => (
              <CompletionCertCard key={e.id} enrolment={e} />
            ))}
          </div>
        </div>
      )}

      {/* Webinar Participation Certificates */}
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
            {webinarCerts.map((c: any) => (
              <WebinarCertCard key={c.id} cert={c} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
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

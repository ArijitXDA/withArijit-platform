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
  purple: '#7c3aed', purpleBg: '#f5f3ff', purpleBorder: '#ddd6fe',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Interim Certificate Text Viewer ──────────────────────────────────────────
function InterimCertView({
  cert, enrolment, onClose,
}: {
  cert: { cert_id: string; issued_at: string }
  enrolment: { student_name: string; course_name: string }
  onClose: () => void
}) {
  const issueDate = fmt(cert.issued_at)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Certificate header */}
        <div className="px-8 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #0f1f3d, #1a3a6b)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
            <FileText size={28} className="text-white" />
          </div>
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#93c5fd' }}>
            INTERIM PROVISIONAL CERTIFICATE
          </p>
          <h2 className="text-xl font-extrabold text-white">
            AIwithArijit × oStaran
          </h2>
          <p className="text-xs mt-1" style={{ color: '#bfdbfe' }}>Star Analytix Pvt. Ltd.</p>
        </div>

        {/* Certificate body */}
        <div className="px-8 py-8">
          <p className="text-center text-sm mb-6" style={{ color: T.textSec }}>
            This is to confirm that
          </p>
          <p className="text-center text-2xl font-extrabold mb-6" style={{ color: T.navy }}>
            {enrolment.student_name}
          </p>
          <div className="rounded-xl p-5 mb-6 text-center"
            style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}` }}>
            <p className="text-sm leading-relaxed" style={{ color: '#92400e' }}>
              is currently <strong>enrolled in</strong> and actively participating in the programme
            </p>
            <p className="text-base font-bold mt-2" style={{ color: T.navy }}>
              {enrolment.course_name}
            </p>
          </div>
          <div className="rounded-xl p-4 mb-6"
            style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
            <p className="text-xs leading-relaxed text-center" style={{ color: '#78350f' }}>
              ⚠️ <strong>Note:</strong> This Interim Provisional Certificate confirms enrolment and active
              participation only. It does <strong>not</strong> certify completion of the programme.
              The Final Completion Certificate will be issued upon successful completion of all
              programme requirements.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs"
            style={{ color: T.textMuted }}>
            <span>Certificate ID: <strong style={{ color: T.navy }}>{cert.cert_id}</strong></span>
            <span>Issued: {issueDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between border-t gap-3"
          style={{ borderColor: T.borderLight }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ color: T.textSec, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${T.blue}, #4f46e5)` }}
          >
            <Download size={14} /> Print / Save PDF
          </button>
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
      setViewing(true) // auto-open the viewer
    } catch {
      setClaimError('Network error — please try again')
      setClaimState('error')
    }
  }

  const courseName = (enrolment.course as any)?.name ?? enrolment.course_name ?? 'AI Programme'

  return (
    <>
      {viewing && activeCert && (
        <InterimCertView
          cert={activeCert}
          enrolment={{ student_name: enrolment.student_name, course_name: courseName }}
          onClose={() => setViewing(false)}
        />
      )}

      <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: T.border }}>
        {/* Top colour bar by state */}
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
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={
              state === 'final'   ? { background: T.greenBg,  border: `1px solid ${T.greenBorder}` }
              : state === 'interim' ? { background: T.amberBg,  border: `1px solid ${T.amberBorder}` }
              : state === 'locked'  ? { background: '#f1f5f9',  border: '1px solid #e2e8f0' }
              : { background: T.blueLight, border: `1px solid ${T.bluePale}` }
            }>
            {state === 'locked'
              ? <Lock size={22} style={{ color: T.textMuted }} />
              : <Award size={22} style={{
                  color: state === 'final' ? T.green : state === 'interim' ? T.amber : T.blue
                }} />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-base leading-tight" style={{ color: T.textPrimary }}>
                {courseName}
              </p>
              {/* Status badge */}
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

            {/* State-specific sub-text */}
            {state === 'final' && activeCert && (
              <p className="text-xs mt-1" style={{ color: T.textSec }}>
                Final certificate issued · {activeCert.cert_id}
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

          {/* FINAL: view / download */}
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
                <p className="text-xs" style={{ color: T.textMuted }}>
                  Certificate file will be available here shortly.
                </p>
              )}
            </>
          )}

          {/* INTERIM: view in browser */}
          {state === 'interim' && (
            <button
              onClick={() => setViewing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}` }}
            >
              <FileText size={12} /> View Certificate
            </button>
          )}

          {/* CLAIM: button */}
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

          {/* LOCKED: greyed-out with message */}
          {state === 'locked' && (
            <div className="flex items-center gap-2">
              <button
                disabled
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
      <div className="h-1" style={{
        background: 'linear-gradient(90deg, #b45309, #d97706)',
      }} />
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

      {/* Header */}
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

      {/* ── Section 1: Course Certificates ─────────────────────────────────── */}
      {enrolments.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: T.navy }}>
            <div className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: T.blueLight, border: `1px solid ${T.bluePale}` }}>
              <Award size={11} style={{ color: T.blue }} />
            </div>
            Course Certificates
          </h2>

          {/* State legend */}
          <div className="rounded-xl p-3 mb-4 flex flex-wrap gap-3"
            style={{ background: '#f8faff', border: `1px solid ${T.borderLight}` }}>
            {[
              { color: T.blue, label: 'Claim — fully paid, ready to issue' },
              { color: T.amber, label: 'Provisional — enrolment confirmed' },
              { color: T.green, label: 'Certified — course completed' },
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

      {/* ── Section 2: Webinar Participation Certificates ───────────────────── */}
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

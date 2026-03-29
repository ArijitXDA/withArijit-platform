'use client'
import { useState } from 'react'

interface Cert {
  cert_id:          string
  full_name:        string
  course_name:      string
  webinar_date:     string | null
  duration_minutes: number | null
  rating:           number | null
  is_5_star:        boolean
  certificate_url:  string
  issued_at:        string
  is_valid:         boolean
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
function fmtDuration(mins: number | null): string {
  if (!mins) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function CertificateVerificationPage() {
  const [email,   setEmail]   = useState('')
  const [mobile,  setMobile]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [results, setResults] = useState<Cert[] | null>(null)

  async function handleVerify() {
    if (!email.trim() && !mobile.trim()) {
      setError('Please enter an email address or mobile number.')
      return
    }
    setLoading(true); setError(''); setResults(null)
    try {
      const res = await fetch('/api/certificate/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), mobile: mobile.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setResults(data.certificates)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f5f1e8', outline: 'none', fontFamily: 'Inter, sans-serif',
  } as React.CSSProperties

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1f14', fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>

      {/* Header */}
      <div style={{
        width: '100%', background: '#1a4d2e', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Inline oStaran logo mark */}
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
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
          <span style={{ color: '#f5f1e8', fontWeight: 700, fontSize: 15 }}>oStaran</span>
          <span style={{ color: '#9cb89c', fontSize: 12, marginLeft: 4 }}>Certificate Verification</span>
        </div>
        <a href="https://www.ostaran.com" style={{ color: '#9cb89c', fontSize: 12, textDecoration: 'none' }}>
          ostaran.com
        </a>
      </div>

      {/* Main card */}
      <div style={{ width: '100%', maxWidth: 560, padding: '48px 24px' }}>

        <h1 style={{
          color: '#f5f1e8', fontSize: 26, fontWeight: 700,
          fontFamily: 'Georgia, serif', marginBottom: 8,
        }}>
          Verify Certificate
        </h1>
        <p style={{ color: '#9cb89c', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Enter the student's email address or mobile number to verify the authenticity
          of their oStaran webinar participation certificate.
        </p>

        {/* Form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)', padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#9cb89c', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setResults(null) }}
              placeholder="student@example.com"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#5a6e5a', fontSize: 11 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#9cb89c', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Mobile Number
            </label>
            <input
              type="tel" value={mobile}
              onChange={e => { setMobile(e.target.value); setResults(null) }}
              placeholder="+91 98765 43210"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>

          {error && (
            <div style={{
              color: '#f87171', fontSize: 13, background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8,
              padding: '8px 12px', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleVerify} disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: loading ? 'rgba(212,168,67,0.5)' : '#d4a843',
              color: '#1a1a1a', fontSize: 14, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? 'Verifying…' : 'Verify Certificate →'}
          </button>
        </div>

        {/* Results */}
        {results !== null && (
          <div>
            {results.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 32,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <p style={{ color: '#9cb89c', fontSize: 14 }}>
                  No certificates found for this email or mobile number.
                </p>
                <p style={{ color: '#5a6e5a', fontSize: 12, marginTop: 8 }}>
                  The student may not have submitted a webinar feedback, or details may not match.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#9cb89c', fontSize: 12, marginBottom: 14 }}>
                  Found {results.length} certificate{results.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map(cert => (
                    <div key={cert.cert_id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: cert.is_valid
                        ? '1px solid rgba(34,197,94,0.25)'
                        : '1px solid rgba(248,113,113,0.2)',
                      borderRadius: 12, padding: 18,
                    }}>
                      {/* Status + 5 star badge row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: cert.is_valid ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                            color:      cert.is_valid ? '#4ade80'               : '#f87171',
                            border:     cert.is_valid ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(248,113,113,0.3)',
                          }}>
                            {cert.is_valid ? '✓ Valid Certificate' : '✗ Revoked'}
                          </span>
                          {cert.is_5_star && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                              background: 'rgba(212,168,67,0.12)', color: '#d4a843',
                              border: '1px solid rgba(212,168,67,0.3)',
                            }}>
                              ★ 5-Star Performer
                            </span>
                          )}
                        </div>
                        <span style={{
                          color: '#5a6e5a', fontSize: 10,
                          fontFamily: "'Courier New', monospace",
                        }}>
                          {cert.cert_id}
                        </span>
                      </div>

                      {/* Student + course */}
                      <p style={{ color: '#f5f1e8', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                        {cert.full_name}
                      </p>
                      <p style={{ color: '#d4a843', fontSize: 13, marginBottom: 10 }}>
                        {cert.course_name}
                      </p>

                      {/* Meta row */}
                      <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Date',     value: fmtDate(cert.webinar_date) },
                          { label: 'Duration', value: fmtDuration(cert.duration_minutes) },
                          { label: 'Rating',   value: `${cert.rating}/5 ${'★'.repeat(cert.rating ?? 0)}` },
                          { label: 'Issued',   value: fmtDate(cert.issued_at?.slice(0,10)) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ color: '#5a6e5a', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                            <div style={{ color: '#9cb89c', fontSize: 12, marginTop: 2 }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* View cert link */}
                      <a
                        href={`/certificate/${cert.cert_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block', padding: '7px 16px', borderRadius: 6,
                          background: '#1a4d2e', color: '#d4a843', fontSize: 12,
                          fontWeight: 600, textDecoration: 'none',
                          border: '1px solid rgba(212,168,67,0.4)',
                        }}>
                        View Certificate →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <p style={{
          color: '#2d4a35', fontSize: 11, textAlign: 'center',
          marginTop: 40, lineHeight: 1.6,
        }}>
          This verification service is provided by Star Analytix Private Limited, Mumbai.<br/>
          Certificates are issued to students who attend and rate oStaran AI webinars.
        </p>
      </div>
    </div>
  )
}

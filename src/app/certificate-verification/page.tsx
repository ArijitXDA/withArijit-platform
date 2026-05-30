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
  const [email,    setEmail]    = useState('')
  const [mobile5,  setMobile5]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [results,  setResults]  = useState<Cert[] | null>(null)

  async function handleVerify() {
    if (!email.trim() && !mobile5.trim()) {
      setError('Please enter an email address or the last 5 digits of mobile.')
      return
    }
    if (mobile5.trim() && !/^\d{5}$/.test(mobile5.trim())) {
      setError('Mobile suffix must be exactly 5 digits (e.g. 43210).')
      return
    }
    setLoading(true); setError(''); setResults(null)
    try {
      const res = await fetch('/api/certificate/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), mobile_last5: mobile5.trim() }),
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
          <span style={{ color: '#9cb89c', fontSize: 12, marginLeft: 4 }}>Get / Verify Certificate</span>
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
          Get / Verify Your Certificate
        </h1>
        <p style={{ color: '#9cb89c', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Enter your email or mobile number to find and download your oStaran webinar
          participation certificate — or to verify the authenticity of someone else's.
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
              Last 5 Digits of Mobile
            </label>
            <input
              type="tel" value={mobile5} maxLength={5}
              onChange={e => { setMobile5(e.target.value.replace(/\D/g,'')); setResults(null) }}
              placeholder="e.g. 43210"
              style={{ ...inp, letterSpacing: 6, fontSize: 18, fontFamily: "'Courier New', monospace" }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
            <p style={{ color: '#5a6e5a', fontSize: 11, marginTop: 5 }}>
              Enter only the last 5 digits — e.g. if mobile is 98765 43210, enter <strong style={{color:'#9cb89c'}}>43210</strong>
            </p>
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
              <div>
                {/* Not found guidance */}
                <div style={{
                  textAlign: 'center', padding: 28,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <p style={{ color: '#f5f1e8', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                    No certificate found
                  </p>
                  <p style={{ color: '#9cb89c', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                    The student may not have submitted webinar feedback yet, or the details may not match our records.
                  </p>

                  {/* Path A — attended but not rated */}
                  <div style={{
                    background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)',
                    borderRadius: 10, padding: '16px 20px', marginBottom: 12, textAlign: 'left',
                  }}>
                    <p style={{ color: '#d4a843', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      ✅ Already attended a webinar?
                    </p>
                    <p style={{ color: '#9cb89c', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                      Rate &amp; review the webinar now to unlock your AI Certificate. Certificates are issued
                      only after submitting your rating.
                    </p>
                    <a
                      href="https://webinar.ostaran.com/webinar_ratings"
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', padding: '8px 18px', borderRadius: 8,
                        background: '#d4a843', color: '#1a1a1a', fontSize: 12,
                        fontWeight: 700, textDecoration: 'none',
                      }}>
                      ⭐ Rate Your Webinar Now →
                    </a>
                  </div>

                  {/* Path B — not attended yet */}
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 10, padding: '16px 20px', textAlign: 'left',
                  }}>
                    <p style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      🆕 Not attended yet?
                    </p>
                    <p style={{ color: '#9cb89c', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                      Register for the upcoming masterclass → attend the 90-minute live session →
                      rate it → your AI Certificate will appear here, ready to download
                      and add to your resume &amp; LinkedIn profile.
                    </p>
                    <a
                      href="https://www.ostaran.com/masterclass"
                      style={{
                        display: 'inline-block', padding: '8px 18px', borderRadius: 8,
                        background: '#6366f1', color: '#fff', fontSize: 12,
                        fontWeight: 700, textDecoration: 'none',
                      }}>
                      Register for Next Session →
                    </a>
                  </div>
                </div>
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

        {/* Employer / Partner CTA — always visible */}
        <div style={{
          marginTop: 40,
          background: 'linear-gradient(135deg, rgba(26,77,46,0.6), rgba(13,31,20,0.8))',
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: 14, padding: '24px 24px',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>🏢</span>
            <div>
              <p style={{ color: '#f5f1e8', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                Are you an Employer or Educational Institution?
              </p>
              <p style={{ color: '#9cb89c', fontSize: 12, lineHeight: 1.7 }}>
                Register with us as an <strong style={{ color: '#d4a843' }}>AI Partner (AI University)</strong> now.
                We will upskill your employees and students with our AI webinars&nbsp;
                <strong style={{ color: '#4ade80' }}>absolutely free</strong> — no cost to your organisation.
                Help your team stay ahead in the AI era without spending a single rupee.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="https://partner.ostaran.com"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '9px 20px', borderRadius: 8,
                background: '#d4a843', color: '#1a1a1a', fontSize: 12,
                fontWeight: 700, textDecoration: 'none',
              }}>
              Register as AI Partner →
            </a>
            <a
              href="https://www.ostaran.com/contact?type=corporate"
              style={{
                display: 'inline-block', padding: '9px 20px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', color: '#9cb89c', fontSize: 12,
                fontWeight: 600, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
              Talk to Us First
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          color: '#2d4a35', fontSize: 11, textAlign: 'center',
          marginTop: 32, lineHeight: 1.6,
        }}>
          This verification service is provided by Star Analytix Private Limited, Mumbai.<br/>
          Certificates are issued to students who attend and rate oStaran AI webinars.
        </p>
      </div>
    </div>
  )
}

'use client'

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
  if (mins < 60) return `${mins} minutes`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} hr ${m} min` : `${h} hour${h > 1 ? 's' : ''}`
}

export default function CertificateClient({ cert }: { cert: Cert }) {
  const is5Star = cert.is_5_star === true

  return (
    <>
      {/* ── Action bar (hidden on print) ─────────────────────────────────── */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#1a4d2e', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#d4a843', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
            oStaran Certificate
          </div>
          <div style={{ color: '#9cb89c', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            {cert.cert_id}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/certificate-verification"
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12,
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              color: '#9cb89c', border: '1px solid #2d6b42',
              textDecoration: 'none',
            }}>
            Verify Another
          </a>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13,
              fontFamily: 'Inter, sans-serif', fontWeight: 700,
              background: '#d4a843', color: '#1a1a1a', border: 'none',
              cursor: 'pointer',
            }}
          >
            ↓ Download / Print PDF
          </button>
        </div>
      </div>

      {/* Spacer for fixed bar */}
      <div className="no-print" style={{ height: 60 }} />

      {/* ── Certificate wrapper ───────────────────────────────────────────── */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px 48px',
        background: '#e8e4d8',
      }}>
        <Certificate cert={cert} is5Star={is5Star} />
      </div>
    </>
  )
}

/* ── The certificate card ─────────────────────────────────────────────────── */
function Certificate({ cert, is5Star }: { cert: Cert; is5Star: boolean }) {
  return (
    <div className="cert-page" style={{
      width: '100%',
      maxWidth: 900,
      aspectRatio: '297 / 210',
      background: 'linear-gradient(160deg, #faf8f2 0%, #f5f1e8 100%)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    }}>

      {/* ── Outer border ─────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 14, border: '2px solid #1a4d2e', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 22, border: '0.5px dashed #1a4d2e', pointerEvents: 'none' }} />

      {/* ── Corner ornaments ─────────────────────────────────────────────── */}
      {(['topLeft','topRight','bottomLeft','bottomRight'] as const).map(corner => (
        <div key={corner} style={{
          position: 'absolute', width: 36, height: 36,
          top:    corner.startsWith('top')    ? 9  : undefined,
          bottom: corner.startsWith('bottom') ? 9  : undefined,
          left:   corner.endsWith('Left')     ? 9  : undefined,
          right:  corner.endsWith('Right')    ? 9  : undefined,
          borderTop:    corner.startsWith('top')    ? '2.5px solid #d4a843' : 'none',
          borderBottom: corner.startsWith('bottom') ? '2.5px solid #d4a843' : 'none',
          borderLeft:   corner.endsWith('Left')     ? '2.5px solid #d4a843' : 'none',
          borderRight:  corner.endsWith('Right')    ? '2.5px solid #d4a843' : 'none',
        }} />
      ))}

      {/* ── Header band ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14, height: 62,
        background: '#1a4d2e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 22px',
      }}>
        {/* oStaran logo (white version inline SVG) */}
        <svg width="140" height="28" viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="14" fill="white" opacity="0.08"/>
          <line x1="24" y1="10" x2="36" y2="20" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          <line x1="36" y1="20" x2="30" y2="36" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          <line x1="30" y1="36" x2="12" y2="30" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          <line x1="12" y1="30" x2="24" y2="10" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          <line x1="24" y1="10" x2="30" y2="36" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.25"/>
          <line x1="36" y1="20" x2="12" y2="30" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.25"/>
          <circle cx="24" cy="10" r="3.5" fill="#e0e7ff"/>
          <circle cx="36" cy="20" r="2.5" fill="#c7d2fe"/>
          <circle cx="30" cy="36" r="3"   fill="#e0e7ff"/>
          <circle cx="12" cy="30" r="2"   fill="#c7d2fe"/>
          <circle cx="24" cy="23" r="2"   fill="white" opacity="0.9"/>
          <text x="52" y="32" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.5" fill="#a5b4fc">o</text>
          <text x="66" y="32" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.5" fill="white">Staran</text>
        </svg>

        {/* Centre header text */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            color: '#d4a843', fontSize: 9, letterSpacing: 4,
            fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase',
          }}>
            Star Analytix · AIwithArijit
          </div>
          <div style={{
            color: '#f5f1e8', fontSize: 15, letterSpacing: 3,
            fontFamily: 'Georgia, serif', marginTop: 3,
          }}>
            Certificate of Participation
          </div>
        </div>

        {/* Rating badge — 5-star or normal */}
        {is5Star ? (
          <div style={{
            background: 'linear-gradient(135deg,#1f5e38,#1a4d2e)',
            border: '1px solid #d4a843', borderRadius: 6,
            padding: '5px 12px', textAlign: 'center', minWidth: 120,
          }}>
            <div style={{ color: '#d4a843', fontSize: 13, letterSpacing: 2 }}>★ ★ ★ ★ ★</div>
            <div style={{ color: '#f5f1e8', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>
              5-STAR PERFORMER
            </div>
            <div style={{ color: '#9cb89c', fontSize: 8, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>
              Rated 5/5 by Attendee
            </div>
          </div>
        ) : (
          <div style={{
            border: '1px solid rgba(212,168,67,0.4)',
            borderRadius: 6, padding: '5px 12px', textAlign: 'center', minWidth: 110,
          }}>
            <div style={{ color: '#d4a843', fontSize: 11 }}>
              {'★'.repeat(cert.rating ?? 0)}{'☆'.repeat(5 - (cert.rating ?? 0))}
            </div>
            <div style={{ color: '#9cb89c', fontSize: 8, fontFamily: 'Inter, sans-serif', letterSpacing: 0.5, marginTop: 3 }}>
              Rated {cert.rating}/5
            </div>
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 76, bottom: 14, left: 14, right: 14,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 48px',
      }}>

        {/* Top ornament */}
        <Ornament mb={14} />

        <p style={{ color: '#5a6e5a', fontSize: 12, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 10 }}>
          This is to certify that
        </p>

        {/* Student name */}
        <h1 style={{
          color: '#1a4d2e', fontSize: 34, fontWeight: 700,
          fontFamily: 'Georgia, serif', letterSpacing: 0.5,
          marginBottom: 6, textAlign: 'center',
        }}>
          {cert.full_name}
        </h1>

        {/* Name underline with diamond */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, width: '60%' }}>
          <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
          <div style={{ width: 7, height: 7, background: '#d4a843', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
        </div>

        <p style={{ color: '#5a6e5a', fontSize: 12, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 8 }}>
          attended and participated in the live AI webinar session
        </p>

        {/* Course name box */}
        <div style={{
          border: '0.8px solid #1a4d2e', borderRadius: 4,
          background: 'rgba(26,77,46,0.06)',
          padding: '8px 32px', marginBottom: 12, textAlign: 'center',
        }}>
          <p style={{ color: '#1a4d2e', fontSize: 15, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: 0.2 }}>
            {cert.course_name}
          </p>
        </div>

        {/* Date · Duration · Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          {[
            { label: 'Held on',  value: fmtDate(cert.webinar_date)      },
            { label: 'Duration', value: fmtDuration(cert.duration_minutes) },
            { label: 'Rating',   value: `★ ${cert.rating} / 5`         },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {i > 0 && <div style={{ width: 6, height: 6, background: '#d4a843', transform: 'rotate(45deg)', flexShrink: 0 }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9cb89c', fontSize: 9, fontFamily: 'Inter, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ color: '#1a4d2e', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 1 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dashed divider */}
        <div style={{
          width: '100%', height: 1, marginBottom: 14,
          background: 'repeating-linear-gradient(90deg,#1a4d2e 0,#1a4d2e 4px,transparent 4px,transparent 8px)',
          opacity: 0.3,
        }} />

        {/* Signatures row */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>

          {/* Left sig — Antara */}
          <SigBlock
            name="Antara Chowdhury"
            title="Director, Star Analytix Pvt. Ltd."
            sub="Mumbai, India"
            path="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14"
          />

          {/* Centre cert ID block */}
          <div style={{
            background: '#1a4d2e', borderRadius: 5,
            padding: '10px 18px', textAlign: 'center',
          }}>
            <div style={{ color: '#d4a843', fontSize: 7, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase' }}>Certificate ID</div>
            <div style={{ color: '#ffffff', fontSize: 12, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{cert.cert_id}</div>
            <div style={{ width: '80%', height: 1, background: '#2d6b42', margin: '5px auto' }} />
            <div style={{ color: '#9cb89c', fontSize: 8, fontFamily: 'Inter, sans-serif' }}>Issued {fmtDate(cert.issued_at?.slice(0,10))}</div>
            <div style={{ color: '#d4a843', fontSize: 7, fontFamily: 'Inter, sans-serif', marginTop: 2, letterSpacing: 0.3 }}>ostaran.com/certificate-verification</div>
          </div>

          {/* Right sig — Arijit */}
          <SigBlock
            name="Arijit Chowdhury"
            title="Founder & Lead Trainer, oStaran"
            sub="AIwithArijit × oStaran Platform"
            path="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12"
          />
        </div>

        {/* Bottom ornament */}
        <Ornament mt={12} />

        {/* Footer */}
        <p style={{ color: '#5a6e5a', fontSize: 8, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 6, textAlign: 'center' }}>
          Issued by Star Analytix Private Limited, Mumbai — Powered by oStaran AI Education Platform
        </p>
        <p style={{ color: '#9cb89c', fontSize: 7, fontFamily: 'Inter, sans-serif', letterSpacing: 1.5, marginTop: 2, textAlign: 'center', textTransform: 'uppercase' }}>
          Authenticity verifiable at ostaran.com/certificate-verification
        </p>
      </div>
    </div>
  )
}

/* ── Reusable subcomponents ──────────────────────────────────────────────── */

function Ornament({ mb, mt }: { mb?: number; mt?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: mb, marginTop: mt }}>
      <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.25 }} />
      <div style={{ width: 8, height: 8, background: '#d4a843', transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.25 }} />
    </div>
  )
}

function SigBlock({ name, title, sub, path }: { name: string; title: string; sub: string; path: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 160 }}>
      <svg width="140" height="28" viewBox="0 0 140 28" fill="none">
        <path d={path} stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
      <div style={{ width: 160, height: 1, background: '#1a4d2e', opacity: 0.6, margin: '2px auto 4px' }} />
      <div style={{ color: '#1a4d2e', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{name}</div>
      <div style={{ color: '#5a6e5a', fontSize: 9, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{title}</div>
      <div style={{ color: '#9cb89c', fontSize: 8, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>{sub}</div>
    </div>
  )
}

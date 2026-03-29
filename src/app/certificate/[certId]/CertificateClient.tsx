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
          <a href="/certificate-verification" style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12,
            fontFamily: 'Inter, sans-serif', fontWeight: 600,
            color: '#9cb89c', border: '1px solid #2d6b42', textDecoration: 'none',
          }}>
            Verify Another
          </a>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13,
              fontFamily: 'Inter, sans-serif', fontWeight: 700,
              background: '#d4a843', color: '#1a1a1a', border: 'none', cursor: 'pointer',
            }}
          >
            ↓ Download / Print PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ height: 60 }} />

      {/* ── Screen wrapper ───────────────────────────────────────────────── */}
      <div className="cert-screen-wrapper" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px 48px',
        background: '#e8e4d8',
      }}>
        <Certificate cert={cert} is5Star={is5Star} />
      </div>
    </>
  )
}

/* ── Certificate ─────────────────────────────────────────────────────────── */
function Certificate({ cert, is5Star }: { cert: Cert; is5Star: boolean }) {
  // Screen: 950×672px (297:210 ratio = 1.4143)
  // Print: zoom scales up to exactly 297mm×210mm at 96dpi (1122×794px)
  // zoom factor = 1122/950 = 1.181 — fonts stay correct, everything scales

  return (
    <div className="cert-page" style={{
      width:    950,
      height:   672,
      flexShrink: 0,
      background: 'linear-gradient(160deg, #faf8f2 0%, #f5f1e8 100%)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
    }}>

      {/* ── Borders ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 14, border: '2px solid #1a4d2e', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 22, border: '0.5px dashed #1a4d2e', pointerEvents: 'none' }} />

      {/* ── Corner ornaments ─────────────────────────────────────────────── */}
      {(['topLeft','topRight','bottomLeft','bottomRight'] as const).map(corner => (
        <div key={corner} style={{
          position: 'absolute', width: 40, height: 40,
          top:    corner.startsWith('top')    ? 9  : undefined,
          bottom: corner.startsWith('bottom') ? 9  : undefined,
          left:   corner.endsWith('Left')     ? 9  : undefined,
          right:  corner.endsWith('Right')    ? 9  : undefined,
          borderTop:    corner.startsWith('top')    ? '3px solid #d4a843' : 'none',
          borderBottom: corner.startsWith('bottom') ? '3px solid #d4a843' : 'none',
          borderLeft:   corner.endsWith('Left')     ? '3px solid #d4a843' : 'none',
          borderRight:  corner.endsWith('Right')    ? '3px solid #d4a843' : 'none',
        }} />
      ))}

      {/* ── Header band ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14, height: 68,
        background: '#1a4d2e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        {/* actual ostaran-logo-white.svg from /public */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ostaran-logo-white.svg"
          alt="oStaran"
          style={{ height: 30, width: 'auto', objectFit: 'contain' }}
        />

        {/* Centre: institution + title */}
        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          <div style={{
            color: '#d4a843', fontSize: 10, letterSpacing: 4,
            fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase',
          }}>
            Star Analytix · AIwithArijit
          </div>
          <div style={{
            color: '#f5f1e8', fontSize: 17, letterSpacing: 3,
            fontFamily: 'Georgia, serif', marginTop: 4,
          }}>
            Certificate of Participation
          </div>
        </div>

        {/* Rating badge */}
        {is5Star ? (
          <div style={{
            background: 'rgba(0,0,0,0.25)', border: '1px solid #d4a843',
            borderRadius: 7, padding: '6px 14px', textAlign: 'center', minWidth: 128,
          }}>
            <div style={{ color: '#d4a843', fontSize: 15, letterSpacing: 2 }}>★ ★ ★ ★ ★</div>
            <div style={{ color: '#f5f1e8', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>
              5-STAR PERFORMER
            </div>
            <div style={{ color: '#9cb89c', fontSize: 9, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>
              Rated 5/5 by Attendee
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(212,168,67,0.45)', borderRadius: 7, padding: '6px 14px', textAlign: 'center', minWidth: 110 }}>
            <div style={{ color: '#d4a843', fontSize: 13 }}>
              {'★'.repeat(cert.rating ?? 0)}{'☆'.repeat(5 - (cert.rating ?? 0))}
            </div>
            <div style={{ color: '#9cb89c', fontSize: 9, fontFamily: 'Inter, sans-serif', letterSpacing: 0.5, marginTop: 3 }}>
              Rated {cert.rating}/5
            </div>
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 82, bottom: 14, left: 14, right: 14,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 52px',
        gap: 0,
      }}>

        <Ornament mb={10} />

        <p style={{ color: '#5a6e5a', fontSize: 14, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 8 }}>
          This is to certify that
        </p>

        {/* Student name — largest, most prominent */}
        <h1 style={{
          color: '#1a4d2e', fontSize: 40, fontWeight: 700,
          fontFamily: 'Georgia, serif', letterSpacing: 0.5,
          marginBottom: 6, textAlign: 'center', lineHeight: 1.1,
        }}>
          {cert.full_name}
        </h1>

        {/* Name underline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, width: '56%' }}>
          <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
          <div style={{ width: 8, height: 8, background: '#d4a843', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 1, background: '#d4a843' }} />
        </div>

        <p style={{ color: '#5a6e5a', fontSize: 13, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginBottom: 8 }}>
          attended and participated in the live AI webinar session
        </p>

        {/* Course name box */}
        <div style={{
          border: '1px solid rgba(26,77,46,0.25)', borderRadius: 5,
          background: 'rgba(26,77,46,0.06)',
          padding: '9px 36px', marginBottom: 10, textAlign: 'center',
        }}>
          <p style={{ color: '#1a4d2e', fontSize: 17, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: 0.2 }}>
            {cert.course_name}
          </p>
        </div>

        {/* Date · Duration · Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 10 }}>
          {[
            { label: 'Held on',  value: fmtDate(cert.webinar_date)         },
            { label: 'Duration', value: fmtDuration(cert.duration_minutes) },
            { label: 'Rating',   value: `★ ${cert.rating} / 5`            },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={{ width: 7, height: 7, background: '#d4a843', transform: 'rotate(45deg)', flexShrink: 0, margin: '0 18px' }} />}
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9cb89c', fontSize: 10, fontFamily: 'Inter, sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ color: '#1a4d2e', fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 1 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dashed divider */}
        <div style={{
          width: '100%', height: 1, marginBottom: 10,
          background: 'repeating-linear-gradient(90deg,rgba(26,77,46,0.4) 0,rgba(26,77,46,0.4) 4px,transparent 4px,transparent 8px)',
        }} />

        {/* Signatures row */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>

          <SigBlock
            name="Antara Chowdhury"
            title="Director, Star Analytix Pvt. Ltd."
            sub="Mumbai, India"
            path="M10 20 C20 10, 32 24, 46 16 C54 11, 62 22, 74 18 C82 15, 90 22, 100 16 C108 11, 118 20, 130 14"
          />

          {/* Centre cert ID + QR block */}
          <div style={{ background: '#1a4d2e', borderRadius: 6, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ color: '#d4a843', fontSize: 8, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>Certificate ID</div>
            <div style={{ color: '#fff', fontSize: 12, fontFamily: "'Courier New', monospace", fontWeight: 700, letterSpacing: 1 }}>{cert.cert_id}</div>
            <div style={{ width: '100%', height: 1, background: '#2d6b42', margin: '5px 0' }} />
            {/* QR code pointing to the verification page */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://www.ostaran.com/certificate-verification')}&bgcolor=1a4d2e&color=d4a843&margin=2`}
              alt="Verify QR"
              width={80}
              height={80}
              style={{ display: 'block', margin: '4px auto', borderRadius: 4 }}
            />
            <div style={{ color: '#9cb89c', fontSize: 8, fontFamily: 'Inter, sans-serif', marginTop: 3 }}>Issued {fmtDate(cert.issued_at?.slice(0,10))}</div>
            <div style={{ color: '#6b9c6b', fontSize: 7.5, fontFamily: 'Inter, sans-serif', marginTop: 1, letterSpacing: 0.3 }}>
              ostaran.com/certificate-verification
            </div>
          </div>

          <SigBlock
            name="Arijit Chowdhury"
            title="Founder & Lead Trainer, oStaran"
            sub="AIwithArijit × oStaran Platform"
            path="M10 18 C22 8, 34 26, 50 14 C60 7, 70 22, 84 16 C94 12, 104 24, 118 14 C124 10, 132 18, 140 12"
          />
        </div>

        <Ornament mt={8} />

        {/* Footer */}
        <p style={{ color: '#5a6e5a', fontSize: 10, fontStyle: 'italic', fontFamily: 'Georgia, serif', marginTop: 4, textAlign: 'center' }}>
          Issued by Star Analytix Private Limited, Mumbai — Powered by oStaran AI Education Platform
        </p>
        <p style={{ color: '#9cb89c', fontSize: 8.5, fontFamily: 'Inter, sans-serif', letterSpacing: 1.5, marginTop: 2, textAlign: 'center', textTransform: 'uppercase' }}>
          Scan QR or visit ostaran.com/certificate-verification to verify authenticity
        </p>
      </div>
    </div>
  )
}

function Ornament({ mb, mt }: { mb?: number; mt?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: mb, marginTop: mt }}>
      <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
      <div style={{ width: 9, height: 9, background: '#d4a843', transform: 'rotate(45deg)' }} />
      <div style={{ flex: 1, height: 1, background: '#1a4d2e', opacity: 0.2 }} />
    </div>
  )
}

function SigBlock({ name, title, sub, path }: { name: string; title: string; sub: string; path: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 170 }}>
      <svg width="150" height="30" viewBox="0 0 150 30" fill="none">
        <path d={path} stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
      <div style={{ width: 170, height: 1, background: '#1a4d2e', opacity: 0.6, margin: '2px auto 5px' }} />
      <div style={{ color: '#1a4d2e', fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{name}</div>
      <div style={{ color: '#5a6e5a', fontSize: 10, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{title}</div>
      <div style={{ color: '#9cb89c', fontSize: 9, fontFamily: 'Inter, sans-serif', marginTop: 1 }}>{sub}</div>
    </div>
  )
}

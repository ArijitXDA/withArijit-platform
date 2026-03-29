export default function CertificateNotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ color: '#f5f1e8', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Certificate Not Found
        </h1>
        <p style={{ color: '#9cb89c', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          This certificate ID does not exist or has been revoked.
          If you believe this is an error, please contact us.
        </p>
        <a href="/certificate-verification" style={{
          display: 'inline-block', background: '#1a4d2e', color: '#d4a843',
          padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          textDecoration: 'none', border: '1px solid #d4a843',
        }}>
          Verify a Certificate
        </a>
      </div>
    </div>
  )
}

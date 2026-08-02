import Link from 'next/link'

export default function RateNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #eff6ff, #ffffff 40%)' }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl" style={{ border: '1px solid #dce6f5' }}>
        <div className="text-4xl mb-2">🔗</div>
        <h1 className="text-lg font-extrabold" style={{ color: '#0f1f3d' }}>This rating link isn’t valid</h1>
        <p className="text-sm mt-2 text-slate-600">
          The link may be incomplete or expired. If you attended our free AI webinar, please use the exact link we sent you on WhatsApp.
        </p>
        <Link href="https://webinar.ostaran.com" className="inline-block mt-5 text-sm font-bold" style={{ color: '#0ea5e9' }}>
          Explore oStaran webinars →
        </Link>
      </div>
    </div>
  )
}

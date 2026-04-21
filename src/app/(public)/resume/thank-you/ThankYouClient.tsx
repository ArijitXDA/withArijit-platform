'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// /resume/thank-you
// Shown immediately after successful form submission. Gives the user a moment
// of confirmation, then auto-redirects to /signup with the resume_token so the
// signup page can link the submission to the new auth.users row after OTP.
// ────────────────────────────────────────────────────────────────────────────

const AUTO_REDIRECT_SECONDS = 3

export default function ThankYouClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS)

  // Auto-redirect countdown
  useEffect(() => {
    if (!token) return
    if (countdown <= 0) {
      router.push(`/signup?resume_token=${encodeURIComponent(token)}`)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, token, router])

  if (!token) {
    // Missing token — user probably hit this page directly
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Page expired</h1>
        <p className="text-gray-600 mb-6">Looks like this thank-you page was opened without a valid submission. Start over to share your resume.</p>
        <Link
          href="/resume"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
        >
          Start over <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Got it — nicely done!</h1>
        <p className="text-gray-600 text-lg mb-8">
          Your resume is safely saved. One more step: sign up with your email so we can connect your submission to your oStaran dashboard.
        </p>

        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 mb-8 text-left">
          <h2 className="font-bold mb-3">What happens next</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>We redirect you to sign up (no password — just a 6-digit code to your email).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>While you sign up, our AI reads your resume and pre-fills your profile — so you skip the long forms.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>You land in your dashboard with tailored course recommendations and community access.</span>
            </li>
          </ol>
        </div>

        <Link
          href={`/signup?resume_token=${encodeURIComponent(token)}`}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
        >
          Continue to sign up <ArrowRight size={16} />
        </Link>

        <p className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-1.5">
          {countdown > 0 ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Auto-redirecting in {countdown}…
            </>
          ) : (
            'Redirecting…'
          )}
        </p>
      </div>
    </div>
  )
}

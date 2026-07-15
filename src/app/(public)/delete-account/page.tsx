import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legalInfo'

export const metadata: Metadata = {
  title: 'Delete your account — oStaran',
  description: 'How to request deletion of your oStaran (Star Analytix Pvt Ltd) account and associated data.',
}

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="max-w-2xl mx-auto px-5 py-14">
        <h1 className="text-3xl font-extrabold text-slate-900">Delete your oStaran account</h1>
        <p className="mt-3 text-slate-600">
          You can request deletion of your oStaran account — operated by {LEGAL.entityName} — and the
          personal data associated with it, at any time.
        </p>

        <h2 className="text-lg font-bold text-slate-900 mt-9">How to request deletion</h2>
        <ol className="mt-3 space-y-2 list-decimal list-inside text-slate-700">
          <li>
            Email{' '}
            <a href={`mailto:${LEGAL.grievanceEmail}?subject=Delete%20my%20account`} className="text-indigo-600 hover:underline font-medium">
              {LEGAL.grievanceEmail}
            </a>{' '}
            (or {LEGAL.supportEmail}) <strong>from your registered email address</strong>.
          </li>
          <li>Use the subject line <em>“Delete my account”</em>.</li>
          <li>We will {LEGAL.grievanceResponse}.</li>
        </ol>

        <h2 className="text-lg font-bold text-slate-900 mt-9">What is deleted</h2>
        <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-700">
          <li>Your account and sign-in credentials</li>
          <li>Your profile (name, email, phone) and notification device tokens</li>
          <li>Your dashboard data — enrolment access, saved preferences and in-app history</li>
        </ul>

        <h2 className="text-lg font-bold text-slate-900 mt-9">What we retain, and for how long</h2>
        <p className="mt-3 text-slate-700">
          Records we are legally required to keep — for example invoices and payment records under Indian
          tax and accounting law — are retained for the statutory retention period and then deleted. Full
          details are in our{' '}
          <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>.
        </p>

        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Questions about your data? Contact us at{' '}
          <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-indigo-600 hover:underline">{LEGAL.grievanceEmail}</a>
          {LEGAL.grievancePhone ? ` · ${LEGAL.grievancePhone}` : ''}.
        </div>
      </div>
    </main>
  )
}

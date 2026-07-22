export const metadata = { title: 'Thank you — Expert Consultation' }

export default function ConsultationThankYouPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-bold text-gray-900">Payment received</h1>
      <p className="text-gray-600 mt-3">
        Thank you — your Expert Consultation is confirmed. We&apos;ll email you shortly with a link to
        choose your session time and your Teams join link. If you don&apos;t see it within a few
        minutes, check your spam folder or contact{' '}
        <a href="mailto:ai@ostaran.com" className="text-indigo-600 font-semibold">
          ai@ostaran.com
        </a>
        .
      </p>
    </div>
  )
}

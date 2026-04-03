import Link from 'next/link'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'

export function CourseBottomCTA({
  course,
  enrolProps,
}: {
  course: any
  enrolProps: any
}) {
  return (
    <section
      className="py-20 px-4 text-white text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #1e1b4b 100%)' }}
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, #7c3aed 0%, transparent 70%)' }} />

      <div className="relative max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Enrolments Open · Batch Starting This Week
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">
          Transform Your Career in 26 Live Sessions
        </h2>
        <p className="text-indigo-200 text-lg mb-3 max-w-xl mx-auto leading-relaxed">
          AI Kit couriered. Two certificates. Real projects you own.
          Join thousands of learners who have already started their AI journey with Arijit.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 text-sm text-indigo-300">
          <span>🎁 AI Kit couriered</span>
          <span>·</span>
          <span>📜 Interim + Final Certificate</span>
          <span>·</span>
          <span>💳 50-50 payment plan</span>
          <span>·</span>
          <span>♾️ Lifetime access</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <PaymentModalTrigger
            {...enrolProps}
            label="🎓 Enrol Now — Lock Today's Price →"
            className="text-base px-8 py-4 font-bold"
          />
          <Link
            href="/group-enrol"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition-all"
          >
            👥 Group / Corporate Enrolment →
          </Link>
        </div>

        <p className="text-xs text-indigo-500 mt-6">
          🔒 Secured by Razorpay · GST Invoice Issued · Fee increases ~10% every month
        </p>
      </div>
    </section>
  )
}

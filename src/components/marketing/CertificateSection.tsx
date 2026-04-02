import Link from 'next/link'
import { Award, Download, ArrowRight } from 'lucide-react'

export function CertificateSection() {
  return (
    <section className="py-12 px-4 bg-white border-t border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-7 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">

          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">Already attended an oStaran Webinar?</p>
              <p className="text-gray-500 text-sm mt-0.5">
                View, verify and download your AI Certificate anytime.
              </p>
            </div>
          </div>

          {/* Right — CTA */}
          <Link
            href="/certificate-verification"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white whitespace-nowrap transition-all hover:opacity-90 hover:shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Download size={15} /> View &amp; Download Certificate
          </Link>
        </div>
      </div>
    </section>
  )
}

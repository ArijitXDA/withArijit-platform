import Link from 'next/link'
import Image from 'next/image'

const FOOTER_LINKS = {
  Learn: [
    { href: '/courses', label: 'Courses' },
    { href: '/ai-certification', label: 'AI Certification' },
    { href: '/masterclass', label: 'Masterclass' },
    { href: '/library', label: 'Resource Library' },
  ],
  Platform: [
    { href: '/ai-spots', label: 'AI Spots' },
    { href: '/find-ai-job', label: 'Find AI Jobs' },
    { href: '/build-ai-projects', label: 'Build AI Projects' },
    { href: '/become-a-partner', label: 'Become a Partner' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/free-webinar', label: 'Free Webinar' },
    { href: '/ai-readiness-quiz', label: 'AI Readiness Quiz' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/refund-policy', label: 'Refund Policy' },
    { href: '/shipping-policy', label: 'Shipping Policy' },
    { href: '/contact', label: 'Contact Us' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Top brand strip ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12 pb-10 border-b border-gray-800">

          {/* oStaran — primary brand (logo native on dark bg) */}
          <div className="space-y-3">
            <Link href="https://www.ostaran.com" target="_blank" rel="noopener noreferrer">
              <Image
                src="/ostaran-logo.png"
                alt="oStaran"
                width={180}
                height={60}
                className="h-12 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </Link>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              India&apos;s premier AI education platform. Enterprise-grade certification programmes
              for professionals, students, entrepreneurs &amp; leaders across India and the world.
            </p>
            <p className="text-xs text-gray-600">oStaran Edu Pvt Ltd · Mumbai, India</p>
          </div>

          {/* Trainer card — Arijit */}
          <div className="flex items-center gap-4 rounded-2xl border border-gray-800 px-5 py-4"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Image
              src="/arijit-image.png"
              alt="Arijit Chowdhury"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover object-top border-2 border-gray-700"
            />
            <div>
              <p className="text-white font-bold text-sm">Arijit Chowdhury</p>
              <p className="text-gray-500 text-xs mt-0.5">Founder · AI Educator · IIT Bombay</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Image src="/awa-logo.jpg" alt="AIwithArijit" width={80} height={21} className="h-5 w-auto rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Link columns ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-white font-semibold text-sm mb-4">{section}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/ostaran-logo.png"
              alt="oStaran"
              width={80}
              height={27}
              className="h-5 w-auto object-contain opacity-50"
            />
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} oStaran Edu Pvt Ltd. All rights reserved.
            </p>
          </div>
          <p className="text-xs text-gray-600">
            Made with ❤️ for AI learners across India &amp; the world
          </p>
        </div>

      </div>
    </footer>
  )
}
